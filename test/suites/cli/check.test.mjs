import { writeFile, unlink } from 'fs/promises'
import path from 'path'
import { spawnSync } from 'child_process'
import { fileURLToPath, pathToFileURL } from 'url'
import {
  assert,
  assertEqual,
  runTestSuite
} from '../../support/test-utils.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../../..')
const cliEntry = path.join(repoRoot, 'bin/index.mjs')

async function withTempStory (content, fn) {
  const tempPath = path.join(repoRoot, `tmp-check-${Date.now()}-${Math.floor(Math.random() * 10000)}.if`)
  await writeFile(tempPath, content, 'utf-8')
  try {
    return await fn(tempPath)
  } finally {
    await unlink(tempPath).catch(() => {})
  }
}

function runCheck (args) {
  return spawnSync(process.execPath, [cliEntry, 'check', ...args], {
    cwd: repoRoot,
    encoding: 'utf-8'
  })
}

function runCheckJson (storyPath) {
  const result = runCheck(['-i', storyPath, '--json'])
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
    const result = runCheck(['-i', storyPath])
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
    const result = runCheck(['-i', storyPath])
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
    const result = runCheck(['-i', storyPath, '--json'])
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
    const { result, payload } = runCheckJson(storyPath)
    assertEqual(result.status, 1, 'startAt unresolved should fail check')
    assert(hasCode(payload, 'START_AT_UNRESOLVED'), 'should emit START_AT_UNRESOLVED')
  })
}

async function testCheckFullTimerTargetUnresolved () {
  const content = `settings__
  @fullTimer 30 "Missing Timeout"
__settings

section__
  @title "Start"
  "Hello"
__section`

  await withTempStory(content, async (storyPath) => {
    const { result, payload } = runCheckJson(storyPath)
    assertEqual(result.status, 1, 'fullTimer unresolved should fail check')
    assert(hasCode(payload, 'FULL_TIMER_TARGET_UNRESOLVED'), 'should emit FULL_TIMER_TARGET_UNRESOLVED')
  })
}

async function testCheckSectionTimerTargetUnresolved () {
  const content = `section__
  @title "Start"
  @timer 10 "Missing Timeout"
  "Hello"
__section`

  await withTempStory(content, async (storyPath) => {
    const { result, payload } = runCheckJson(storyPath)
    assertEqual(result.status, 1, 'section timer unresolved should fail check')
    assert(hasCode(payload, 'SECTION_TIMER_TARGET_UNRESOLVED'), 'should emit SECTION_TIMER_TARGET_UNRESOLVED')
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
    const { result, payload } = runCheckJson(storyPath)
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
    const { result, payload } = runCheckJson(storyPath)
    assertEqual(result.status, 0, 'duplicate function name should warn but not fail check')
    assert(hasCode(payload, 'DUPLICATE_FUNCTION_NAME'), 'should emit DUPLICATE_FUNCTION_NAME')
    assertEqual(payload.summary.errors, 0, 'warning-only case should have zero errors')
  })
}

async function testCheckDeprecatedSceneMusicPropertyFailsParse () {
  const content = `scene__
  @name "Old"
  @music "theme.mp3"
__scene

section__
  @title "Start"
  "Hello"
__section`

  await withTempStory(content, async (storyPath) => {
    const { result, payload } = runCheckJson(storyPath)
    assertEqual(result.status, 1, 'deprecated @music should fail check via parse error')
    assert(hasCode(payload, 'PARSE_OR_IMPORT_ERROR'), 'should emit PARSE_OR_IMPORT_ERROR for deprecated property')
    assert(
      payload.diagnostics.some(d => String(d.message || '').includes('Property @music is deprecated')),
      'diagnostic message should explain @music deprecation'
    )
  })
}

export async function runCheckTests () {
  return runTestSuite('CLI Check Command Tests', [
    { name: 'check exits 0 with no diagnostics', fn: testCheckNoDiagnosticsExitZero },
    { name: 'check exits 1 with unresolved target', fn: testCheckUnresolvedTargetExitOne },
    { name: 'check --json output shape', fn: testCheckJsonOutputShape },
    { name: 'check startAt unresolved', fn: testCheckStartAtUnresolved },
    { name: 'check fullTimer target unresolved', fn: testCheckFullTimerTargetUnresolved },
    { name: 'check section timer target unresolved', fn: testCheckSectionTimerTargetUnresolved },
    { name: 'check scene first unresolved', fn: testCheckSceneFirstUnresolved },
    { name: 'check duplicate function name warning', fn: testCheckDuplicateFunctionNameWarningOnly },
    { name: 'check deprecated @music parse failure', fn: testCheckDeprecatedSceneMusicPropertyFailsParse }
  ])
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCheckTests().then(passed => {
    process.exit(passed ? 0 : 1)
  })
}

