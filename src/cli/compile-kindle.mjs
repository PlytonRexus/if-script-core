import fs from 'fs/promises'
import path from 'path'
import EngineRuntime from '../runtime/engine/EngineRuntime.mjs'
import {
  KINDLE_STRICT_PROFILE,
  analyzeKindleCompatibility
} from './kindle-profile.mjs'
import { packageKindleBundle } from './kindle-packager.mjs'

function escapeHtml (value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function storySlug (value) {
  return String(value == null ? 'story' : value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'story'
}

function hashString (text) {
  let hash = 5381
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash) + text.charCodeAt(i)
    hash = hash >>> 0
  }
  return hash.toString(16)
}

function sectionSlug (serial) {
  return `s-${String(serial).padStart(6, '0')}`
}

function stateFileName (stateHash) {
  return `v-${stateHash}.html`
}

function ensureLegacyHtml (html) {
  if (!html) return ''
  return String(html)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<(img|audio|video|source|picture|form|input|button|link|meta)[^>]*>/gi, '')
    .replace(/\s+on[a-z]+="[^"]*"/gi, '')
    .replace(/\s+on[a-z]+='[^']*'/gi, '')
    .replace(/\s+(class|style|title|data-[a-z0-9-]+|part|aria-[a-z0-9-]+)="[^"]*"/gi, '')
    .replace(/\s+(class|style|title|data-[a-z0-9-]+|part|aria-[a-z0-9-]+)='[^']*'/gi, '')
    .replace(/<\/?(html|body|head)[^>]*>/gi, '')
    .trim()
}

function buildDiagnostic (severity, code, message, file = null, hint = null) {
  return { severity, code, file, line: null, col: null, message, hint }
}

function normalizeSnapshot (snapshot, kindleConfig, inputPath) {
  const orderedValues = {}
  const dynamicVariables = Object.keys(snapshot.variables || {})
    .filter(name => name !== 'turn' && name !== 'functions' && !kindleConfig.state.variableNames.includes(name))
    .sort((left, right) => left.localeCompare(right))

  if (dynamicVariables.length > 0) {
    return {
      ok: false,
      diagnostics: dynamicVariables.map(name => buildDiagnostic(
        'error',
        'KINDLE_UNDECLARED_EXPORT_STATE',
        `Kindle traversal produced undeclared export-safe variable "${name}".`,
        inputPath,
        'Declare the variable in --kindle-config state.variables or remove the mutation.'
      ))
    }
  }

  for (const name of kindleConfig.state.variableNames) {
    const cfg = kindleConfig.state.variables[name]
    const value = Object.prototype.hasOwnProperty.call(snapshot.variables || {}, name)
      ? snapshot.variables[name]
      : cfg.default

    const matchesType = cfg.type === 'boolean'
      ? typeof value === 'boolean'
      : cfg.type === 'enum'
        ? typeof value === 'string'
        : typeof value === 'number' && Number.isFinite(value) && Math.trunc(value) === value

    if (!matchesType) {
      return {
        ok: false,
        diagnostics: [buildDiagnostic(
          'error',
          'KINDLE_UNSUPPORTED_STATE_TYPE',
          `Kindle variable "${name}" resolved to unsupported value ${JSON.stringify(value)}.`,
          inputPath,
          'Export-safe Kindle state must stay within the declared scalar domain.'
        )]
      }
    }

    const inDomain = cfg.values.some(entry => Object.is(entry, value))
    if (!inDomain) {
      return {
        ok: false,
        diagnostics: [buildDiagnostic(
          'error',
          'KINDLE_UNSUPPORTED_STATE_TYPE',
          `Kindle variable "${name}" resolved to out-of-domain value ${JSON.stringify(value)}.`,
          inputPath,
          'Add the value to the Kindle config domain or constrain story logic.'
        )]
      }
    }

    orderedValues[name] = value
  }

  const onceConsumed = Object.keys(snapshot.onceConsumed || {})
    .filter(key => snapshot.onceConsumed[key] === true)
    .sort((left, right) => left.localeCompare(right))

  const keyData = {
    sectionSerial: snapshot.sectionSerial,
    variables: orderedValues,
    onceConsumed
  }

  return {
    ok: true,
    key: JSON.stringify(keyData),
    stateHash: hashString(JSON.stringify(keyData)),
    data: keyData
  }
}

