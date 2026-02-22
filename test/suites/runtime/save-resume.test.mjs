import IFScript from '../../../src/IFScript.mjs'
import versions from '../../../src/constants/versions.mjs'
import { pathToFileURL } from 'url'
import {
  assert,
  assertEqual,
  runTestSuite
} from '../../support/test-utils.mjs'

function createMemoryStorage () {
  const store = {}
  return {
    getItem: (key) => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
    setItem: (key, value) => { store[key] = String(value) },
    removeItem: (key) => { delete store[key] }
  }
}

async function createRuntimeHarness (opts = {}) {
  const storyText = `settings__
  @storyTitle "Save Test Story"
  @startAt 0
  @autoSave true
__settings

section__
  @title "Start"
  hp = 9
  choice__
    @target 1
    "Next"
  __choice
__section

section__
  @title "Second"
  "Hello"
  choice__
    @target 1
    "Stay"
  __choice
__section`

  const storage = opts.storage || createMemoryStorage()
  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const story = await ifScript.parse(storyText, 'save-resume-test.if')
  const runtime = await ifScript.createRuntime({ storage })
  let view = runtime.start(story, {
    resume: opts.resume !== undefined ? opts.resume : false,
    resumePrompt: opts.resumePrompt
  })

  if (opts.advance === true) {
    view = runtime.selectChoice({ choiceIndex: 1 }) || view
  }

  const fingerprint = runtime.engine.engineState.storyFingerprint
  const autoKey = runtime.storage.getAutoKey(fingerprint)

  return { story, runtime, storage, fingerprint, autoKey, view }
}

async function testPersistAutoSaveWritesPayload () {
  const { runtime, storage, autoKey } = await createRuntimeHarness()

  const raw = storage.getItem(autoKey)
  assert(typeof raw === 'string', 'auto-save should write payload to localStorage')
  const payload = JSON.parse(raw)
  assertEqual(payload.version, 2, 'payload version should be 2')
  assertEqual(payload.sectionSerial, 0, 'payload should store current section serial')
  assertEqual(payload.variables.hp, 9, 'payload should include variables')
  assert(payload.variables.functions === undefined, 'payload should not include functions map')
  runtime.destroy()
}

async function testLoadAutoSaveRestoresPayloadWhenValid () {
  const storage = createMemoryStorage()
  const first = await createRuntimeHarness({ storage, advance: true })
  const payload = first.runtime.engine.createSnapshot()
  storage.setItem(first.autoKey, JSON.stringify(payload))
  first.runtime.destroy()

  const second = await createRuntimeHarness({ storage, resume: true, resumePrompt: false })
  assert(second.view !== null, 'valid payload should load')
  assertEqual(second.view.section.serial, payload.sectionSerial, 'loaded section should match saved payload')
  assertEqual(second.runtime.engine.run.state.variables.hp, 9, 'loaded variables should match')
  second.runtime.destroy()
}

async function testLoadAutoSaveIgnoresInvalidPayload () {
  const storage = createMemoryStorage()
  const invalid = await createRuntimeHarness({ storage, resume: false })
  storage.setItem(invalid.autoKey, '{bad-json')
  invalid.runtime.destroy()

  const afterBadJson = await createRuntimeHarness({ storage, resume: true, resumePrompt: false })
  assertEqual(afterBadJson.view.section.serial, 0, 'invalid JSON payload should be ignored')
  afterBadJson.runtime.destroy()

  const mismatchHarness = await createRuntimeHarness({ storage, resume: false })
  const payload = mismatchHarness.runtime.engine.createSnapshot()
  payload.storyFingerprint = 'mismatch'
  storage.setItem(mismatchHarness.autoKey, JSON.stringify(payload))
  mismatchHarness.runtime.destroy()

  const afterMismatch = await createRuntimeHarness({ storage, resume: true, resumePrompt: false })
  assertEqual(afterMismatch.view.section.serial, 0, 'fingerprint mismatch should be ignored')
  afterMismatch.runtime.destroy()
}

async function testClearAutoSaveRemovesPayload () {
  const { runtime, storage, fingerprint, autoKey } = await createRuntimeHarness()

  assert(storage.getItem(autoKey) !== null, 'payload should exist before clear')
  const didClear = runtime.storage.clearAutoSave(fingerprint)
  assertEqual(didClear, true, 'clear should report success')
  assertEqual(storage.getItem(autoKey), null, 'clear should remove payload')
  runtime.destroy()
}

async function testResumeRestoresAudioState () {
  const storage = createMemoryStorage()
  const first = await createRuntimeHarness({ storage, resume: false })

  first.runtime.toggleAudioEnabled()
  first.runtime.toggleAudioPaused()

  const raw = storage.getItem(first.autoKey)
  assert(typeof raw === 'string', 'audio preference changes should persist to autosave payload')
  const payload = JSON.parse(raw)
  assert(payload.audioState !== null, 'autosave should include audio state metadata')
  assertEqual(payload.audioState.enabled, false, 'autosave should persist muted state')
  assertEqual(payload.audioState.paused, true, 'autosave should persist paused state')
  first.runtime.destroy()

  const second = await createRuntimeHarness({ storage, resume: true, resumePrompt: false })
  const restoredAudio = second.runtime.audio.getUiState()
  assertEqual(restoredAudio.enabled, false, 'resume should restore muted state')
  assertEqual(restoredAudio.paused, true, 'resume should restore paused state')
  second.runtime.destroy()
}

export async function runSaveResumeTests () {
  return runTestSuite('Save/Resume Helper Tests', [
    { name: 'persist writes payload', fn: testPersistAutoSaveWritesPayload },
    { name: 'load restores valid payload', fn: testLoadAutoSaveRestoresPayloadWhenValid },
    { name: 'load ignores invalid payloads', fn: testLoadAutoSaveIgnoresInvalidPayload },
    { name: 'clear removes payload', fn: testClearAutoSaveRemovesPayload },
    { name: 'resume restores audio state', fn: testResumeRestoresAudioState }
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

