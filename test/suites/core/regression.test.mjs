/**
 * Regression Tests
 *
 * Ensures backward compatibility - existing features still work correctly
 */

import IFScript from '../../../src/IFScript.mjs'
import versions from '../../../src/constants/versions.mjs'
import { pathToFileURL } from 'url'
import { readFile } from 'fs/promises'
import {
  assert,
  assertEqual,
  assertDefined,
  runTestSuite
} from '../../support/test-utils.mjs'
import SectionRef from '../../../src/models/SectionRef.mjs'
import SceneRef from '../../../src/models/SceneRef.mjs'
import EngineRuntime from '../../../src/runtime/engine/EngineRuntime.mjs'

// ===== Basic Features =====

async function testBasicVariables () {
  const storyText = `section__
  x = 10
  y = 20
  z = x + y
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  assert(parsed !== null, 'Story should parse successfully')
  assert(parsed.sections.length > 0, 'Should have sections')

  const section = parsed.sections[0]
  const assignments = section.text.filter(item => item.type === 'assign')

  assertEqual(assignments.length, 3, 'Should have 3 assignments')
}

async function testBasicConditionals () {
  const storyText = `section__
  x = 10
  if__ (x > 5) {
    y = 1
  }
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  assert(parsed !== null, 'Story should parse successfully')

  const section = parsed.sections[0]
  const conditional = section.text.find(item => item._class === 'ConditionalBlock')

  assertDefined(conditional, 'Should find conditional')
  assertEqual(conditional._class, 'ConditionalBlock', 'Should be ConditionalBlock')
  assert(Array.isArray(conditional.ifBlock), 'Should have ifBlock')
}

async function testIfElse () {
  const storyText = `section__
  x = 10
  if__ (x > 15) {
    y = 1
  } else__ {
    y = 2
  }
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  assert(parsed !== null, 'Story should parse successfully')

  const section = parsed.sections[0]
  const conditional = section.text.find(item => item._class === 'ConditionalBlock')

  assertDefined(conditional, 'Should find conditional')
  assert(Array.isArray(conditional.elseBlock), 'Should have elseBlock')
  assert(conditional.elseBlock.length > 0, 'elseBlock should not be empty')
}

async function testNestedConditionals () {
  const storyText = `section__
  x = 10
  if__ (x > 5) {
    if__ (x < 15) {
      y = 1
    }
  }
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  assert(parsed !== null, 'Story should parse successfully')

  const section = parsed.sections[0]
  const outerConditional = section.text.find(item => item._class === 'ConditionalBlock')

  assertDefined(outerConditional, 'Should find outer conditional')

  const innerConditional = outerConditional.ifBlock.find(item => item._class === 'ConditionalBlock')
  assertDefined(innerConditional, 'Should find inner conditional')
}

async function testBasicChoices () {
  const storyText = `section__
  "Some text"
  choice__
    "Option 1"
    @target 2
  __choice
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  assert(parsed !== null, 'Story should parse successfully')

  const section = parsed.sections[0]
  assertDefined(section.choices, 'Section should have choices')
  assert(Array.isArray(section.choices), 'Choices should be array')
  assert(section.choices.length > 0, 'Should have at least one choice')

  const choice = section.choices[0]
  assertEqual(choice._class, 'Choice', 'Should be Choice model')
}

async function testConditionalChoices () {
  const storyText = `section__
  x = 10
  choice__
    "Option 1"
    @target 2
  __choice
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  assert(parsed !== null, 'Story should parse successfully')

  const section = parsed.sections[0]
  const choice = section.choices[0]

  assertDefined(choice, 'Choice should exist')
  assertDefined(choice.target, 'Choice should have a target')
}

async function testStringInterpolation () {
  const storyText = `section__
  name = "World"
  "Hello, \${name}!"
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  assert(parsed !== null, 'Story should parse successfully')

  const section = parsed.sections[0]

  // Find token with interpolation
  const passage = section.text.find(item =>
    item.type === 'STRING' && item.symbol && item.symbol.includes('${')
  )

  assertDefined(passage, 'Should find passage with interpolation')
}

async function testMultipleSections () {
  const storyText = `section__
  @title "First Section"
  "First section text"
__section

section__
  @title "Second Section"
  "Second section text"
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  assert(parsed !== null, 'Story should parse successfully')
  assertEqual(parsed.sections.length, 2, 'Should have 2 sections')

  assertEqual(parsed.sections[0].title, 'First Section', 'First section title')
  assertEqual(parsed.sections[1].title, 'Second Section', 'Second section title')
}