function createBaseSnapshot (story, kindleConfig) {
  const engine = new EngineRuntime(null, { debug: false })
  try {
    engine.start(story, {
      startAt: story?.settings?.startAt,
      initialVariables: kindleConfig.state.defaults,
      resume: false,
      runOptions: {},
      theme: 'literary-default',
      presentationMode: 'literary',
      allowUndo: false,
      showTurn: false,
      animations: false,
      autoSave: false
    })
    return engine.createSnapshot()
  } finally {
    engine.destroy()
  }
}

function hydrateEngine (story, snapshot, kindleConfig) {
  const engine = new EngineRuntime(null, { debug: false })
  engine.start(story, {
    startAt: snapshot.sectionSerial,
    initialVariables: kindleConfig.state.defaults,
    resume: false,
    runOptions: {},
    theme: 'literary-default',
    presentationMode: 'literary',
    allowUndo: false,
    showTurn: false,
    animations: false,
    autoSave: false
  })
  engine.loadSnapshot(snapshot)
  return engine
}

function buildSectionPage ({ storyTitle, title, bodyHtml, choices, notes, stateHash }) {
  const notesMarkup = notes.length > 0
    ? `<p><strong>Compatibility note:</strong> ${escapeHtml(notes.join(' '))}</p>`
    : ''

  const choiceRows = choices.length > 0
    ? `<ol>\n${choices.map(choice => {
        if (choice.disabled) return `  <li>${escapeHtml(choice.text)}</li>`
        return `  <li><a href="${choice.href}">${escapeHtml(choice.text)}</a></li>`
      }).join('\n')}\n</ol>`
    : '<p><em>No outgoing choices.</em></p>'

  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} | ${escapeHtml(storyTitle)}</title>
</head>
<body>
  <a id="state-${escapeHtml(stateHash)}"></a>
  <h1>${escapeHtml(storyTitle)}</h1>
  <h2>${escapeHtml(title)}</h2>
  ${notesMarkup}
  ${bodyHtml}
  <h3>Choices</h3>
  ${choiceRows}
  <p><a href="../../index.html">Back to start</a></p>
</body>
</html>
`
}

function buildIndexPage ({ storyTitle, startHref, stateCount, linkCount }) {
  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(storyTitle)} | Kindle Edition</title>
</head>
<body>
  <a id="start"></a>
  <h1>${escapeHtml(storyTitle)}</h1>
  <p>This Kindle edition is a static hyperlink export for legacy devices.</p>
  <p>States: ${stateCount}</p>
  <p>Links: ${linkCount}</p>
  <p><a href="${startHref}">Start reading</a></p>
  <p><a href="instructions.html">Instructions</a></p>
  <p><a href="credits.html">Credits</a></p>
</body>
</html>
`
}

function buildInstructionsPage (storyTitle) {
  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(storyTitle)} | Instructions</title>
</head>
<body>
  <a id="instructions"></a>
  <h1>Instructions</h1>
  <p>Use Kindle hyperlinks to move between pages. Unsupported runtime features such as timers, audio, and text input are removed from this edition.</p>
  <p><a href="index.html">Back</a></p>
</body>
</html>
`
}

function buildCreditsPage ({ storyTitle, inputPath, configPath }) {
  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(storyTitle)} | Credits</title>
</head>
<body>
  <a id="credits"></a>
  <h1>Credits</h1>
  <p>Compiled from ${escapeHtml(inputPath)}.</p>
  <p>Kindle config: ${escapeHtml(configPath)}.</p>
  <p><a href="index.html">Back</a></p>
</body>
</html>
`
}

