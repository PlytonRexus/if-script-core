import { writeFile, unlink } from 'fs/promises'
import path from 'path'
import { spawnSync } from 'child_process'
import { fileURLToPath, pathToFileURL } from 'url'
import check from '../../../src/cli/check.mjs'
import {
  assert,
  assertEqual,
  runTestSuite
} from '../../support/test-utils.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../../..')
const cliEntry = path.join(repoRoot, 'bin/index.mjs')

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

async function withTempStory (content, fn) {
  const tempPath = path.join(repoRoot, `tmp-check-${Date.now()}-${Math.floor(Math.random() * 10000)}.if`)
  await writeFile(tempPath, content, 'utf-8')
  try {
    return await fn(tempPath)
  } finally {
    await unlink(tempPath).catch(() => {})
  }
}

async function withTempStoryAndConfig (content, config, fn) {
  const storyPath = path.join(repoRoot, `tmp-check-${Date.now()}-${Math.floor(Math.random() * 10000)}.if`)
  const configPath = path.join(repoRoot, `tmp-check-config-${Date.now()}-${Math.floor(Math.random() * 10000)}.json`)
  await writeFile(storyPath, content, 'utf-8')
  await writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8')
  try {
    return await fn({ storyPath, configPath })
  } finally {
    await unlink(storyPath).catch(() => {})
    await unlink(configPath).catch(() => {})
  }
}

function parseCheckArgs (args) {
  let inputFile = null
  let asJson = false
  let profile = 'default'
  let kindleConfig = null

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '-i' || arg === '--input-file') {
      inputFile = args[i + 1]
      i += 1
      continue
    }
    if (arg === '--json') {
      asJson = true
      continue
    }
    if (arg === '--profile') {
      profile = args[i + 1]
      i += 1
      continue
    }
    if (arg === '--kindle-config') {
      kindleConfig = args[i + 1]
      i += 1
    }
  }

  return {
    i: inputFile,
    'input-file': inputFile,
    json: asJson,
    profile,
    'kindle-config': kindleConfig
  }
}

async function runCheckInProcess (args) {
  const chunks = []
  const originalWrite = process.stdout.write.bind(process.stdout)
  const originalExitCode = process.exitCode

  process.exitCode = undefined
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
    await check(parseCheckArgs(args))
    return {
      status: process.exitCode ?? 0,
      signal: null,
      error: null,
      stdout: chunks.join(''),
      stderr: ''
    }
  } finally {
    process.stdout.write = originalWrite
    process.exitCode = originalExitCode
  }
}

async function runCheck (args) {
  const result = spawnSync(process.execPath, [cliEntry, 'check', ...args], {
    cwd: repoRoot,
    encoding: 'utf-8'
  })

  if (result && result.error && (result.error.code === 'EPERM' || result.error.code === 'EACCES')) {
    return runCheckInProcess(args)
  }

  return result
}

async function runCheckJson (storyPath, extraArgs = []) {
  const result = await runCheck(['-i', storyPath, '--json', ...extraArgs])
  const payload = JSON.parse(result.stdout)
  return { result, payload }
}

function hasCode (payload, code) {
  return payload.diagnostics.some(d => d.code === code)
}

async function testCheckNoDiagnosticsExitZero () {
  const content = `section__
  @title "Start"
  choice__
    @target "End"
    "Go"
  __choice
__section

section__
  @title "End"
  "Done"
__section`

  await withTempStory(content, async (storyPath) => {
    const result = await runCheck(['-i', storyPath])
    assertEqual(result.status, 0, 'check should exit 0 when no errors exist')
    assert(result.stdout.includes('Summary:'), 'check should print summary')
  })
}

async function testCheckUnresolvedTargetExitOne () {
  const content = `section__
  @title "Start"
  choice__
    @target "Missing"
    "Go"
  __choice
__section`

  await withTempStory(content, async (storyPath) => {
    const result = await runCheck(['-i', storyPath])
    assertEqual(result.status, 1, 'check should exit 1 when errors exist')
    assert(result.stdout.includes('CHOICE_TARGET_UNRESOLVED'), 'should report unresolved target diagnostic code')
  })
}

async function testCheckJsonOutputShape () {
  const content = `section__
  @title "Start"
  choice__
    @target "Missing"
    "Go"
  __choice
__section`

  await withTempStory(content, async (storyPath) => {
    const result = await runCheck(['-i', storyPath, '--json'])
    assertEqual(result.status, 1, 'json mode should still exit 1 for errors')
    const payload = JSON.parse(result.stdout)
    assert(payload.summary, 'json output should include summary')
    assert(Array.isArray(payload.diagnostics), 'json output should include diagnostics array')
    assert(payload.diagnostics.length > 0, 'json output should include at least one diagnostic')
  })
}

async function testCheckStartAtUnresolved () {
  const content = `settings__
  @startAt "Missing Section"
__settings

section__
  @title "Start"
  "Hello"
__section`

  await withTempStory(content, async (storyPath) => {
    const { result, payload } = await runCheckJson(storyPath)
    assertEqual(result.status, 1, 'startAt unresolved should fail check')
    assert(hasCode(payload, 'START_AT_UNRESOLVED'), 'should emit START_AT_UNRESOLVED')
  })
}

async function testCheckSceneFirstUnresolved () {
  const content = `scene__
  @name "Chapter 1"
  @first "Missing Start"
__scene

section__
  @title "Start"
  "Hello"
__section`

  await withTempStory(content, async (storyPath) => {
    const { result, payload } = await runCheckJson(storyPath)
    assertEqual(result.status, 1, 'scene first unresolved should fail check')
    assert(hasCode(payload, 'SCENE_FIRST_UNRESOLVED'), 'should emit SCENE_FIRST_UNRESOLVED')
  })
}

