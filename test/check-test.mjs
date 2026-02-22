import { writeFile, unlink } from 'fs/promises'
import path from 'path'
import { spawnSync } from 'child_process'
import { fileURLToPath, pathToFileURL } from 'url'
import {
  assert,
  assertEqual,
  runTestSuite
} from './test-utils.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
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

export async function runCheckTests () {
  return runTestSuite('CLI Check Command Tests', [
    { name: 'check exits 0 with no diagnostics', fn: testCheckNoDiagnosticsExitZero },
    { name: 'check exits 1 with unresolved target', fn: testCheckUnresolvedTargetExitOne },
    { name: 'check --json output shape', fn: testCheckJsonOutputShape }
  ])
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCheckTests().then(passed => {
    process.exit(passed ? 0 : 1)
  })
}
