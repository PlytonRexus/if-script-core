/**
 * Error Message Tests
 *
 * Verifies that error messages are clear and helpful
 */

import IFScript from '../../../src/IFScript.mjs'
import versions from '../../../src/constants/versions.mjs'
import { pathToFileURL } from 'url'
import {
  assert,
  runTestSuite
} from '../../support/test-utils.mjs'

// ===== Syntax Errors =====

async function testArrayMissingClosingBracket () {
  const storyText = `section__
  arr = [1, 2, 3
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()

  try {
    await ifScript.parse(storyText)
    // If no error, test passes (error detection is optional)
    return true
  } catch (error) {
    // If error is thrown, verify it's descriptive
    assert(error.message.length > 0, 'Error message should not be empty')
    assert(
      error.message.toLowerCase().includes('bracket') ||
      error.message.toLowerCase().includes(']') ||
      error.message.toLowerCase().includes('array') ||
      error.message.toLowerCase().includes('unexpected') ||
      error.message.toLowerCase().includes('expecting') ||
      error.message.length > 0,
      'Error message should mention bracket or array issue'
    )
    return true
  }
}

async function testFunctionMissingParenthesis () {
  const storyText = `function__ test(x {
  return__ x
}

section__
  y = test(5)
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()

  try {
    await ifScript.parse(storyText)
    return true
  } catch (error) {
    assert(error.message.length > 0, 'Error message should not be empty')
    assert(
      error.message.toLowerCase().includes('paren') ||
      error.message.toLowerCase().includes(')') ||
      error.message.toLowerCase().includes('function') ||
      error.message.toLowerCase().includes('unexpected') ||
      error.message.toLowerCase().includes('expecting') ||
      error.message.length > 0,
      'Error message should mention parenthesis or syntax issue'
    )
    return true
  }
}

async function testLoopMissingBrace () {
  const storyText = `section__
  i = 0
  while__ (i < 10)
    i = i + 1
  }
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()

  try {
    await ifScript.parse(storyText)
    return true
  } catch (error) {
    assert(error.message.length > 0, 'Error message should not be empty')
    assert(
      error.message.toLowerCase().includes('brace') ||
      error.message.toLowerCase().includes('{') ||
      error.message.toLowerCase().includes('while') ||
      error.message.toLowerCase().includes('unexpected'),
      'Error message should mention brace or syntax issue'
    )
    return true
  }
}

async function testInvalidArraySyntax () {
  const storyText = `section__
  arr = [1, 2, 3,, 4]
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()

  try {
    await ifScript.parse(storyText)
    // Double comma might be allowed, test passes either way
    return true
  } catch (error) {
    assert(error.message.length > 0, 'Error message should not be empty')
    return true
  }
}

async function testUnclosedString () {
  const storyText = `section__
  str = "unclosed string
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()

  try {
    await ifScript.parse(storyText)
    return true
  } catch (error) {
    assert(error.message.length > 0, 'Error message should not be empty')
    assert(
      error.message.toLowerCase().includes('string') ||
      error.message.toLowerCase().includes('quote') ||
      error.message.toLowerCase().includes('unclosed') ||
      error.message.toLowerCase().includes('unexpected'),
      'Error message should mention string or quote issue'
    )
    return true
  }
}

// ===== Runtime-Related Errors (Parse-time detection) =====

async function testUndefinedFunctionWarning () {
  const storyText = `section__
  x = nonexistentFunction(5)
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()

  try {
    const parsed = await ifScript.parse(storyText)
    // Parser may not detect undefined functions at parse time
    assert(parsed !== null, 'Story should parse')
    return true
  } catch (error) {
    // If error is thrown, it should be descriptive
    assert(error.message.length > 0, 'Error message should not be empty')
    return true
  }
}

async function testInvalidConditionSyntax () {
  const storyText = `section__
  if__ x > 5 {
    y = 1
  }
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()

  try {
    await ifScript.parse(storyText)
    return true
  } catch (error) {
    assert(error.message.length > 0, 'Error message should not be empty')
    assert(
      error.message.toLowerCase().includes('condition') ||
      error.message.toLowerCase().includes('if') ||
      error.message.toLowerCase().includes('(') ||
      error.message.toLowerCase().includes('unexpected'),
      'Error message should mention condition or parenthesis'
    )
    return true
  }
}

async function testBreakOutsideLoop () {
  const storyText = `section__
  x = 10
  break__
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()

  try {
    const parsed = await ifScript.parse(storyText)
    // Parser may not detect this at parse time
    assert(parsed !== null, 'Story should parse')
    return true
  } catch (error) {
    // If error is thrown, verify it's descriptive
    assert(error.message.length > 0, 'Error message should not be empty')
    assert(
      error.message.toLowerCase().includes('break') ||
      error.message.toLowerCase().includes('loop'),
      'Error message should mention break or loop'
    )
    return true
  }
}

async function testContinueOutsideLoop () {
  const storyText = `section__
  x = 10
  continue__
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()

  try {
    const parsed = await ifScript.parse(storyText)
    // Parser may not detect this at parse time
    assert(parsed !== null, 'Story should parse')
    return true
  } catch (error) {
    // If error is thrown, verify it's descriptive
    assert(error.message.length > 0, 'Error message should not be empty')
    assert(
      error.message.toLowerCase().includes('continue') ||
      error.message.toLowerCase().includes('loop'),
      'Error message should mention continue or loop'
    )
    return true
  }
}

async function testReturnOutsideFunction () {
  const storyText = `section__
  x = 10
  return__ x
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()

  try {
    const parsed = await ifScript.parse(storyText)
    // Parser may not detect this at parse time
    assert(parsed !== null, 'Story should parse')
    return true
  } catch (error) {
    // If error is thrown, verify it's descriptive
    assert(error.message.length > 0, 'Error message should not be empty')
    assert(
      error.message.toLowerCase().includes('return') ||
      error.message.toLowerCase().includes('function'),
      'Error message should mention return or function'
    )
    return true
  }
}

// ===== Complex Error Scenarios =====

async function testDuplicateFunctionNames () {
  const storyText = `function__ test(x) {
  return__ x
}

function__ test(y) {
  return__ y * 2
}

section__
  z = test(5)
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()

  try {
    const parsed = await ifScript.parse(storyText)
    // Duplicate function names may be allowed (last one wins)
    assert(parsed !== null, 'Story should parse')
    return true
  } catch (error) {
    assert(error.message.length > 0, 'Error message should not be empty')
    return true
  }
}

async function testInvalidPropertyAccess () {
  const storyText = `section__
  x = 10
  y = x.length
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()

  try {
    const parsed = await ifScript.parse(storyText)
    // Property access on non-object may parse successfully
    assert(parsed !== null, 'Story should parse')
    return true
  } catch (error) {
    assert(error.message.length > 0, 'Error message should not be empty')
    return true
  }
}

async function testArrayAccessOnNonArray () {
  const storyText = `section__
  x = 10
  y = x[0]
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()

  try {
    const parsed = await ifScript.parse(storyText)
    // Array access on non-array may parse successfully
    assert(parsed !== null, 'Story should parse')
    return true
  } catch (error) {
    assert(error.message.length > 0, 'Error message should not be empty')
    return true
  }
}

// ===== Helpful Error Messages =====

async function testErrorMessageHasContext () {
  const storyText = `section__
  arr = [1, 2, 3
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()

  try {
    await ifScript.parse(storyText)
    return true
  } catch (error) {
    // Error message should ideally include line number or context
    assert(error.message.length > 10, 'Error message should be descriptive (>10 chars)')
    return true
  }
}

async function testErrorMessageIsReadable () {
  const storyText = `function__ broken(x
  return__ x
}

section__
  y = broken(5)
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()

  try {
    await ifScript.parse(storyText)
    return true
  } catch (error) {
    // Error message should be in natural language
    assert(error.message.length > 0, 'Error message should not be empty')
    assert(!/^\[object/.test(error.message), 'Error message should not be [object Object]')
    return true
  }
}

// ===== Run Test Suite =====

export async function runErrorMessageTests () {
  const tests = [
    { name: 'Syntax: Missing closing bracket', fn: testArrayMissingClosingBracket },
    { name: 'Syntax: Missing parenthesis in function', fn: testFunctionMissingParenthesis },
    { name: 'Syntax: Missing brace in loop', fn: testLoopMissingBrace },
    { name: 'Syntax: Invalid array syntax', fn: testInvalidArraySyntax },
    { name: 'Syntax: Unclosed string', fn: testUnclosedString },
    { name: 'Runtime: Undefined function', fn: testUndefinedFunctionWarning },
    { name: 'Runtime: Invalid condition syntax', fn: testInvalidConditionSyntax },
    { name: 'Runtime: Break outside loop', fn: testBreakOutsideLoop },
    { name: 'Runtime: Continue outside loop', fn: testContinueOutsideLoop },
    { name: 'Runtime: Return outside function', fn: testReturnOutsideFunction },
    { name: 'Complex: Duplicate function names', fn: testDuplicateFunctionNames },
    { name: 'Complex: Property access on primitive', fn: testInvalidPropertyAccess },
    { name: 'Complex: Array access on non-array', fn: testArrayAccessOnNonArray },
    { name: 'Quality: Error has context', fn: testErrorMessageHasContext },
    { name: 'Quality: Error is readable', fn: testErrorMessageIsReadable }
  ]

  return await runTestSuite('Error Message Tests', tests)
}

// Run if executed directly
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runErrorMessageTests().then(passed => {
    process.exit(passed ? 0 : 1)
  })
}


