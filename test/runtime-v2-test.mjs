import IFScript from '../src/IFScript.mjs'
import Story from '../src/models/Story.mjs'
import versions from '../src/constants/versions.mjs'
import { buildInputChoiceMarkup } from '../src/runtime/components/if-choice-list.mjs'
import { pathToFileURL } from 'url'
import fs from 'fs/promises'
import {
  assert,
  assertEqual,
  assertThrows,
  runTestSuite
} from './test-utils.mjs'

async function testCreateRuntimeFactory () {
  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const runtime = await ifScript.createRuntime()
  assert(runtime !== null, 'createRuntime should return a runtime instance')
  assert(typeof runtime.start === 'function', 'runtime should expose start()')
  assert(typeof runtime.mount === 'function', 'runtime should expose mount()')
}

async function testParseNewPresentationAndAudioMetadata () {
  const storyText = `
settings__
  @storyTitle "V2 Meta"
  @presentationMode "cinematic"
  @storyAmbience "https://example.com/story-bed.mp3"
  @storyAmbienceVolume 0.22
  @storyAmbienceLoop false
  @storyAmbienceFadeInMs 1500
  @storyAmbienceFadeOutMs 1200
__settings

scene__
  @name "Main"
  @first 1
  @sceneAmbience "https://example.com/music.mp3"
  @sceneAmbienceVolume 0.6
  @sceneAmbienceLoop true
  @sceneAmbienceFadeInMs 1200
  @sceneAmbienceFadeOutMs 900
  @sceneTransition "fade"
  @sections 1
__scene

section__
  @title "One"
  @ambience "https://example.com/rain.mp3"
  @ambienceVolume 0.5
  @ambienceLoop true
  @ambienceFadeInMs 400
  @ambienceFadeOutMs 300
  @sfx "https://example.com/a.mp3"
  @sfx "https://example.com/b.mp3"
  @backdrop "https://example.com/bg.jpg"
  @shot "wide"
  @textPacing "cinematic"
  choice__
    @target 1
    @choiceSfx "https://example.com/click.mp3"
    @focusSfx "https://example.com/focus.mp3"
    @choiceStyle "primary"
    "Loop"
  __choice
__section
`
  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const story = await ifScript.parse(storyText, 'runtime-v2-meta.if')

  assertEqual(story.settings.presentationMode, 'cinematic', 'presentationMode should parse')
  assertEqual(story.settings.storyAmbience, 'https://example.com/story-bed.mp3', 'storyAmbience should parse')
  assertEqual(story.settings.storyAmbienceVolume, 0.22, 'storyAmbienceVolume should parse')
  assertEqual(story.settings.storyAmbienceLoop, false, 'storyAmbienceLoop should parse')
  assertEqual(story.settings.storyAmbienceFadeInMs, 1500, 'storyAmbienceFadeInMs should parse')
  assertEqual(story.settings.storyAmbienceFadeOutMs, 1200, 'storyAmbienceFadeOutMs should parse')
  const scene = story.scenes[0]
  assertEqual(scene.musicVolume, 0.6, 'musicVolume should parse')
  assertEqual(scene.musicLoop, true, 'musicLoop should parse')
  assertEqual(scene.sceneTransition, 'fade', 'sceneTransition should parse')

  const section = story.sections[0]
  assertEqual(section.settings.ambience, 'https://example.com/rain.mp3', 'ambience should parse')
  assertEqual(section.settings.ambienceVolume, 0.5, 'ambienceVolume should parse')
  assertEqual(section.settings.shot, 'wide', 'shot should parse')
  assertEqual(section.settings.textPacing, 'cinematic', 'textPacing should parse')
  assert(Array.isArray(section.settings.sfx), '@sfx should parse as an array')
  assertEqual(section.settings.sfx.length, 2, '@sfx should accumulate repeatable values')

  const choice = section.choices[0]
  assertEqual(choice.choiceSfx, 'https://example.com/click.mp3', 'choiceSfx should parse')
  assertEqual(choice.focusSfx, 'https://example.com/focus.mp3', 'focusSfx should parse')
  assertEqual(choice.choiceStyle, 'primary', 'choiceStyle should parse')
}