async function testSettings () {
  const storyText = `settings__
  @storyTitle "Test Story"
  @startAt 1
__settings

section__
  "Test section"
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  assert(parsed !== null, 'Story should parse successfully')
  assertDefined(parsed.settings, 'Should have settings')
  assertEqual(parsed.settings.name, 'Test Story', 'Story title should match')
  assertEqual(parsed.settings.startAt, 1, 'Start section should be 1')
}

async function testStartAtTitleRef () {
  const storyText = `settings__
  @storyTitle "Ref Story"
  @startAt "Entry"
__settings

section__
  @title "Entry"
  "Entry section"
__section

section__
  @title "Exit"
  "Exit section"
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  assertEqual(parsed.settings.startAt, 'Entry', 'Start section title ref should be preserved')
  assertEqual(parsed.findSection(new SectionRef('Entry')).settings.title, 'Entry', 'SectionRef(title) should resolve correctly')
}

async function testFullTimerTitleTargetRef () {
  const storyText = `settings__
  @storyTitle "Timer Ref Story"
  @startAt 1
  @fullTimer 30 "Timeout"
__settings

section__
  @title "Start"
  "Start section"
__section

section__
  @title "Timeout"
  "Timeout section"
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  assertDefined(parsed.settings.fullTimer, 'Full timer should be defined')
  assertEqual(parsed.settings.fullTimer.timer, 30, 'Full timer seconds should match')
  assertEqual(parsed.settings.fullTimer.target, 'Timeout', 'Full timer target should accept section title refs')
}

async function testSceneSectionRefs () {
  const storyText = `scene__
  @name "Chapter One"
  @first "Entry"
  @sections "Entry" 2 "Exit"
__scene

section__
  @title "Entry"
  "Entry section"
__section

section__
  @title "Middle"
  "Middle section"
__section

section__
  @title "Exit"
  "Exit section"
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const scene = parsed.findScene(new SceneRef('Chapter One'))
  assertDefined(scene, 'Scene should resolve by SceneRef(name)')
  assertEqual(scene.first, 'Entry', 'Scene @first should accept section title refs')
  assert(Array.isArray(scene.sections), 'Scene sections should be array')
  assertEqual(scene.sections[0], 'Entry', 'Scene sections should preserve title refs')
  assertEqual(scene.sections[1], 2, 'Scene sections should preserve numeric refs')
}

async function testSectionTimerTargetRef () {
  const storyText = `section__
  @title "Start"
  @timer 15 "Timeout"
  "Start section"
__section

section__
  @title "Timeout"
  "Timeout section"
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const timer = parsed.sections[0].settings.timer
  assertDefined(timer, 'Section timer should be defined')
  assertEqual(timer.timer, 15, 'Section timer seconds should match')
  assertEqual(timer.target, 'Timeout', 'Section timer target should accept section title refs')
}

async function testFullTimerOutcomeTextParse () {
  const storyText = `settings__
  @storyTitle "Timer Outcome Story"
  @startAt 1
  @fullTimer 20 "Timeout"
  @fullTimerOutcome "If you wait too long, destiny intervenes."
__settings

section__
  @title "Start"
  "Start section"
__section

section__
  @title "Timeout"
  "Timeout section"
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  assertEqual(
    parsed.settings.fullTimerOutcome,
    'If you wait too long, destiny intervenes.',
    'Story @fullTimerOutcome should parse as author-defined timer consequence text'
  )
}

async function testSectionTimerOutcomeTextParse () {
  const storyText = `section__
  @title "Start"
  @timer 15 "Timeout"
  @timerOutcome "Wait too long and the door locks behind you."
  "Start section"
__section

section__
  @title "Timeout"
  "Timeout section"
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  assertEqual(
    parsed.sections[0].settings.timerOutcome,
    'Wait too long and the door locks behind you.',
    'Section @timerOutcome should parse as author-defined timer consequence text'
  )
}

async function testStatusBarSettings () {
  const storyText = `settings__
  @storyTitle "Status Config Story"
  @statusBar health
  @statusBar gold false
__settings

section__
  health = 10
  gold = 5
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  assert(parsed !== null, 'Story should parse successfully')
  assertDefined(parsed.stats.health, 'Health stat config should exist')
  assertEqual(parsed.stats.health.showInStatusBar, true, 'Health should be visible')
  assertDefined(parsed.stats.gold, 'Gold stat config should exist')
  assertEqual(parsed.stats.gold.showInStatusBar, false, 'Gold should be hidden')
}

