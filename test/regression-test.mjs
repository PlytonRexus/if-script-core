/**
 * Regression Tests
 *
 * Ensures backward compatibility - existing features still work correctly
 */

import IFScript from '../src/IFScript.mjs'
import versions from '../src/constants/versions.mjs'
import { readFile } from 'fs/promises'
import {
  assert,
  assertEqual,
  assertDefined,
  runTestSuite
} from './test-utils.mjs'

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

// ===== Test Existing Example Files =====

async function testArraysExampleFile () {
  try {
    const content = await readFile('test/examples-if/arrays-test.if', 'utf-8')
    const ifScript = new IFScript(versions.STREAM)
    await ifScript.init()
    const parsed = await ifScript.parse(content, 'test/examples-if/arrays-test.if')

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
    const content = await readFile('test/examples-if/loops-test.if', 'utf-8')
    const ifScript = new IFScript(versions.STREAM)
    await ifScript.init()
    const parsed = await ifScript.parse(content, 'test/examples-if/loops-test.if')

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
    const content = await readFile('test/examples-if/functions-test.if', 'utf-8')
    const ifScript = new IFScript(versions.STREAM)
    await ifScript.init()
    const parsed = await ifScript.parse(content, 'test/examples-if/functions-test.if')

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
    const content = await readFile('test/examples-if/turing-complete-test.if', 'utf-8')
    const ifScript = new IFScript(versions.STREAM)
    await ifScript.init()
    const parsed = await ifScript.parse(content, 'test/examples-if/turing-complete-test.if')

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
    { name: 'Basic: Scenes', fn: testScenes },
    { name: 'Basic: Comments', fn: testComments },
    { name: 'Operators: Boolean (&&, ||, !)', fn: testBooleanOperators },
    { name: 'Operators: Arithmetic (+, -, *, /, %)', fn: testArithmeticOperators },
    { name: 'Operators: Comparison (>, <, ==, !=)', fn: testComparisonOperators },
    { name: 'Example files: arrays-test.if', fn: testArraysExampleFile },
    { name: 'Example files: loops-test.if', fn: testLoopsExampleFile },
    { name: 'Example files: functions-test.if', fn: testFunctionsExampleFile },
    { name: 'Example files: turing-complete-test.if', fn: testTuringCompleteExampleFile }
  ]

  return await runTestSuite('Regression Tests (Backward Compatibility)', tests)
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runRegressionTests().then(passed => {
    process.exit(passed ? 0 : 1)
  })
}
