import IFScript from '../src/IFScript.mjs'
import versions from '../src/constants/versions.mjs'
import Interpreter from '../src/interpreters/custom/Interpreter.mjs'
import Run from '../src/interpreters/custom/Run.mjs'
import State from '../src/interpreters/custom/State.mjs'
import { pathToFileURL } from 'url'
import {
  assert,
  assertEqual,
  runTestSuite
} from './test-utils.mjs'

function createMemoryStorage () {
  const store = {}
  return {
    getItem: (key) => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: (key) => { delete store[key] }
  }
}

async function createInterpreterHarness (opts = {}) {
  const storyText = `settings__
  @storyTitle "Save Test Story"
  @autoSave true
__settings

section__
  @title "Start"
  "Hello"
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const story = await ifScript.parse(storyText, 'save-resume-test.if')
  const run = new Run(story, new State(), null, opts)
  const interpreter = new Interpreter(run)
  interpreter.run = run
  interpreter.runtimeOptions = {
    theme: 'default',
    allowUndo: true,
    showTurn: true,
    animations: true,
    autoSave: true
  }
  run.state.section = story.sections[0]
  run.state.turn = 3
  run.state.variables = { turn: 3, hp: 9, functions: { demo: true } }
  run.state.onceConsumed = { '0:1': true }
  return { story, run, interpreter }
}

async function testPersistAutoSaveWritesPayload () {
  const storage = createMemoryStorage()
  global.localStorage = storage
  const { interpreter } = await createInterpreterHarness({ saveKey: 'slot-a', resumePrompt: false })

  interpreter._persistAutoSave()
  const raw = storage.getItem('ifscript:save:slot-a')
  assert(typeof raw === 'string', 'auto-save should write payload to localStorage')
  const payload = JSON.parse(raw)
  assertEqual(payload.version, 1, 'payload version should be 1')
  assertEqual(payload.sectionSerial, 0, 'payload should store current section serial')
  assertEqual(payload.variables.hp, 9, 'payload should include variables')
  assert(payload.variables.functions === undefined, 'payload should not include functions map')
}

async function testLoadAutoSaveRestoresPayloadWhenValid () {
  const storage = createMemoryStorage()
  global.localStorage = storage
  const { interpreter } = await createInterpreterHarness({ saveKey: 'slot-b', resumePrompt: false })

  const payload = interpreter._buildSavePayload()
  storage.setItem('ifscript:save:slot-b', JSON.stringify(payload))
  const loaded = interpreter._loadAutoSave()
  assert(loaded !== null, 'valid payload should load')
  assertEqual(loaded.sectionSerial, payload.sectionSerial, 'loaded section should match saved payload')
  assertEqual(loaded.variables.hp, 9, 'loaded variables should match')
}

async function testLoadAutoSaveIgnoresInvalidPayload () {
  const storage = createMemoryStorage()
  global.localStorage = storage
  const { interpreter } = await createInterpreterHarness({ saveKey: 'slot-c', resumePrompt: false })

  storage.setItem('ifscript:save:slot-c', '{bad-json')
  const badJson = interpreter._loadAutoSave()
  assertEqual(badJson, null, 'invalid JSON payload should be ignored')

  const payload = interpreter._buildSavePayload()
  payload.storyFingerprint = 'mismatch'
  storage.setItem('ifscript:save:slot-c', JSON.stringify(payload))
  const mismatch = interpreter._loadAutoSave()
  assertEqual(mismatch, null, 'fingerprint mismatch should be ignored')
}

async function testClearAutoSaveRemovesPayload () {
  const storage = createMemoryStorage()
  global.localStorage = storage
  const { interpreter } = await createInterpreterHarness({ saveKey: 'slot-d', resumePrompt: false })

  interpreter._persistAutoSave()
  assert(storage.getItem('ifscript:save:slot-d') !== null, 'payload should exist before clear')
  interpreter._clearAutoSave()
  assertEqual(storage.getItem('ifscript:save:slot-d'), null, 'clear should remove payload')
}

export async function runSaveResumeTests () {
  return runTestSuite('Save/Resume Helper Tests', [
    { name: 'persist writes payload', fn: testPersistAutoSaveWritesPayload },
    { name: 'load restores valid payload', fn: testLoadAutoSaveRestoresPayloadWhenValid },
    { name: 'load ignores invalid payloads', fn: testLoadAutoSaveIgnoresInvalidPayload },
    { name: 'clear removes payload', fn: testClearAutoSaveRemovesPayload }
  ])
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSaveResumeTests()
    .then(passed => process.exit(passed ? 0 : 1))
    .catch(err => {
      console.error(err)
      process.exit(1)
    })
}