function buildNcx ({ storyTitle }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${escapeHtml(storySlug(storyTitle))}" />
    <meta name="dtb:depth" content="1" />
    <meta name="dtb:totalPageCount" content="0" />
    <meta name="dtb:maxPageNumber" content="0" />
  </head>
  <docTitle><text>${escapeHtml(storyTitle)}</text></docTitle>
  <navMap>
    <navPoint id="nav-start" playOrder="1">
      <navLabel><text>Start</text></navLabel>
      <content src="index.html#start" />
    </navPoint>
    <navPoint id="nav-instructions" playOrder="2">
      <navLabel><text>Instructions</text></navLabel>
      <content src="instructions.html#instructions" />
    </navPoint>
    <navPoint id="nav-credits" playOrder="3">
      <navLabel><text>Credits</text></navLabel>
      <content src="credits.html#credits" />
    </navPoint>
  </navMap>
</ncx>
`
}

function buildOpf ({ storyTitle, manifestItems, spineItems }) {
  const manifestMarkup = manifestItems.map(item => `    <item id="${escapeHtml(item.id)}" href="${escapeHtml(item.href)}" media-type="${escapeHtml(item.mediaType)}"${item.properties ? ` properties="${escapeHtml(item.properties)}"` : ''} />`).join('\n')
  const spineMarkup = spineItems.map(item => `    <itemref idref="${escapeHtml(item)}" />`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeHtml(storyTitle)}</dc:title>
    <dc:language>en</dc:language>
    <dc:identifier id="bookid">${escapeHtml(storySlug(storyTitle))}</dc:identifier>
  </metadata>
  <manifest>
${manifestMarkup}
  </manifest>
  <spine toc="ncx">
${spineMarkup}
  </spine>
  <guide>
    <reference type="toc" title="Table of Contents" href="index.html" />
    <reference type="text" title="Start" href="index.html" />
  </guide>
</package>
`
}

async function validateBundle (outputDir, htmlFiles) {
  const issues = []
  const unsupportedPattern = /<(script|style|img|audio|video|source|picture|form|input|button)\b/i

  for (const relPath of htmlFiles) {
    const fullPath = path.resolve(outputDir, relPath)
    const content = await fs.readFile(fullPath, 'utf-8')
    if (unsupportedPattern.test(content)) {
      issues.push({ file: relPath, issue: 'unsupported_tag' })
    }
    const hrefMatches = Array.from(content.matchAll(/href="([^"]+)"/g))
    for (const match of hrefMatches) {
      const href = match[1]
      if (!href || href.startsWith('#') || /^[a-z]+:/i.test(href)) continue
      const targetPath = href.split('#')[0]
      const resolved = path.resolve(path.dirname(fullPath), targetPath)
      try {
        await fs.access(resolved)
      } catch {
        issues.push({ file: relPath, issue: 'missing_link_target', target: href })
      }
    }
  }

  return {
    ok: issues.length === 0,
    issues
  }
}

function sortVariantNodes (nodes) {
  return [...nodes].sort((left, right) => {
    if (left.stateHash !== right.stateHash) return left.stateHash.localeCompare(right.stateHash)
    return left.sectionSerial - right.sectionSerial
  })
}