async function testCheckDuplicateFunctionNameWarningOnly () {
  const content = `function__ helper(a) {
  return__ a
}

function__ helper(b) {
  return__ b + 1
}

section__
  @title "Start"
  x = helper(2)
__section`

  await withTempStory(content, async (storyPath) => {
    const { result, payload } = await runCheckJson(storyPath)
    assertEqual(result.status, 0, 'duplicate function name should warn but not fail check')
    assert(hasCode(payload, 'DUPLICATE_FUNCTION_NAME'), 'should emit DUPLICATE_FUNCTION_NAME')
    assertEqual(payload.summary.errors, 0, 'warning-only case should have zero errors')
  })
}

async function testCheckKindleRequiresConfig () {
  const content = `section__
  @title "Start"
  "Hello"
__section`

  await withTempStory(content, async (storyPath) => {
    const { result, payload } = await runCheckJson(storyPath, ['--profile', 'kindle-any'])
    assertEqual(result.status, 1, 'kindle check should fail without config')
    assert(hasCode(payload, 'KINDLE_CONFIG_REQUIRED'), 'should emit KINDLE_CONFIG_REQUIRED')
  })
}

async function testCheckKindleAnyWarnsButPassesWithConfig () {
  const content = `settings__
  @fullTimer 30 "End"
  @autoSave true
  @theme "cinematic"
__settings

section__
  @title "Start"
  @timer 10 "End"
  @backdrop "https://example.com/bg.jpg"
  choice__
    @target "End"
    "Continue"
  __choice
__section

section__
  @title "End"
  "Done"
__section`

  await withTempStoryAndConfig(content, makeConfig(), async ({ storyPath, configPath }) => {
    const { result, payload } = await runCheckJson(storyPath, ['--profile', 'kindle-any', '--kindle-config', configPath])
    assertEqual(result.status, 0, 'kindle-any profile should warn but not fail')
    assert(hasCode(payload, 'KINDLE_DROPPED_TIMER'), 'should emit timer warning')
    assert(hasCode(payload, 'KINDLE_DROPPED_MEDIA'), 'should emit media warning')
    assertEqual(payload.summary.errors, 0, 'warning-only case should keep zero errors')
  })
}

async function testCheckKindleRejectsUndeclaredExportState () {
  const content = `section__
  @title "Start"
  "Value: ${'${flag}'}"
  choice__
    @target "End"
    "Continue"
  __choice
__section

section__
  @title "End"
  "Done"
__section`

  await withTempStoryAndConfig(content, makeConfig(), async ({ storyPath, configPath }) => {
    const { result, payload } = await runCheckJson(storyPath, ['--profile', 'kindle-any', '--kindle-config', configPath])
    assertEqual(result.status, 1, 'undeclared Kindle state should fail check')
    assert(hasCode(payload, 'KINDLE_UNDECLARED_EXPORT_STATE'), 'should emit undeclared state diagnostic')
  })
}

async function testCheckKindleRejectsInputChoices () {
  const content = `section__
  @title "Start"
  choice__
    @target "End"
    @input name
    "Name [[input]]"
  __choice
__section

section__
  @title "End"
  "Done"
__section`

  await withTempStoryAndConfig(content, makeConfig({
    name: { type: 'enum', values: ['A'], default: 'A' }
  }), async ({ storyPath, configPath }) => {
    const { result, payload } = await runCheckJson(storyPath, ['--profile', 'kindle-any', '--kindle-config', configPath])
    assertEqual(result.status, 1, 'input choices should fail kindle check')
    assert(hasCode(payload, 'KINDLE_UNSUPPORTED_INPUT_CHOICE'), 'should emit input choice diagnostic')
  })
}

async function testCheckKindleDetectsStateBudgetOverage () {
  const content = `section__
  @title "Start"
  choice__
    @target "Start"
    @action flag = true
    "Raise"
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

  await withTempStoryAndConfig(content, makeConfig({
    flag: { type: 'boolean', values: [false, true], default: false }
  }, {
    maxStates: 1,
    warnStates: 1
  }), async ({ storyPath, configPath }) => {
    const { result, payload } = await runCheckJson(storyPath, ['--profile', 'kindle-any', '--kindle-config', configPath])
    assertEqual(result.status, 1, 'state budget overage should fail check')
    assert(hasCode(payload, 'KINDLE_STATE_LIMIT_EXCEEDED'), 'should emit state limit exceeded diagnostic')
  })
}

export async function runCheckTests () {
  return runTestSuite('CLI Check Command Tests', [
    { name: 'check exits 0 with no diagnostics', fn: testCheckNoDiagnosticsExitZero },
    { name: 'check exits 1 with unresolved target', fn: testCheckUnresolvedTargetExitOne },
    { name: 'check --json output shape', fn: testCheckJsonOutputShape },
    { name: 'check startAt unresolved', fn: testCheckStartAtUnresolved },
    { name: 'check scene first unresolved', fn: testCheckSceneFirstUnresolved },
    { name: 'check duplicate function name warning', fn: testCheckDuplicateFunctionNameWarningOnly },
    { name: 'check kindle requires config', fn: testCheckKindleRequiresConfig },
    { name: 'check kindle-any warnings', fn: testCheckKindleAnyWarnsButPassesWithConfig },
    { name: 'check kindle rejects undeclared export state', fn: testCheckKindleRejectsUndeclaredExportState },
    { name: 'check kindle rejects input choices', fn: testCheckKindleRejectsInputChoices },
    { name: 'check kindle detects state budget overage', fn: testCheckKindleDetectsStateBudgetOverage }
  ])
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCheckTests().then(passed => {
    process.exit(passed ? 0 : 1)
  })
}