async function testStatusBarPropertyOutsideSettings () {
  const storyText = `@statusBar morale
@statusBar secret false

section__
  morale = 9
  secret = 1
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  assert(parsed !== null, 'Story should parse successfully')
  assertDefined(parsed.stats.morale, 'Morale stat config should exist')
  assertEqual(parsed.stats.morale.showInStatusBar, true, 'Morale should be visible')
  assertDefined(parsed.stats.secret, 'Secret stat config should exist')
  assertEqual(parsed.stats.secret.showInStatusBar, false, 'Secret should be hidden')
}

async function testStatusBarCustomLabels () {
  const storyText = `settings__
  @storyTitle "Status Label Story"
  @statusBar health "Health Points"
  @statusBar gold false "Gold Coins"
__settings

section__
  health = 10
  gold = 5
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  assert(parsed !== null, 'Story should parse successfully')
  assertDefined(parsed.stats.health, 'Health stat config should exist')
  assertEqual(parsed.stats.health.showInStatusBar, true, 'Health should be visible')
  assertEqual(parsed.stats.health.statusBarLabel, 'Health Points', 'Health should use custom status label')
  assertDefined(parsed.stats.gold, 'Gold stat config should exist')
  assertEqual(parsed.stats.gold.showInStatusBar, false, 'Gold should be hidden')
  assertEqual(parsed.stats.gold.statusBarLabel, 'Gold Coins', 'Gold should use custom status label')
}

async function testStatusBarCustomLabelsTopLevelProperty () {
  const storyText = `@statusBar morale "Morale Meter"
@statusBar secret false "Hidden Secret"

section__
  morale = 9
  secret = 1
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  assert(parsed !== null, 'Story should parse successfully')
  assertDefined(parsed.stats.morale, 'Morale stat config should exist')
  assertEqual(parsed.stats.morale.showInStatusBar, true, 'Morale should be visible')
  assertEqual(parsed.stats.morale.statusBarLabel, 'Morale Meter', 'Morale should use custom status label')
  assertDefined(parsed.stats.secret, 'Secret stat config should exist')
  assertEqual(parsed.stats.secret.showInStatusBar, false, 'Secret should be hidden')
  assertEqual(parsed.stats.secret.statusBarLabel, 'Hidden Secret', 'Secret should use custom status label')
}

async function testScenes () {
  const storyText = `settings__
  @storyTitle "Test Story"
  @startAt 1
__settings

scene__
  @title "Chapter 1"
__scene`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  assert(parsed !== null, 'Story should parse successfully')
  assertDefined(parsed.scenes, 'Should have scenes')
  assert(Array.isArray(parsed.scenes), 'Scenes should be array')
  assert(parsed.scenes.length > 0, 'Should have at least one scene')

  const scene = parsed.scenes[0]
  assertEqual(scene.title, 'Chapter 1', 'Scene title should match')
}

async function testSceneMusicRelativePath () {
  const storyText = `scene__
  @name "Chapter One"
  @sceneAmbience "music/theme.mp3"
__scene

section__
  "Start"
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const scene = parsed.scenes[0]
  assertDefined(scene, 'Scene should parse')
  assertEqual(scene.music, 'music/theme.mp3', 'Relative @sceneAmbience paths should be allowed')
}

async function testSceneMusicAbsoluteUrl () {
  const storyText = `scene__
  @name "Chapter One"
  @sceneAmbience "https://example.com/theme.mp3"
__scene

section__
  "Start"
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const scene = parsed.scenes[0]
  assertDefined(scene, 'Scene should parse')
  assertEqual(scene.music, 'https://example.com/theme.mp3', 'Absolute @sceneAmbience URLs should still be allowed')
}

async function testComments () {
  const storyText = `section__
  /* This is a comment */
  x = 10
  /* Another comment */
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  // Comments should be ignored during parsing
  assert(parsed !== null, 'Story should parse successfully')
  assert(parsed.sections.length > 0, 'Should have sections')

  const section = parsed.sections[0]
  const assignment = section.text.find(item => item.type === 'assign')

  assertDefined(assignment, 'Should find assignment (comments ignored)')
}