async function testParseRejectsInvalidEnum () {
  const storyText = `
settings__
  @presentationMode "nope"
__settings

section__
  @title "Bad"
  "x"
__section
`
  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  await assertThrows(
    async () => ifScript.parse(storyText, 'runtime-v2-invalid.if'),
    'Invalid value "nope" for @presentationMode',
    'invalid enum should throw a clear parse error'
  )
}

async function testParseRejectsDeprecatedSceneMusicProperties () {
  const storyText = `
scene__
  @name "Deprecated"
  @music "https://example.com/old.mp3"
__scene

section__
  @title "Start"
  "x"
__section
`
  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  await assertThrows(
    async () => ifScript.parse(storyText, 'runtime-v2-deprecated-scene-music.if'),
    'Property @music is deprecated and no longer supported. Use @sceneAmbience instead.',
    'deprecated scene music properties should throw a clear parse error'
  )
}

function testInputChoiceMarkupBuilder () {
  const withPlaceholder = buildInputChoiceMarkup(
    { choiceIndex: 1, text: 'Enter [[input]] now' },
    'if-choice-input-1'
  )
  assert(withPlaceholder.includes('choice-inline-input'), 'placeholder text should inject an inline input')
  assert(withPlaceholder.includes('choice-inline-submit'), 'placeholder text should inject an explicit submit affordance')
  assert(withPlaceholder.includes('Enter'), 'input markup should preserve text before placeholder')
  assert(withPlaceholder.includes('now'), 'input markup should preserve text after placeholder')

  const appended = buildInputChoiceMarkup(
    { choiceIndex: 2, text: 'Enter your name:' },
    'if-choice-input-2'
  )
  assert(appended.includes('Enter your name:'), 'fallback input markup should preserve base text')
  assert(appended.includes('choice-inline-input'), 'fallback input markup should append inline input')
}

async function testInputChoiceRequiresValue () {
  const storyText = `
settings__
  @storyTitle "Input Runtime"
  @startAt 0
__settings

section__
  @title "Prompt"
  choice__
    @target 1
    @input playerName
    "Call me [[input]], please."
  __choice
__section

section__
  @title "Done"
  "Saved: \${playerName}"
  choice__
    @target 1
    "Stay"
  __choice
__section
`
  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const story = await ifScript.parse(storyText, 'runtime-v2-input.if')
  const runtime = await ifScript.createRuntime()

  const raisedErrors = []
  const unsubscribe = runtime.on('error_raised', payload => {
    if (payload && payload.message) raisedErrors.push(payload.message)
  })

  const view = runtime.start(story, { resume: false })
  assert(view && view.section && Array.isArray(view.section.choices), 'runtime should render the input section')
  assertEqual(view.section.choices[0].mode, 'input', 'input choices should remain marked as input in view model')
  assert(
    String(view.section.choices[0].text || '').includes('[[input]]'),
    'input placeholder token should be preserved for renderer placement'
  )

  const blocked = runtime.selectChoice({ choiceIndex: 1, inputValue: '   ' })
  assertEqual(blocked, null, 'empty input should block input choice selection')
  assert(
    raisedErrors.some(msg => msg.includes('non-empty value')),
    'runtime should raise a non-empty validation error for input choices'
  )

  const advanced = runtime.selectChoice({ choiceIndex: 1, inputValue: ' <b>Elena</b><script>alert(1)</script> ' })
  assert(advanced && advanced.section && advanced.section.serial === 1, 'valid input should advance to target section')
  assertEqual(runtime.engine.run.state.variables.playerName, 'Elena', 'input value should be sanitized before storing')

  if (typeof unsubscribe === 'function') unsubscribe()
  runtime.destroy()
}

