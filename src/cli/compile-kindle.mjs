import fs from 'fs/promises'
import path from 'path'
import InterpreterUtils from '../interpreters/custom/InterpreterUtils.mjs'
import EngineRuntime from '../runtime/engine/EngineRuntime.mjs'
import {
  KINDLE_STRICT_PROFILE,
  analyzeKindleCompatibility,
  collectChoicesFromSection,
  collectNodes,
  resolveChoiceTargetSection,
  resolveSectionByRef,
  renderChoiceTextPlain
} from './kindle-profile.mjs'

const SIMPLIFIED_NOTE = 'Kindle edition simplified dynamic logic for compatibility.'

function escapeHtml (value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeWhitespace (value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim()
}

function sectionSlug (section, index) {
  if (section && typeof section.serial === 'number' && !Number.isNaN(section.serial)) {
    return `s-${String(section.serial).padStart(6, '0')}`
  }
  return `s-idx-${String(index + 1).padStart(6, '0')}`
}

function ensureLegacyHtml (html) {
  if (!html) return ''
  return String(html)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<(img|audio|video|source|picture)[^>]*>/gi, '')
    .replace(/\s+on[a-z]+="[^"]*"/gi, '')
    .replace(/\s+on[a-z]+='[^']*'/gi, '')
}

function extractStaticText (section) {
  const parts = []
  collectNodes(section && section.text ? section.text : [], (node) => {
    if (!node || node._class !== 'Token') return
    if (node.type === 'STRING') {
      parts.push(String(node.symbol))
      return
    }
    if (node.type === 'VARIABLE') {
      parts.push('${' + node.symbol + '}')
    }
  })
  return parts.join('\n\n').trim()
}

function renderSectionWithEngine (story, sectionSerial) {
  const engine = new EngineRuntime(null, { debug: false })
  try {
    const view = engine.start(story, { startAt: sectionSerial, resume: false, runOptions: {} })
    const sectionView = view && view.section ? view.section : null
    return {
      titleText: sectionView && sectionView.titleText ? sectionView.titleText : '',
      bodyHtml: sectionView && sectionView.bodyHtml ? sectionView.bodyHtml : ''
    }
  } finally {
    engine.destroy()
  }
}

function formatSectionPage ({ storyTitle, title, bodyHtml, choices, notes }) {
  const choiceMarkup = choices.length === 0
    ? '<p><em>No outgoing choices.</em></p>'
    : `<ul>\n${choices.map(choice => `  <li><a href="${choice.href}">${escapeHtml(choice.text)}</a></li>`).join('\n')}\n</ul>`

  const notesMarkup = notes.length > 0
    ? `<p><strong>Note:</strong> ${escapeHtml(SIMPLIFIED_NOTE)}</p>`
    : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} | ${escapeHtml(storyTitle)}</title>
</head>
<body>
  <h1>${escapeHtml(storyTitle)}</h1>
  <h2>${escapeHtml(title)}</h2>
  ${notesMarkup}
  ${bodyHtml}
  <h3>Choices</h3>
  ${choiceMarkup}
  <p><a href="../index.html">Back to start page</a></p>
</body>
</html>
`
}

function formatIndexPage ({ storyTitle, startHref, sectionCount }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(storyTitle)} | Kindle Edition</title>
</head>
<body>
  <h1>${escapeHtml(storyTitle)}</h1>
  <p>This Kindle edition is a static HTML export with compatibility simplifications.</p>
  <p>Sections: ${sectionCount}</p>
  <p><a href="${startHref}">Start reading</a></p>
</body>
</html>
`
}

