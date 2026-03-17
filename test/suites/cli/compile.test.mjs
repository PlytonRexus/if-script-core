import { mkdir, readFile, rm, unlink, writeFile } from 'fs/promises'
import path from 'path'
import { spawnSync } from 'child_process'
import { fileURLToPath, pathToFileURL } from 'url'
import compile from '../../../src/cli/compile.mjs'
import { buildCandidates } from '../../../src/cli/kindle-packager.mjs'
import {
  assert,
  assertEqual,
  runTestSuite
} from '../../support/test-utils.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../../..')
const cliEntry = path.join(repoRoot, 'bin/index.mjs')

function uniqueId () {
  return `${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

async function withTempStoryConfigAndOutDir ({ story, config }, fn) {
  const id = uniqueId()
  const storyPath = path.join(repoRoot, `tmp-compile-${id}.if`)
  const configPath = path.join(repoRoot, `tmp-kindle-config-${id}.json`)
  const outDir = path.join(repoRoot, `tmp-kindle-out-${id}`)
  await writeFile(storyPath, story, 'utf-8')
  await writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8')
  await mkdir(outDir, { recursive: true })
  try {
    return await fn({ storyPath, configPath, outDir })
  } finally {
    await unlink(storyPath).catch(() => {})
    await unlink(configPath).catch(() => {})
    await rm(outDir, { recursive: true, force: true }).catch(() => {})
  }
}

function makeConfig (variables = {}, limits = {}) {
  return {
    version: 1,
    layout: 'per-section-variant-files',
    state: { variables },
    limits: {
      maxStates: 8000,
      warnStates: 4000,
      maxLinks: 30000,
      warnLinks: 20000,
      ...limits
    },
    packaging: {
      converterOrder: ['kindlepreviewer', 'calibre', 'html-to-mobi', 'mobi-zipper']
    }
  }
}

function parseCompileArgs (args) {
  const parsed = {
    i: null,
    'input-file': null,
    o: null,
    'output-file': null,
    target: 'json',
    profile: 'default',
    'output-dir': null,
    'report-file': null,
    'kindle-config': null,
    package: 'none',
    converter: 'auto',
    'mobi-output-file': null
  }
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '-i' || arg === '--input-file') {
      parsed.i = args[i + 1]
      parsed['input-file'] = args[i + 1]
      i += 1
      continue
    }
    if (arg === '-o' || arg === '--output-file') {
      parsed.o = args[i + 1]
      parsed['output-file'] = args[i + 1]
      i += 1
      continue
    }
    if (arg === '--target') {
      parsed.target = args[i + 1]
      i += 1
      continue
    }
    if (arg === '--profile') {
      parsed.profile = args[i + 1]
      i += 1
      continue
    }
    if (arg === '--output-dir') {
      parsed['output-dir'] = args[i + 1]
      i += 1
      continue
    }
    if (arg === '--report-file') {
      parsed['report-file'] = args[i + 1]
      i += 1
      continue
    }
    if (arg === '--kindle-config') {
      parsed['kindle-config'] = args[i + 1]
      i += 1
      continue
    }
    if (arg === '--package') {
      parsed.package = args[i + 1]
      i += 1
      continue
    }
    if (arg === '--converter') {
      parsed.converter = args[i + 1]
      i += 1
      continue
    }
    if (arg === '--mobi-output-file') {
      parsed['mobi-output-file'] = args[i + 1]
      i += 1
    }
  }
  return parsed
}

async function runCompileInProcess (args) {
  const chunks = []
  const errors = []
  const originalWrite = process.stdout.write.bind(process.stdout)

  process.stdout.write = (chunk, encoding, cb) => {
    if (typeof chunk === 'string') {
      chunks.push(chunk)
    } else if (chunk !== undefined && chunk !== null) {
      const enc = typeof encoding === 'string' ? encoding : 'utf-8'
      chunks.push(Buffer.from(chunk).toString(enc))
    }
    if (typeof encoding === 'function') encoding()
    if (typeof cb === 'function') cb()
    return true
  }

  try {
    await compile(parseCompileArgs(args))
    return {
      status: 0,
      signal: null,
      error: null,
      stdout: chunks.join(''),
      stderr: ''
    }
  } catch (error) {
    errors.push(error.message)
    return {
      status: 1,
      signal: null,
      error,
      stdout: chunks.join(''),
      stderr: errors.join('\n')
    }
  } finally {
    process.stdout.write = originalWrite
  }
}

async function runCompile (args) {
  const result = spawnSync(process.execPath, [cliEntry, 'compile', ...args], {
    cwd: repoRoot,
    encoding: 'utf-8'
  })

  if (result && result.error && (result.error.code === 'EPERM' || result.error.code === 'EACCES')) {
    return runCompileInProcess(args)
  }

  return result
}

async function testKindleCompileRequiresOutputDir () {
  const story = `section__
  @title "Start"
  "Hello"
__section`

  await withTempStoryConfigAndOutDir({
    story,
    config: makeConfig()
  }, async ({ storyPath, configPath }) => {
    const result = await runCompile(['-i', storyPath, '--target', 'kindle-html', '--kindle-config', configPath])
    assertEqual(result.status, 1, 'kindle compile should fail without output dir')
  })
}

async function testKindleCompileRequiresConfig () {
  const story = `section__
  @title "Start"
  "Hello"
__section`

  await withTempStoryConfigAndOutDir({
    story,
    config: makeConfig()
  }, async ({ storyPath, outDir }) => {
    const result = await runCompile(['-i', storyPath, '--target', 'kindle-html', '--output-dir', outDir])
    assertEqual(result.status, 1, 'kindle compile should fail without kindle config')
  })
}

async function testInvalidTargetFails () {
  const story = `section__
  @title "Start"
  "Hello"
__section`

  await withTempStoryConfigAndOutDir({
    story,
    config: makeConfig()
  }, async ({ storyPath, outDir }) => {
    const result = await runCompile(['-i', storyPath, '--target', 'bogus', '--output-dir', outDir])
    assertEqual(result.status, 1, 'invalid target should fail')
  })
}

async function testKindleAnyCompilesVariantArtifacts () {
  const story = `scene__
  @name "Arc"
  @first "Arc Entry"
__scene

section__
  @title "Start"
  "Flag state: ${'${flag}'}"
  choice__
    @targetType "scene"
    @target "Arc"
    @when flag == false
    @action flag = true
    "Raise the flag"
  __choice
  choice__
    @target "End"
    @when flag == true
    "Finish"
  __choice
__section

section__
  @title "Arc Entry"
  "Arc text"
  choice__
    @target "Start"
    "Back to start"
  __choice
__section

section__
  @title "End"
  "Done"
__section`

  const config = makeConfig({
    flag: { type: 'boolean', values: [false, true], default: false }
  })

  await withTempStoryConfigAndOutDir({ story, config }, async ({ storyPath, configPath, outDir }) => {
    const result = await runCompile([
      '-i',
      storyPath,
      '--target',
      'kindle-html',
      '--profile',
      'kindle-any',
      '--kindle-config',
      configPath,
      '--output-dir',
      outDir
    ])
    assertEqual(result.status, 0, 'kindle-any compile should succeed')

    const report = JSON.parse(await readFile(path.join(outDir, 'kindle-report.json'), 'utf-8'))
    assert(report.stateCount >= 4, 'report should include multiple state variants')
    assert(Array.isArray(report.states), 'report should include state list')
    const startStates = report.states.filter(state => state.title === 'Start')
    assert(startStates.length >= 2, 'start section should emit at least two variant files')

    const opf = await readFile(path.join(outDir, 'content.opf'), 'utf-8')
    const ncx = await readFile(path.join(outDir, 'toc.ncx'), 'utf-8')
    assert(opf.includes('<spine'), 'opf should include spine')
    assert(ncx.includes('<navMap>'), 'ncx should include nav map')

    const firstState = startStates[0]
    const page = await readFile(path.join(outDir, firstState.file.replaceAll('/', path.sep)), 'utf-8')
    assert(page.includes('<a id="state-'), 'variant page should expose root anchor')
  })
}

async function testKindleSupportsOnceChoicesInStateGraph () {
  const story = `section__
  @title "Start"
  choice__
    @target "Start"
    @once true
    "Use once"
  __choice
  choice__
    @target "End"
    "Exit"
  __choice
__section

section__
  @title "End"
  "Done"
__section`

  await withTempStoryConfigAndOutDir({
    story,
    config: makeConfig()
  }, async ({ storyPath, configPath, outDir }) => {
    const result = await runCompile([
      '-i', storyPath,
      '--target', 'kindle-html',
      '--profile', 'kindle-any',
      '--kindle-config', configPath,
      '--output-dir', outDir
    ])
    assertEqual(result.status, 0, 'once choice story should compile')

    const report = JSON.parse(await readFile(path.join(outDir, 'kindle-report.json'), 'utf-8'))
    const startStates = report.states.filter(state => state.sectionSerial === 1)
    assert(startStates.length >= 2, 'once choice should create distinct start states')
  })
}

async function testKindleRejectsInputChoices () {
  const story = `section__
  @title "Start"
  choice__
    @target "End"
    @input name
    "Name yourself [[input]]"
  __choice
__section

section__
  @title "End"
  "Done"
__section`

  await withTempStoryConfigAndOutDir({
    story,
    config: makeConfig({
      name: { type: 'enum', values: ['A'], default: 'A' }
    })
  }, async ({ storyPath, configPath, outDir }) => {
    const result = await runCompile([
      '-i', storyPath,
      '--target', 'kindle-html',
      '--profile', 'kindle-any',
      '--kindle-config', configPath,
      '--output-dir', outDir
    ])
    assertEqual(result.status, 1, 'input choices should fail kindle compile')
  })
}

async function testKindleStrictFailsOnDroppedFeatures () {
  const story = `settings__
  @fullTimer 30 "End"
__settings

section__
  @title "Start"
  @timer 10 "End"
  choice__
    @target "End"
    "Continue"
  __choice
__section

section__
  @title "End"
  "Done"
__section`

  await withTempStoryConfigAndOutDir({
    story,
    config: makeConfig()
  }, async ({ storyPath, configPath, outDir }) => {
    const result = await runCompile([
      '-i', storyPath,
      '--target', 'kindle-html',
      '--profile', 'kindle-strict',
      '--kindle-config', configPath,
      '--output-dir', outDir
    ])
    assertEqual(result.status, 1, 'kindle-strict should fail on dropped features')
  })
}

async function testConverterAutoOrderIncludesFallbackNone () {
  const candidates = buildCandidates('auto', ['calibre', 'html-to-mobi'])
  assertEqual(candidates.join(','), 'calibre,html-to-mobi,none', 'auto converter should honor configured order and append none fallback')
}

export async function runCompileTests () {
  return runTestSuite('CLI Compile Command Tests', [
    { name: 'kindle target requires output dir', fn: testKindleCompileRequiresOutputDir },
    { name: 'kindle target requires config', fn: testKindleCompileRequiresConfig },
    { name: 'invalid target fails', fn: testInvalidTargetFails },
    { name: 'kindle-any writes variant artifacts', fn: testKindleAnyCompilesVariantArtifacts },
    { name: 'kindle tracks once choices in state graph', fn: testKindleSupportsOnceChoicesInStateGraph },
    { name: 'kindle rejects input choices', fn: testKindleRejectsInputChoices },
    { name: 'kindle-strict fails on dropped features', fn: testKindleStrictFailsOnDroppedFeatures },
    { name: 'converter auto order appends none fallback', fn: testConverterAutoOrderIncludesFallbackNone }
  ])
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCompileTests().then(passed => {
    process.exit(passed ? 0 : 1)
  })
}