async function testCommentsPreserveSlashesInString () {
  const storyText = `section__
  "https://example.com/path // not a comment"
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)
  const section = parsed.sections[0]
  const text = section.text.find(item => item.type === 'STRING')

  assertDefined(text, 'Should find story text')
  assertEqual(text.symbol, 'https://example.com/path // not a comment', 'Should preserve // inside string')
}

async function testCommentsPreserveArrowsInString () {
  const storyText = `section__
  "Keep >> and << as-is"
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)
  const section = parsed.sections[0]
  const text = section.text.find(item => item.type === 'STRING')

  assertDefined(text, 'Should find story text')
  assertEqual(text.symbol, 'Keep >> and << as-is', 'Should preserve >> and << inside string')
}

async function testLineCommentsStillIgnored () {
  const storyText = `section__
  x = 10 // this should be ignored
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)
  const section = parsed.sections[0]
  const assignment = section.text.find(item => item.type === 'assign')

  assertDefined(assignment, 'Should parse assignment before // comment')
  assertEqual(assignment.left.symbol, 'x', 'Assignment target should remain correct')
}

async function testBooleanOperators () {
  const storyText = `section__
  a = true
  b = false
  c = a && b
  d = a || b
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  assert(parsed !== null, 'Story should parse successfully')

  const section = parsed.sections[0]
  const assignments = section.text.filter(item => item.type === 'assign')

  assert(assignments.length >= 4, 'Should have at least 4 assignments')

  // Check logical AND
  const andAssignment = assignments.find(item => item.left.symbol === 'c')
  assertDefined(andAssignment, 'Should find AND assignment')
  assertEqual(andAssignment.right.operator, '&&', 'Should be AND operator')

  // Check logical OR
  const orAssignment = assignments.find(item => item.left.symbol === 'd')
  assertDefined(orAssignment, 'Should find OR assignment')
  assertEqual(orAssignment.right.operator, '||', 'Should be OR operator')
}

async function testArithmeticOperators () {
  const storyText = `section__
  a = 10 + 5
  b = 10 - 5
  c = 10 * 5
  d = 10 / 5
  e = 10 % 3
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  assert(parsed !== null, 'Story should parse successfully')

  const section = parsed.sections[0]
  const assignments = section.text.filter(item => item.type === 'assign')

  assertEqual(assignments.length, 5, 'Should have 5 assignments')

  const operators = assignments.map(a => a.right.operator)
  assert(operators.includes('+'), 'Should have addition')
  assert(operators.includes('-'), 'Should have subtraction')
  assert(operators.includes('*'), 'Should have multiplication')
  assert(operators.includes('/'), 'Should have division')
  assert(operators.includes('%'), 'Should have modulo')
}

async function testComparisonOperators () {
  const storyText = `section__
  a = 10 > 5
  b = 10 < 5
  c = 10 >= 5
  d = 10 <= 5
  e = 10 == 5
  f = 10 != 5
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  assert(parsed !== null, 'Story should parse successfully')

  const section = parsed.sections[0]
  const assignments = section.text.filter(item => item.type === 'assign')

  assertEqual(assignments.length, 6, 'Should have 6 assignments')

  const operators = assignments.map(a => a.right.operator)
  assert(operators.includes('>'), 'Should have greater than')
  assert(operators.includes('<'), 'Should have less than')
  assert(operators.includes('>='), 'Should have greater or equal')
  assert(operators.includes('<='), 'Should have less or equal')
  assert(operators.includes('=='), 'Should have equality')
  assert(operators.includes('!='), 'Should have inequality')
}

async function testUnaryOperatorsParse () {
  const storyText = `section__
  a = -10
  b = !false
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)
  const section = parsed.sections[0]
  const assignments = section.text.filter(item => item.type === 'assign')

  const unaryMinus = assignments.find(item => item.left.symbol === 'a')?.right
  const unaryNot = assignments.find(item => item.left.symbol === 'b')?.right

  assertDefined(unaryMinus, 'Unary minus assignment should exist')
  assertDefined(unaryNot, 'Unary not assignment should exist')
  assertEqual(unaryMinus.type, 'unary', 'Unary minus should parse as unary action')
  assertEqual(unaryMinus.operator, '-', 'Unary minus operator should be "-"')
  assertEqual(unaryNot.type, 'unary', 'Unary not should parse as unary action')
  assertEqual(unaryNot.operator, '!', 'Unary not operator should be "!"')
}

async function testUnaryOperatorsRuntime () {
  const storyText = `section__
  a = -10
  b = !false
  c = !0
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const runtime = new EngineRuntime(null)
  runtime.start(parsed, { resume: false })

  assertEqual(runtime.run.state.variables.a, -10, 'Unary minus should evaluate to negative number')
  assertEqual(runtime.run.state.variables.b, true, 'Unary !false should evaluate to true')
  assertEqual(runtime.run.state.variables.c, true, 'Unary !0 should evaluate to true')
  runtime.destroy()
}