async function compileKindle ({
  story,
  inputPath,
  outputDir,
  reportFile,
  profile,
  kindleConfig,
  packageMode = 'none',
  converter = 'auto',
  mobiOutputFile = null,
  dryRun = false
}) {
  const storyTitle = (story && story.settings && story.settings.name) || story?.name || 'Story'
  const compatibility = analyzeKindleCompatibility(story, inputPath, profile, { kindleConfig })
  const diagnostics = [...compatibility.diagnostics]
  const preflightErrors = diagnostics.filter(d => d.severity === 'error')
  if (preflightErrors.length > 0) {
    if (!dryRun) {
      const first = preflightErrors[0]
      throw new Error(`Kindle compile failed: ${first.code} ${first.message}`)
    }
    return {
      diagnostics,
      report: {
        meta: {
          storyTitle,
          inputFile: inputPath,
          profile,
          sectionCount: Array.isArray(story.sections) ? story.sections.length : 0,
          builtAt: new Date().toISOString()
        },
        droppedFeatureCounts: compatibility.droppedFeatureCounts,
        blockerCounts: compatibility.blockerCounts,
        stateCount: 0,
        linkCount: 0,
        states: [],
        hotspots: [],
        validation: { ok: false, issues: [] },
        packaging: { status: 'skipped', chosen: null, outputFile: null, attempted: [] }
      }
    }
  }

  const baseSnapshot = createBaseSnapshot(story, kindleConfig)
  const queue = [baseSnapshot]
  const startNormalized = normalizeSnapshot(baseSnapshot, kindleConfig, inputPath)
  if (!startNormalized.ok) {
    const first = startNormalized.diagnostics[0]
    throw new Error(`Kindle compile failed: ${first.code} ${first.message}`)
  }

  const stateMap = new Map()
  const stateOrder = []
  const edges = []
  const variantCountBySection = new Map()
  let linkCount = 0

  stateMap.set(startNormalized.key, {
    normalized: startNormalized,
    snapshot: baseSnapshot,
    sectionSerial: baseSnapshot.sectionSerial,
    stateHash: startNormalized.stateHash,
    file: `sections/${sectionSlug(baseSnapshot.sectionSerial)}/${stateFileName(startNormalized.stateHash)}`,
    rendered: null
  })
  stateOrder.push(startNormalized.key)

  while (queue.length > 0) {
    const currentSnapshot = queue.shift()
    const currentNormalized = normalizeSnapshot(currentSnapshot, kindleConfig, inputPath)
    if (!currentNormalized.ok) {
      diagnostics.push(...currentNormalized.diagnostics)
      break
    }

    const currentNode = stateMap.get(currentNormalized.key)
    const sectionNotes = new Set(
      compatibility.sectionNotes[String(currentSnapshot.sectionSerial)] ||
      compatibility.sectionNotes[currentSnapshot.sectionSerial] ||
      []
    )

    let engine = null
    try {
      engine = hydrateEngine(story, currentSnapshot, kindleConfig)
      const view = engine.getViewModel()
      const sectionView = view && view.section ? view.section : null
      const title = sectionView && sectionView.titleText ? sectionView.titleText : `Section ${currentSnapshot.sectionSerial}`
      const bodyHtml = ensureLegacyHtml(sectionView && sectionView.bodyHtml ? sectionView.bodyHtml : '<p>[No renderable section text in static mode.]</p>')
      const renderedChoices = []

      for (const choice of (sectionView?.choices || [])) {
        if (choice.disabled) {
          renderedChoices.push({ text: choice.text || 'Unavailable', disabled: true, href: null })
          continue
        }

        const edgeEngine = hydrateEngine(story, currentSnapshot, kindleConfig)
        const successorView = edgeEngine.selectChoice({ choiceIndex: choice.choiceIndex, inputValue: '' })
        const successorSnapshot = edgeEngine.createSnapshot()
        edgeEngine.destroy()

        if (!successorView || !successorSnapshot) {
          diagnostics.push(buildDiagnostic(
            'error',
            'KINDLE_UNSUPPORTED_STATE_TYPE',
            `Choice ${choice.choiceIndex} could not be flattened into a successor state.`,
            inputPath,
            'Simplify the choice logic for Kindle export.'
          ))
          continue
        }

        const successorNormalized = normalizeSnapshot(successorSnapshot, kindleConfig, inputPath)
        if (!successorNormalized.ok) {
          diagnostics.push(...successorNormalized.diagnostics)
          continue
        }

        let successorNode = stateMap.get(successorNormalized.key)
        if (!successorNode) {
          successorNode = {
            normalized: successorNormalized,
            snapshot: successorSnapshot,
            sectionSerial: successorSnapshot.sectionSerial,
            stateHash: successorNormalized.stateHash,
            file: `sections/${sectionSlug(successorSnapshot.sectionSerial)}/${stateFileName(successorNormalized.stateHash)}`,
            rendered: null
          }
          stateMap.set(successorNormalized.key, successorNode)
          stateOrder.push(successorNormalized.key)
          queue.push(successorSnapshot)

          if (stateMap.size > kindleConfig.limits.maxStates) {
            diagnostics.push(buildDiagnostic(
              'error',
              'KINDLE_STATE_LIMIT_EXCEEDED',
              `Kindle graph exceeded maxStates (${kindleConfig.limits.maxStates}).`,
              inputPath,
              'Reduce state combinations or tighten the Kindle config domain.'
            ))
            break
          }
        }

        linkCount += 1
        if (linkCount > kindleConfig.limits.maxLinks) {
          diagnostics.push(buildDiagnostic(
            'error',
            'KINDLE_LINK_LIMIT_EXCEEDED',
            `Kindle graph exceeded maxLinks (${kindleConfig.limits.maxLinks}).`,
            inputPath,
            'Reduce branching or merge Kindle states before export.'
          ))
          break
        }

        renderedChoices.push({
          text: choice.text || 'Continue',
          disabled: false,
          href: path.relative(path.dirname(path.resolve(outputDir || '.', currentNode.file)), path.resolve(outputDir || '.', successorNode.file)).replaceAll(path.sep, '/')
        })
        edges.push({
          from: currentNode.file,
          to: successorNode.file,
          choiceIndex: choice.choiceIndex,
          text: choice.text || 'Continue'
        })
      }

      currentNode.rendered = {
        title,
        bodyHtml,
        choices: renderedChoices,
        notes: Array.from(sectionNotes)
      }
      variantCountBySection.set(
        currentSnapshot.sectionSerial,
        (variantCountBySection.get(currentSnapshot.sectionSerial) || 0) + 1
      )
    } finally {
      if (engine) engine.destroy()
    }

    if (diagnostics.some(d => d.severity === 'error' && (d.code === 'KINDLE_STATE_LIMIT_EXCEEDED' || d.code === 'KINDLE_LINK_LIMIT_EXCEEDED'))) {
      break
    }
  }

  if (stateMap.size >= kindleConfig.limits.warnStates) {
    diagnostics.push(buildDiagnostic(
      'warning',
      'KINDLE_STATE_LIMIT_WARNING',
      `Kindle graph reached ${stateMap.size} states (warnStates ${kindleConfig.limits.warnStates}).`,
      inputPath
    ))
  }
  if (linkCount >= kindleConfig.limits.warnLinks) {
    diagnostics.push(buildDiagnostic(
      'warning',
      'KINDLE_LINK_LIMIT_WARNING',
      `Kindle graph reached ${linkCount} links (warnLinks ${kindleConfig.limits.warnLinks}).`,
      inputPath
    ))
  }

  const fatalErrors = diagnostics.filter(d => d.severity === 'error')
  const sortedNodes = sortVariantNodes(Array.from(stateMap.values()))
  const hotspots = Array.from(variantCountBySection.entries())
    .map(([sectionSerial, variants]) => ({ sectionSerial, variants }))
    .sort((left, right) => right.variants - left.variants || left.sectionSerial - right.sectionSerial)

  const report = {
    meta: {
      storyTitle,
      inputFile: inputPath,
      profile,
      sectionCount: Array.isArray(story.sections) ? story.sections.length : 0,
      builtAt: new Date().toISOString()
    },
    droppedFeatureCounts: compatibility.droppedFeatureCounts,
    blockerCounts: compatibility.blockerCounts,
    diagnostics,
    stateCount: stateMap.size,
    linkCount,
    hotspots,
    states: sortedNodes.map(node => ({
      sectionSerial: node.sectionSerial,
      stateHash: node.stateHash,
      file: node.file,
      title: node.rendered ? node.rendered.title : `Section ${node.sectionSerial}`,
      noteCount: node.rendered ? node.rendered.notes.length : 0,
      choiceCount: node.rendered ? node.rendered.choices.filter(choice => !choice.disabled).length : 0
    })),
    validation: { ok: false, issues: [] },
    packaging: { status: 'skipped', chosen: null, outputFile: null, attempted: [] }
  }

  if (dryRun) return { diagnostics, report }

  await fs.mkdir(outputDir, { recursive: true })
  const htmlFiles = ['index.html', 'instructions.html', 'credits.html']

  for (const node of sortedNodes) {
    const fullPath = path.resolve(outputDir, node.file)
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    await fs.writeFile(fullPath, buildSectionPage({
      storyTitle,
      title: node.rendered ? node.rendered.title : `Section ${node.sectionSerial}`,
      bodyHtml: node.rendered ? node.rendered.bodyHtml : '<p>[No renderable section text in static mode.]</p>',
      choices: node.rendered ? node.rendered.choices : [],
      notes: node.rendered ? node.rendered.notes : [],
      stateHash: node.stateHash
    }), 'utf-8')
    htmlFiles.push(node.file)
  }

  const startNode = stateMap.get(startNormalized.key)
  await fs.writeFile(path.resolve(outputDir, 'index.html'), buildIndexPage({
    storyTitle,
    startHref: startNode.file,
    stateCount: stateMap.size,
    linkCount
  }), 'utf-8')
  await fs.writeFile(path.resolve(outputDir, 'instructions.html'), buildInstructionsPage(storyTitle), 'utf-8')
  await fs.writeFile(path.resolve(outputDir, 'credits.html'), buildCreditsPage({
    storyTitle,
    inputPath,
    configPath: kindleConfig.path
  }), 'utf-8')

  const manifestItems = [
    { id: 'ncx', href: 'toc.ncx', mediaType: 'application/x-dtbncx+xml' },
    { id: 'index', href: 'index.html', mediaType: 'application/xhtml+xml' },
    { id: 'instructions', href: 'instructions.html', mediaType: 'application/xhtml+xml' },
    { id: 'credits', href: 'credits.html', mediaType: 'application/xhtml+xml' },
    ...sortedNodes.map(node => ({
      id: `state-${node.stateHash}`,
      href: node.file.replaceAll(path.sep, '/'),
      mediaType: 'application/xhtml+xml'
    }))
  ]
  const spineItems = ['index', 'instructions', 'credits', ...sortedNodes.map(node => `state-${node.stateHash}`)]

  const ncxPath = path.resolve(outputDir, 'toc.ncx')
  const opfPath = path.resolve(outputDir, 'content.opf')
  await fs.writeFile(ncxPath, buildNcx({ storyTitle }), 'utf-8')
  await fs.writeFile(opfPath, buildOpf({ storyTitle, manifestItems, spineItems }), 'utf-8')

  const validation = await validateBundle(outputDir, htmlFiles)
  report.validation = validation
  if (!validation.ok) {
    diagnostics.push(buildDiagnostic(
      'error',
      'KINDLE_CONVERTER_VALIDATION_FAILED',
      'Generated Kindle HTML bundle failed validation.',
      inputPath,
      'Fix missing link targets or unsupported tags before packaging.'
    ))
  }

  const effectiveMobiOutput = mobiOutputFile || path.resolve(outputDir, `${storySlug(storyTitle)}.mobi`)
  if (packageMode === 'mobi') {
    report.packaging = await packageKindleBundle({
      outputDir,
      opfPath,
      mobiOutputFile: effectiveMobiOutput,
      converter,
      converterOrder: kindleConfig.packaging.converterOrder
    })

    if (report.packaging.status === 'unavailable') {
      diagnostics.push(buildDiagnostic(
        'error',
        'KINDLE_CONVERTER_UNAVAILABLE',
        'No configured Kindle converter was available.',
        inputPath,
        'Install a converter or choose --converter none.'
      ))
    } else if (report.packaging.status === 'failed') {
      const attempted = report.packaging.attempted.find(entry => entry.converter === report.packaging.chosen)
      diagnostics.push(buildDiagnostic(
        'error',
        attempted?.errorCode || 'KINDLE_CONVERTER_VALIDATION_FAILED',
        attempted?.detail || 'Kindle packaging failed.',
        inputPath
      ))
    }
  }

  const reportOut = reportFile || path.resolve(outputDir, 'kindle-report.json')
  await fs.writeFile(reportOut, JSON.stringify(report, null, 2) + '\n', 'utf-8')

  const finalErrors = diagnostics.filter(d => d.severity === 'error')
  if (profile === KINDLE_STRICT_PROFILE && finalErrors.length > 0) {
    const first = finalErrors[0]
    throw new Error(`Kindle strict profile failed: ${first.code} ${first.message}`)
  }
  if (finalErrors.length > 0) {
    const first = finalErrors[0]
    throw new Error(`Kindle compile failed: ${first.code} ${first.message}`)
  }

  return {
    outputDir,
    reportFile: reportOut,
    opfFile: opfPath,
    ncxFile: ncxPath,
    stateCount: stateMap.size,
    edgeCount: linkCount,
    diagnostics
  }
}

export default compileKindle