async function testRuntimeHandlesJsonRoundTripAst () {
  const storyText = `
settings__
  @storyTitle "Roundtrip Runtime"
  @startAt 0
__settings

function__ pickSecond(list) {
  return__ list[1]
}

section__
  @title "Intro"
  tags = ["rio", "mar"]
  pickedTag = pickSecond(tags)
  choice__
    @target 1
    @input reporter
    "Name [[input]] and continue"
  __choice
__section

section__
  @title "Report"
  reporterUpper = upper(reporter)
  notes = []
  notes.push(9)
  noteValue = notes[0]
  "picked=\${pickedTag}; reporter=\${reporterUpper}; note=\${noteValue}"
  choice__
    @target 1
    "Loop"
  __choice
__section
`
  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText, 'runtime-v2-json-roundtrip.if')
  const roundTripped = Story.fromJson(JSON.parse(JSON.stringify(parsed)))

  const runtime = await ifScript.createRuntime()
  const firstView = runtime.start(roundTripped, { resume: false })
  assert(firstView && firstView.section, 'runtime should start with JSON-roundtripped story')

  const secondView = runtime.selectChoice({ choiceIndex: 1, inputValue: '  <b>Elena</b>  ' })
  assert(secondView && secondView.section && secondView.section.serial === 1, 'runtime should advance to the second section')
  assert(
    !String(secondView.section.bodyText || '').includes('[object Object]'),
    'JSON-roundtripped story should not leak object markers into section text'
  )
  assert(
    !Object.prototype.hasOwnProperty.call(runtime.engine.run.state.variables, '[object Object]'),
    'JSON-roundtripped story should not create [object Object] variable keys'
  )
  assertEqual(runtime.engine.run.state.variables.pickedTag, 'mar', 'function calls should resolve after JSON roundtrip')
  assertEqual(runtime.engine.run.state.variables.noteValue, 9, 'array access/method calls should resolve after JSON roundtrip')
  assertEqual(runtime.engine.run.state.variables.reporter, 'Elena', 'input target variable should be normalized and sanitized')

  runtime.destroy()
}

async function testRuntimeInterpolatesFunctionTemplatesInStoryText () {
  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()

  const storyText = await fs.readFile(
    new URL('./examples-if/a-stranger-in-veracruz.if', import.meta.url),
    'utf8'
  )
  const story = await ifScript.parse(storyText, 'a-stranger-in-veracruz.if')
  const runtime = await ifScript.createRuntime()
  try {
    let view = runtime.start(story, { resume: false })
    view = runtime.selectChoice({ choiceIndex: 2 })
    view = runtime.selectChoice({ choiceIndex: 2 })

    const cityText = String(view.section.bodyText || '')
    assert(
      !cityText.includes('${evidenceDigest()}'),
      'function placeholders should interpolate in section text'
    )
    assert(
      cityText.includes('Evidence so far: photograph marked with red X.'),
      'city-grid text should include evaluated evidence digest output'
    )

    view = runtime.selectChoice({ choiceIndex: 4 })
    const tableText = String(view.section.bodyText || '')
    assert(
      !tableText.includes('${evidenceDigest()}'),
      'function placeholders should interpolate in Tuesday Window section text'
    )
    assert(
      tableText.includes('You spread every note across the hotel desk: photograph marked with red X.'),
      'Tuesday Window text should include evaluated evidence digest output'
    )
  } finally {
    runtime.destroy()
  }
}

async function testStatementFunctionCallsDoNotLeakIntoNarrativeText () {
  const storyText = `
settings__
  @storyTitle "Statement call leak check"
__settings

section__
  @title "Seed setup"
  setSeed(194601)
  "Veracruz opens in layers."
__section
`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const story = await ifScript.parse(storyText, 'runtime-v2-statement-call.if')
  const runtime = await ifScript.createRuntime()
  try {
    const view = runtime.start(story, { resume: false })

    const bodyText = String(view.section.bodyText || '').trim()
    assertEqual(
      bodyText,
      'Veracruz opens in layers.',
      'statement-level function calls should not prepend return values to body text'
    )
  } finally {
    runtime.destroy()
  }
}