async function compileKindle ({
  story,
  inputPath,
  outputDir,
  reportFile,
  profile
}) {
  const utils = new InterpreterUtils()
  const storyTitle = (story && story.settings && story.settings.name) || 'Story'

  const compatibility = analyzeKindleCompatibility(story, inputPath, profile)
  const strictErrors = compatibility.diagnostics.filter(d => d.severity === 'error')
  if (profile === KINDLE_STRICT_PROFILE && strictErrors.length > 0) {
    const first = strictErrors[0]
    throw new Error(`Kindle strict profile failed: ${first.code} ${first.message}`)
  }

  await fs.mkdir(outputDir, { recursive: true })
  const sectionsDir = path.resolve(outputDir, 'sections')
  await fs.rm(sectionsDir, { recursive: true, force: true })
  await fs.mkdir(sectionsDir, { recursive: true })

  const sections = Array.isArray(story.sections) ? story.sections.filter(Boolean) : []
  const sectionMetaBySerial = new Map()
  sections.forEach((section, index) => {
    sectionMetaBySerial.set(section.serial, {
      fileName: `${sectionSlug(section, index)}.html`
    })
  })

  const unresolvedTargets = []
  const fallbackRenders = []
  const writtenSections = []
  let totalEdges = 0

  for (let i = 0; i < sections.length; i += 1) {
    const section = sections[i]
    const serial = section.serial
    const cfg = section.settings || {}
    const sectionNotes = new Set((compatibility.sectionNotes[String(serial)] || compatibility.sectionNotes[serial] || []))

    let title = normalizeWhitespace(cfg.title || `Section ${serial}`)
    let bodyHtml = ''

    try {
      const rendered = renderSectionWithEngine(story, serial)
      if (rendered && normalizeWhitespace(rendered.titleText)) {
        title = normalizeWhitespace(rendered.titleText)
      }
      if (rendered && normalizeWhitespace(rendered.bodyHtml)) {
        bodyHtml = ensureLegacyHtml(rendered.bodyHtml)
      }
    } catch (error) {
      sectionNotes.add('Section text rendering used fallback due to runtime evaluation limits.')
      fallbackRenders.push({
        sectionSerial: serial,
        reason: error.message
      })
    }

    if (!normalizeWhitespace(bodyHtml)) {
      const rawText = extractStaticText(section)
      const source = normalizeWhitespace(rawText)
        ? rawText
        : '[No renderable section text in static mode.]'
      bodyHtml = ensureLegacyHtml(utils.formatText(source))
      sectionNotes.add('Section text rendering used static token fallback.')
    }

    const choiceLinks = []
    const choices = collectChoicesFromSection(section)
    choices.forEach(choice => {
      const targetSection = resolveChoiceTargetSection(story, choice)
      const linkText = renderChoiceTextPlain(choice)

      if (!targetSection) {
        unresolvedTargets.push({
          fromSectionSerial: serial,
          choiceTarget: choice ? choice.target : null,
          targetType: choice ? (choice.targetType || 'section') : 'section',
          choiceText: linkText
        })
        sectionNotes.add('At least one unresolved choice target was omitted.')
        return
      }

      const meta = sectionMetaBySerial.get(targetSection.serial)
      if (!meta) {
        unresolvedTargets.push({
          fromSectionSerial: serial,
          choiceTarget: choice ? choice.target : null,
          targetType: choice ? (choice.targetType || 'section') : 'section',
          choiceText: linkText
        })
        sectionNotes.add('At least one unresolved choice target was omitted.')
        return
      }

      totalEdges += 1
      choiceLinks.push({
        text: linkText,
        href: `../sections/${meta.fileName}`
      })
    })

    const sectionMeta = sectionMetaBySerial.get(serial)
    const outputPath = path.resolve(sectionsDir, sectionMeta.fileName)
    const noteList = Array.from(sectionNotes)
    const page = formatSectionPage({
      storyTitle,
      title,
      bodyHtml,
      choices: choiceLinks,
      notes: noteList
    })
    await fs.writeFile(outputPath, page, 'utf-8')

    writtenSections.push({
      serial,
      title,
      file: `sections/${sectionMeta.fileName}`,
      simplified: noteList.length > 0,
      notes: noteList,
      choiceCount: choiceLinks.length
    })
  }

  const startRef = story && story.settings ? story.settings.startAt : null
  const startSection = resolveSectionByRef(story, startRef) || sections[0] || null
  if (!startSection) throw new Error('No sections available to compile for Kindle output.')
  const startMeta = sectionMetaBySerial.get(startSection.serial)
  const indexHtml = formatIndexPage({
    storyTitle,
    startHref: `sections/${startMeta.fileName}`,
    sectionCount: sections.length
  })
  await fs.writeFile(path.resolve(outputDir, 'index.html'), indexHtml, 'utf-8')

  const reportPayload = {
    meta: {
      storyTitle,
      inputFile: inputPath,
      profile,
      sectionCount: sections.length,
      edgeCount: totalEdges,
      builtAt: new Date().toISOString()
    },
    droppedFeatureCounts: compatibility.droppedFeatureCounts,
    diagnostics: compatibility.diagnostics,
    unresolvedTargets,
    fallbackRenders,
    sections: writtenSections
  }

  const reportOut = reportFile || path.resolve(outputDir, 'kindle-report.json')
  await fs.writeFile(reportOut, JSON.stringify(reportPayload, null, 2) + '\n', 'utf-8')

  return {
    outputDir,
    reportFile: reportOut,
    sectionCount: sections.length,
    edgeCount: totalEdges,
    diagnostics: compatibility.diagnostics
  }
}

export default compileKindle