async function testChoiceErgonomicsPropertiesParse () {
  const storyText = `section__
  @title "Start"
  gold = 10
  choice__
    @target "Next"
    @when gold >= 50
    @once true
    @disabledText "Need 50 gold"
    "Buy sword"
  __choice
__section

section__
  @title "Next"
  "Done"
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)
  const choice = parsed.sections[0].choices[0]

  assertDefined(choice, 'Choice should exist')
  assertDefined(choice.when, 'Choice @when expression should parse')
  assertEqual(choice.once, true, '@once should parse to boolean true')
  assertEqual(choice.disabledText, 'Need 50 gold', '@disabledText should parse as string')
}

async function testStoryUxSettingsParse () {
  const storyText = `settings__
  @storyTitle "UX Story"
  @startAt 1
  @theme "literary-default"
  @allowUndo false
  @showTurn false
  @animations false
  @autoSave true
__settings

section__
  "Start"
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  assertEqual(parsed.settings.theme, 'literary-default', '@theme should parse')
  assertEqual(parsed.settings.allowUndo, false, '@allowUndo should parse')
  assertEqual(parsed.settings.showTurn, false, '@showTurn should parse')
  assertEqual(parsed.settings.animations, false, '@animations should parse')
  assertEqual(parsed.settings.autoSave, true, '@autoSave should parse')
}

async function testWriterModeMinimalSectionParse () {
  const storyText = `section "Village"
  "Welcome"
  -> "Go" => "End"
end

section__
  @title "End"
  "Done"
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  assertEqual(parsed.sections.length, 2, 'Should parse writer mode and legacy sections together')
  assertEqual(parsed.sections[0].settings.title, 'Village', 'Writer section title should be set')
  assertEqual(parsed.sections[0].choices.length, 1, 'Writer arrow choice should parse')
  assertEqual(parsed.sections[0].choices[0].target, 'End', 'Writer arrow target should parse')
}

async function testWriterModeSceneTargetParse () {
  const storyText = `section "Start"
  -> "Open chapter" => scene "Chapter One"
end

scene__
  @name "Chapter One"
  @first "End"
__scene

section__
  @title "End"
  "Done"
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const choice = parsed.sections[0].choices[0]
  assertEqual(choice.targetType, 'scene', 'Writer scene target should set targetType=scene')
  assertEqual(choice.target, 'Chapter One', 'Writer scene target should preserve scene name')
}

// ===== Test Existing Example Files =====

async function testArraysExampleFile () {
  try {
    const content = await readFile('test/fixtures/stories/arrays-test.if', 'utf-8')
    const ifScript = new IFScript(versions.STREAM)
    await ifScript.init()
    const parsed = await ifScript.parse(content, 'test/fixtures/stories/arrays-test.if')

    assert(parsed !== null, 'arrays-test.if should parse successfully')
    assert(parsed.sections.length > 0, 'Should have sections')
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('  ⚠ arrays-test.if not found, skipping')
    } else {
      throw error
    }
  }
}

async function testLoopsExampleFile () {
  try {
    const content = await readFile('test/fixtures/stories/loops-test.if', 'utf-8')
    const ifScript = new IFScript(versions.STREAM)
    await ifScript.init()
    const parsed = await ifScript.parse(content, 'test/fixtures/stories/loops-test.if')

    assert(parsed !== null, 'loops-test.if should parse successfully')
    assert(parsed.sections.length > 0, 'Should have sections')
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('  ⚠ loops-test.if not found, skipping')
    } else {
      throw error
    }
  }
}

async function testFunctionsExampleFile () {
  try {
    const content = await readFile('test/fixtures/stories/functions-test.if', 'utf-8')
    const ifScript = new IFScript(versions.STREAM)
    await ifScript.init()
    const parsed = await ifScript.parse(content, 'test/fixtures/stories/functions-test.if')

    assert(parsed !== null, 'functions-test.if should parse successfully')
    assert(parsed.sections.length > 0, 'Should have sections')
    assert(parsed.functions.length > 0, 'Should have functions')
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('  ⚠ functions-test.if not found, skipping')
    } else {
      throw error
    }
  }
}