async function testRuntimeExposesActiveTimerMetadataInViewModel () {
  const storyText = `
settings__
  @storyTitle "Timer View Model"
  @startAt 0
  @fullTimer 60 1
  @fullTimerOutcome "When the story timer ends, fate takes over."
__settings

section__
  @title "Start"
  @timer 30 1
  @timerOutcome "You hesitated too long."
  "A clock is ticking."
  choice__
    @target 1
    "Move"
  __choice
__section

section__
  @title "Timeout"
  "Time is up."
  choice__
    @target 1
    "Stay"
  __choice
__section
`
  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const story = await ifScript.parse(storyText, 'runtime-v2-timer-view.if')
  const runtime = await ifScript.createRuntime()

  try {
    const view = runtime.start(story, { resume: false })
    assert(Array.isArray(view.timers), 'view model should expose timers array')
    assertEqual(view.timers.length, 2, 'full + section timers should both be visible as active timers')

    const sectionTimer = view.timers.find(timer => timer.timerType === 'section')
    const fullTimer = view.timers.find(timer => timer.timerType === 'full')
    assert(sectionTimer, 'section timer metadata should be present')
    assert(fullTimer, 'full timer metadata should be present')
    assertEqual(
      sectionTimer.outcomeText,
      'You hesitated too long.',
      'section timer should expose author-defined timeout outcome text'
    )
    assertEqual(
      fullTimer.outcomeText,
      'When the story timer ends, fate takes over.',
      'full timer should expose author-defined timeout outcome text'
    )
    assert(
      !Object.prototype.hasOwnProperty.call(sectionTimer, 'targetLabel'),
      'player-facing timer view should not expose destination labels'
    )
    assert(typeof sectionTimer.startedAt === 'number', 'section timer should include startedAt timestamp')
    assert(typeof sectionTimer.deadlineAt === 'number', 'section timer should include deadlineAt timestamp')
    assert(sectionTimer.deadlineAt > sectionTimer.startedAt, 'deadline should be after start time')
    assertEqual(sectionTimer.durationMs, 30000, 'section timer duration should be exposed in milliseconds')
    assertEqual(fullTimer.durationMs, 60000, 'full timer duration should be exposed in milliseconds')
  } finally {
    runtime.destroy()
  }
}

async function testSceneMusicResolvesTitleBasedSceneRefs () {
  const storyText = `
settings__
  @storyTitle "Scene Music Refs"
  @startAt "Dock"
__settings

scene__
  @name "Opening"
  @first "Dock"
  @sceneAmbience "https://example.com/audio/opening.mp3"
  @sections "Dock"
__scene

scene__
  @name "Bridge"
  @first "Bridge"
  @sceneAmbience "https://example.com/audio/bridge.mp3"
  @sections "Bridge"
__scene

section__
  @title "Dock"
  "At the dock."
  choice__
    @target "Bridge"
    "Move"
  __choice
__section

section__
  @title "Bridge"
  "At the bridge."
  choice__
    @target "Dock"
    "Back"
  __choice
__section
`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const story = await ifScript.parse(storyText, 'runtime-v2-scene-title-refs.if')
  const runtime = await ifScript.createRuntime()
  const sceneMusic = []

  const unsubscribe = runtime.on('scene_changed', payload => {
    sceneMusic.push(payload && payload.scene ? payload.scene.music : null)
  })

  try {
    runtime.start(story, { resume: false })
    assertEqual(sceneMusic[0], 'https://example.com/audio/opening.mp3', 'start scene should emit opening music for title-based refs')

    runtime.selectChoice({ choiceIndex: 1 })
    assertEqual(sceneMusic[sceneMusic.length - 1], 'https://example.com/audio/bridge.mp3', 'switching sections should emit next scene music for title-based refs')
  } finally {
    if (typeof unsubscribe === 'function') unsubscribe()
    runtime.destroy()
  }
}

export async function runRuntimeV2Tests () {
  return runTestSuite('Runtime v2 / Metadata Tests', [
    { name: 'createRuntime factory', fn: testCreateRuntimeFactory },
    { name: 'parse new cinematic/audio metadata', fn: testParseNewPresentationAndAudioMetadata },
    { name: 'reject invalid presentation enum', fn: testParseRejectsInvalidEnum },
    { name: 'reject deprecated @music scene properties', fn: testParseRejectsDeprecatedSceneMusicProperties },
    { name: 'build input choice markup with inline placeholder', fn: testInputChoiceMarkupBuilder },
    { name: 'block input choices without value and store valid input', fn: testInputChoiceRequiresValue },
    { name: 'execute JSON-roundtripped runtime AST safely', fn: testRuntimeHandlesJsonRoundTripAst },
    { name: 'interpolate function templates in example story text', fn: testRuntimeInterpolatesFunctionTemplatesInStoryText },
    { name: 'prevent statement call value leaks in body text', fn: testStatementFunctionCallsDoNotLeakIntoNarrativeText },
    { name: 'expose active timer metadata in view model', fn: testRuntimeExposesActiveTimerMetadataInViewModel },
    { name: 'resolve scene music for title-based scene refs', fn: testSceneMusicResolvesTitleBasedSceneRefs }
  ])
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runRuntimeV2Tests()
    .then(passed => process.exit(passed ? 0 : 1))
    .catch(err => {
      console.error(err)
      process.exit(1)
    })
}
