import { mkdir, readFile, rm, unlink, writeFile } from 'fs/promises'
import path from 'path'
import { spawnSync } from 'child_process'
import { fileURLToPath, pathToFileURL } from 'url'
import compile from '../../../src/cli/compile.mjs'
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

async function withTempStoryAndOutDir (content, fn) {
  const id = uniqueId()
  const storyPath = path.join(repoRoot, `tmp-compile-${id}.if`)
  const outDir = path.join(repoRoot, `tmp-kindle-out-${id}`)
  await writeFile(storyPath, content, 'utf-8')
  await mkdir(outDir, { recursive: true })
  try {
    return await fn({ storyPath, outDir })
  } finally {
    await unlink(storyPath).catch(() => {})
    await rm(outDir, { recursive: true, force: true }).catch(() => {})
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
    'report-file': null
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
  const content = `section__
  @title "Start"
  "Hello"
__section`

  await withTempStoryAndOutDir(content, async ({ storyPath }) => {
    const result = await runCompile(['-i', storyPath, '--target', 'kindle-html'])
    assertEqual(result.status, 1, 'kindle compile should fail without output dir')
  })
}

async function testInvalidTargetFails () {
  const content = `section__
  @title "Start"
  "Hello"
__section`

  await withTempStoryAndOutDir(content, async ({ storyPath, outDir }) => {
    const result = await runCompile(['-i', storyPath, '--target', 'bogus', '--output-dir', outDir])
    assertEqual(result.status, 1, 'invalid target should fail')
  })
}

async function testKindleAnyCompilesAndWritesArtifacts () {
  const content = `settings__
  @fullTimer 30 "End"
  @theme "cinematic"
__settings

scene__
  @name "Arc"
  @first "Scene Entry"
__scene

section__
  @title "Start"
  @timer 10 "End"
  @backdrop "https://example.com/bg.jpg"
  choice__
    @targetType "scene"
    @target "Arc"
    @when mood == "ok"
    @action mood = "ok"
    "Go to Arc"
  __choice
__section

section__
  @title "Scene Entry"
  "Arc text"
  choice__
    @target "End"
    "Finish"
  __choice
__section

section__
  @title "End"
  "Done"
__section`

  await withTempStoryAndOutDir(content, async ({ storyPath, outDir }) => {
    const result = await runCompile([
      '-i',
      storyPath,
      '--target',
      'kindle-html',
      '--profile',
      'kindle-any',
      '--output-dir',
      outDir
    ])
    assertEqual(result.status, 0, 'kindle-any compile should succeed')

    const indexHtml = await readFile(path.join(outDir, 'index.html'), 'utf-8')
    assert(indexHtml.includes('Start reading'), 'index.html should include start link')

    const report = JSON.parse(await readFile(path.join(outDir, 'kindle-report.json'), 'utf-8'))
    assert(Array.isArray(report.sections), 'report should include section list')
    assert(report.sections.length >= 3, 'report should include all sections')

    const startSection = report.sections.find(section => section.title === 'Start')
    const sceneEntry = report.sections.find(section => section.title === 'Scene Entry')
    assert(startSection && sceneEntry, 'report should include Start and Scene Entry sections')

    const startPagePath = path.join(outDir, startSection.file.replaceAll('/', path.sep))
    const startPage = await readFile(startPagePath, 'utf-8')
    const targetFileName = sceneEntry.file.split('/').pop()
    assert(startPage.includes(`../sections/${targetFileName}`), 'scene target should resolve to scene first section page')
  })
}

async function testKindleFallbackDoesNotFailCompile () {
  const content = `section__
  @title "Start"
  "Fallback section text"
  while__ (1 == 1) {
    x = 1
  }
  choice__
    @target "End"
    "Continue"
  __choice
__section

section__
  @title "End"
  "Done"
__section`

  await withTempStoryAndOutDir(content, async ({ storyPath, outDir }) => {
    const result = await runCompile([
      '-i',
      storyPath,
      '--target',
      'kindle-html',
      '--profile',
      'kindle-any',
      '--output-dir',
      outDir
    ])
    assertEqual(result.status, 0, 'fallback scenario should still compile')
    const report = JSON.parse(await readFile(path.join(outDir, 'kindle-report.json'), 'utf-8'))
    assert(Array.isArray(report.fallbackRenders), 'report should expose fallback render list')
    assert(report.fallbackRenders.length > 0, 'fallback render list should capture runtime-render failures')
  })
}

async function testKindleStrictFailsOnDroppedFeatures () {
  const content = `settings__
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

  await withTempStoryAndOutDir(content, async ({ storyPath, outDir }) => {
    const result = await runCompile([
      '-i',
      storyPath,
      '--target',
      'kindle-html',
      '--profile',
      'kindle-strict',
      '--output-dir',
      outDir
    ])
    assertEqual(result.status, 1, 'kindle-strict should fail on dropped features')
  })
}

export async function runCompileTests () {
  return runTestSuite('CLI Compile Command Tests', [
    { name: 'kindle target requires output dir', fn: testKindleCompileRequiresOutputDir },
    { name: 'invalid target fails', fn: testInvalidTargetFails },
    { name: 'kindle-any writes static artifacts', fn: testKindleAnyCompilesAndWritesArtifacts },
    { name: 'kindle fallback stays successful', fn: testKindleFallbackDoesNotFailCompile },
    { name: 'kindle-strict fails on dropped features', fn: testKindleStrictFailsOnDroppedFeatures }
  ])
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCompileTests().then(passed => {
    process.exit(passed ? 0 : 1)
  })
}