async function testTuringCompleteExampleFile () {
  try {
    const content = await readFile('test/fixtures/stories/turing-complete-test.if', 'utf-8')
    const ifScript = new IFScript(versions.STREAM)
    await ifScript.init()
    const parsed = await ifScript.parse(content, 'test/fixtures/stories/turing-complete-test.if')

    assert(parsed !== null, 'turing-complete-test.if should parse successfully')
    assert(parsed.sections.length > 0, 'Should have sections')
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('  ⚠ turing-complete-test.if not found, skipping')
    } else {
      throw error
    }
  }
}

// ===== Run Test Suite =====

export async function runRegressionTests () {
  const tests = [
    { name: 'Basic: Variables', fn: testBasicVariables },
    { name: 'Basic: Conditionals', fn: testBasicConditionals },
    { name: 'Basic: If-else', fn: testIfElse },
    { name: 'Basic: Nested conditionals', fn: testNestedConditionals },
    { name: 'Basic: Choices', fn: testBasicChoices },
    { name: 'Basic: Conditional choices', fn: testConditionalChoices },
    { name: 'Basic: String interpolation', fn: testStringInterpolation },
    { name: 'Basic: Multiple sections', fn: testMultipleSections },
    { name: 'Basic: Settings', fn: testSettings },
    { name: 'Refs: @startAt title', fn: testStartAtTitleRef },
    { name: 'Refs: @fullTimer target title', fn: testFullTimerTitleTargetRef },
    { name: 'Refs: Scene first/sections', fn: testSceneSectionRefs },
    { name: 'Refs: Section timer target', fn: testSectionTimerTargetRef },
    { name: 'Refs: @fullTimer outcome text', fn: testFullTimerOutcomeTextParse },
    { name: 'Refs: Section timer outcome text', fn: testSectionTimerOutcomeTextParse },
    { name: 'Basic: Status bar settings', fn: testStatusBarSettings },
    { name: 'Basic: Status bar top-level property', fn: testStatusBarPropertyOutsideSettings },
    { name: 'Basic: Status bar custom labels', fn: testStatusBarCustomLabels },
    { name: 'Basic: Status bar custom labels top-level property', fn: testStatusBarCustomLabelsTopLevelProperty },
    { name: 'Basic: Scenes', fn: testScenes },
    { name: 'Basic: Scene music relative path', fn: testSceneMusicRelativePath },
    { name: 'Basic: Scene music absolute URL', fn: testSceneMusicAbsoluteUrl },
    { name: 'Basic: Comments', fn: testComments },
    { name: 'Basic: Preserve // in strings', fn: testCommentsPreserveSlashesInString },
    { name: 'Basic: Preserve >> and << in strings', fn: testCommentsPreserveArrowsInString },
    { name: 'Basic: // comments still ignored', fn: testLineCommentsStillIgnored },
    { name: 'Operators: Boolean (&&, ||, !)', fn: testBooleanOperators },
    { name: 'Operators: Arithmetic (+, -, *, /, %)', fn: testArithmeticOperators },
    { name: 'Operators: Comparison (>, <, ==, !=)', fn: testComparisonOperators },
    { name: 'Operators: Unary parse (-, !)', fn: testUnaryOperatorsParse },
    { name: 'Operators: Unary runtime (-, !)', fn: testUnaryOperatorsRuntime },
    { name: 'Choices: @when/@once/@disabledText parse', fn: testChoiceErgonomicsPropertiesParse },
    { name: 'Settings: theme/undo/turn/animations/autosave parse', fn: testStoryUxSettingsParse },
    { name: 'Writer mode: section + arrow choice', fn: testWriterModeMinimalSectionParse },
    { name: 'Writer mode: scene arrow target', fn: testWriterModeSceneTargetParse },
    { name: 'Example files: arrays-test.if', fn: testArraysExampleFile },
    { name: 'Example files: loops-test.if', fn: testLoopsExampleFile },
    { name: 'Example files: functions-test.if', fn: testFunctionsExampleFile },
    { name: 'Example files: turing-complete-test.if', fn: testTuringCompleteExampleFile }
  ]

  return await runTestSuite('Regression Tests (Backward Compatibility)', tests)
}

// Run if executed directly
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runRegressionTests().then(passed => {
    process.exit(passed ? 0 : 1)
  })
}
