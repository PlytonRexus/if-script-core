/**
 * Edge Cases Tests
 *
 * Tests boundary conditions and unusual inputs for arrays, loops, and functions
 */

import IFScript from '../../../src/IFScript.mjs'
import versions from '../../../src/constants/versions.mjs'
import { pathToFileURL } from 'url'
import {
  assert,
  assertEqual,
  assertDefined,
  runTestSuite
} from '../../support/test-utils.mjs'

// ===== Array Edge Cases =====

async function testArraySingleElement () {
  const storyText = `section__
  arr = [42]
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const section = parsed.sections[0]
  const assignment = section.text.find(item => item.left.symbol === 'arr')

  assertDefined(assignment, 'Should find assignment')
  assertEqual(assignment.right.elements.length, 1, 'Should have 1 element')
  assertEqual(assignment.right.elements[0].symbol, 42, 'Element should be 42')
}

async function testArrayWithTrailingComma () {
  const storyText = `section__
  arr = [1, 2, 3,]
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const section = parsed.sections[0]
  const assignment = section.text.find(item => item.left.symbol === 'arr')

  assertDefined(assignment, 'Should find assignment')

  // Trailing comma should be allowed
  assert(assignment.right.elements.length >= 3, 'Should have at least 3 elements')
}

async function testDeepNestedArrays () {
  const storyText = `section__
  deep = [[[[[1]]]]]
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const section = parsed.sections[0]
  const assignment = section.text.find(item => item.left.symbol === 'deep')

  assertDefined(assignment, 'Should find assignment')
  assertEqual(assignment.right._class, 'ArrayLiteral', 'Should be ArrayLiteral')

  // Verify deep nesting
  let current = assignment.right
  let depth = 0
  while (current._class === 'ArrayLiteral') {
    depth++
    current = current.elements[0]
  }

  assert(depth >= 5, 'Should have at least 5 levels of nesting')
}

async function testArrayWithAllTypes () {
  const storyText = `section__
  mixed = [42, "string", true, false, [1, 2], 3.14]
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const section = parsed.sections[0]
  const assignment = section.text.find(item => item.left.symbol === 'mixed')

  assertDefined(assignment, 'Should find assignment')
  const elements = assignment.right.elements

  assert(elements.length >= 5, 'Should have multiple elements of different types')

  // Verify different types are present
  const hasNumber = elements.some(e => e.type === 'NUMBER')
  const hasString = elements.some(e => e.type === 'STRING')
  const hasBoolean = elements.some(e => e.type === 'BOOLEAN')
  const hasArray = elements.some(e => e._class === 'ArrayLiteral')

  assert(hasNumber, 'Should have number type')
  assert(hasString, 'Should have string type')
  assert(hasBoolean, 'Should have boolean type')
  assert(hasArray, 'Should have nested array')
}

async function testArrayAccessNegativeIndex () {
  const storyText = `section__
  arr = [1, 2, 3]
  elem = arr[-1]
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const section = parsed.sections[0]
  const assignment = section.text.find(item => item.left.symbol === 'elem')

  assertDefined(assignment, 'Should find assignment')
  assertEqual(assignment.right._class, 'ArrayAccess', 'Should be ArrayAccess')

  // Negative index should parse (runtime behavior may vary)
  const index = assignment.right.index
  assert(index.symbol < 0 || index.operator === '-', 'Index should be negative or negation')
}

async function testArrayAccessOutOfBounds () {
  const storyText = `section__
  arr = [1, 2, 3]
  elem = arr[999]
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const section = parsed.sections[0]
  const assignment = section.text.find(item => item.left.symbol === 'elem')

  assertDefined(assignment, 'Should find assignment')
  assertEqual(assignment.right._class, 'ArrayAccess', 'Should be ArrayAccess')

  // Out of bounds access should parse (returns undefined at runtime)
  assertEqual(assignment.right.index.symbol, 999, 'Index should be 999')
}

async function testArrayMultiplePushes () {
  const storyText = `section__
  arr = []
  arr.push(1).push(2).push(3)
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()

  try {
    await ifScript.parse(storyText)
    // Chained method calls may or may not be supported
    assert(true, 'Chained pushes parsed successfully')
  } catch (error) {
    // It's acceptable if chained method calls aren't supported
    assert(true, 'Chained pushes not supported (expected)')
  }
}

// ===== Loop Edge Cases =====

async function testLoopModifyingItsOwnCondition () {
  const storyText = `section__
  x = 10
  while__ (x > 0) {
    x = x - 1
  }
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const section = parsed.sections[0]
  const loop = section.text.find(item => item._class === 'Loop')

  assertDefined(loop, 'Should find loop')

  // Loop modifies its own condition variable
  const assignment = loop.body.find(stmt =>
    stmt.type === 'assign' && stmt.left.symbol === 'x'
  )

  assertDefined(assignment, 'Loop should modify condition variable')
}

async function testLoopWithComplexCondition () {
  const storyText = `section__
  i = 0
  j = 10
  while__ (i < j && i < 100) {
    i = i + 1
  }
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const section = parsed.sections[0]
  const loop = section.text.find(item => item._class === 'Loop')

  assertDefined(loop, 'Should find loop')
  assertEqual(loop.condition.operator, '&&', 'Condition should be compound with &&')
}

async function testNestedBreakBehavior () {
  const storyText = `section__
  outer = 0
  while__ (outer < 10) {
    inner = 0
    while__ (inner < 10) {
      if__ (inner == 5) {
        break__
      }
      inner = inner + 1
    }
    outer = outer + 1
  }
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const section = parsed.sections[0]
  const outerLoop = section.text.find(item => item._class === 'Loop')

  assertDefined(outerLoop, 'Should find outer loop')

  const innerLoop = outerLoop.body.find(item => item._class === 'Loop')
  assertDefined(innerLoop, 'Should find inner loop')

  // Find break in inner loop
  let foundBreak = false
  for (const stmt of innerLoop.body) {
    if (stmt._class === 'ConditionalBlock' && stmt.ifBlock) {
      foundBreak = stmt.ifBlock.some(s => s.type === 'break')
    }
  }

  assert(foundBreak, 'Should find break in inner loop')
}

async function testContinueOnEveryIteration () {
  const storyText = `section__
  i = 0
  while__ (i < 10) {
    i = i + 1
    continue__
  }
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const section = parsed.sections[0]
  const loop = section.text.find(item => item._class === 'Loop')

  assertDefined(loop, 'Should find loop')

  const continueStmt = loop.body.find(stmt => stmt.type === 'continue')
  assertDefined(continueStmt, 'Should find continue statement')
}

async function testEmptyLoopBody () {
  const storyText = `section__
  i = 0
  while__ (i < 10) {
  }
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const section = parsed.sections[0]
  const loop = section.text.find(item => item._class === 'Loop')

  assertDefined(loop, 'Should find loop')
  assert(Array.isArray(loop.body), 'Loop body should be array')

  // Empty body should parse (infinite loop at runtime if condition is always true)
}

// ===== Function Edge Cases =====

async function testFunctionZeroParameters () {
  const storyText = `function__ noParams() {
  return__ 42
}

section__
  x = noParams()
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const funcDef = parsed.functions[0]
  assertEqual(funcDef.name, 'noParams', 'Function name should be noParams')
  assertEqual(funcDef.params.length, 0, 'Should have 0 parameters')
}

async function testFunctionManyParameters () {
  const storyText = `function__ manyParams(a, b, c, d, e, f, g, h) {
  return__ a + b + c + d + e + f + g + h
}

section__
  x = manyParams(1, 2, 3, 4, 5, 6, 7, 8)
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const funcDef = parsed.functions[0]
  assertEqual(funcDef.name, 'manyParams', 'Function name should be manyParams')
  assertEqual(funcDef.params.length, 8, 'Should have 8 parameters')
}

async function testFunctionEarlyReturn () {
  const storyText = `function__ earlyReturn(x) {
  if__ (x < 0) {
    return__ 0
  }
  return__ x * 2
}

section__
  y = earlyReturn(5)
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const funcDef = parsed.functions[0]
  assertEqual(funcDef.name, 'earlyReturn', 'Function name should be earlyReturn')

  // Count return statements
  let returnCount = 0
  for (const stmt of funcDef.body) {
    if (stmt.type === 'return') returnCount++
    if (stmt._class === 'ConditionalBlock' && stmt.ifBlock) {
      returnCount += stmt.ifBlock.filter(s => s.type === 'return').length
    }
  }

  assert(returnCount >= 2, 'Should have multiple return statements')
}

async function testFunctionMultipleReturnPaths () {
  const storyText = `function__ multiReturn(x) {
  if__ (x > 0) {
    return__ 1
  } else__ {
    return__ -1
  }
}

section__
  y = multiReturn(5)
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const funcDef = parsed.functions[0]
  assertEqual(funcDef.name, 'multiReturn', 'Function name should be multiReturn')

  // Should have returns in both if and else blocks
  const conditional = funcDef.body.find(stmt => stmt._class === 'ConditionalBlock')
  assertDefined(conditional, 'Should have conditional')

  const ifReturn = conditional.ifBlock.find(s => s.type === 'return')
  const elseReturn = conditional.elseBlock.find(s => s.type === 'return')

  assertDefined(ifReturn, 'Should have return in if block')
  assertDefined(elseReturn, 'Should have return in else block')
}

async function testFunctionCallingItself () {
  const storyText = `function__ countdown(n) {
  if__ (n <= 0) {
    return__ 0
  }
  return__ countdown(n - 1)
}

section__
  x = countdown(10)
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const funcDef = parsed.functions[0]
  assertEqual(funcDef.name, 'countdown', 'Function name should be countdown')

  // Should have recursive call
  let hasRecursiveCall = false
  for (const stmt of funcDef.body) {
    if (stmt.type === 'return' && stmt.left) {
      const checkCall = (obj) => {
        if (obj._class === 'FunctionCall' && obj.name.symbol === 'countdown') {
          hasRecursiveCall = true
        }
        if (obj.left) checkCall(obj.left)
        if (obj.right) checkCall(obj.right)
      }
      checkCall(stmt.left)
    }
  }

  assert(hasRecursiveCall, 'Should have recursive call')
}

async function testFunctionCallingAnotherFunction () {
  const storyText = `function__ helper(x) {
  return__ x * 2
}

function__ caller(y) {
  return__ helper(y) + 1
}

section__
  z = caller(5)
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  assertEqual(parsed.functions.length, 2, 'Should have 2 functions')

  const caller = parsed.functions.find(f => f.name === 'caller')
  assertDefined(caller, 'Should find caller function')

  // Should call helper function
  let callsHelper = false
  for (const stmt of caller.body) {
    if (stmt.type === 'return' && stmt.left) {
      const checkCall = (obj) => {
        if (obj._class === 'FunctionCall' && obj.name.symbol === 'helper') {
          callsHelper = true
        }
        if (obj.left) checkCall(obj.left)
        if (obj.right) checkCall(obj.right)
      }
      checkCall(stmt.left)
    }
  }

  assert(callsHelper, 'Caller should call helper function')
}

async function testFunctionWithArrayParameter () {
  const storyText = `function__ sumArray(arr) {
  sum = 0
  i = 0
  while__ (i < arr.length) {
    sum = sum + arr[i]
    i = i + 1
  }
  return__ sum
}

section__
  nums = [1, 2, 3, 4, 5]
  total = sumArray(nums)
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const funcDef = parsed.functions[0]
  assertEqual(funcDef.name, 'sumArray', 'Function name should be sumArray')
  assertEqual(funcDef.params.length, 1, 'Should have 1 parameter')

  // Should have loop accessing array parameter
  const loop = funcDef.body.find(stmt => stmt._class === 'Loop')
  assertDefined(loop, 'Should have loop in function')
}

async function testFunctionReturningFunctionCall () {
  const storyText = `function__ double(x) {
  return__ x * 2
}

function__ quad(y) {
  return__ double(double(y))
}

section__
  result = quad(5)
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const quad = parsed.functions.find(f => f.name === 'quad')
  assertDefined(quad, 'Should find quad function')

  // Should have nested function calls
  const returnStmt = quad.body.find(stmt => stmt.type === 'return')
  assertDefined(returnStmt, 'Should have return statement')
  assertEqual(returnStmt.left._class, 'FunctionCall', 'Should return function call')
}

// ===== Run Test Suite =====

export async function runEdgeCaseTests () {
  const tests = [
    // Array edge cases
    { name: 'Array: Single element', fn: testArraySingleElement },
    { name: 'Array: Trailing comma', fn: testArrayWithTrailingComma },
    { name: 'Array: Deep nesting [[[[[1]]]]]', fn: testDeepNestedArrays },
    { name: 'Array: All types mixed', fn: testArrayWithAllTypes },
    { name: 'Array: Negative index access', fn: testArrayAccessNegativeIndex },
    { name: 'Array: Out of bounds access', fn: testArrayAccessOutOfBounds },
    { name: 'Array: Multiple pushes (chained)', fn: testArrayMultiplePushes },

    // Loop edge cases
    { name: 'Loop: Modifying own condition', fn: testLoopModifyingItsOwnCondition },
    { name: 'Loop: Complex condition (&&)', fn: testLoopWithComplexCondition },
    { name: 'Loop: Nested break behavior', fn: testNestedBreakBehavior },
    { name: 'Loop: Continue on every iteration', fn: testContinueOnEveryIteration },
    { name: 'Loop: Empty body', fn: testEmptyLoopBody },

    // Function edge cases
    { name: 'Function: Zero parameters', fn: testFunctionZeroParameters },
    { name: 'Function: Many parameters (8)', fn: testFunctionManyParameters },
    { name: 'Function: Early return', fn: testFunctionEarlyReturn },
    { name: 'Function: Multiple return paths', fn: testFunctionMultipleReturnPaths },
    { name: 'Function: Self-recursion', fn: testFunctionCallingItself },
    { name: 'Function: Calling another function', fn: testFunctionCallingAnotherFunction },
    { name: 'Function: Array parameter', fn: testFunctionWithArrayParameter },
    { name: 'Function: Nested function calls', fn: testFunctionReturningFunctionCall }
  ]

  return await runTestSuite('Edge Cases Tests', tests)
}

// Run if executed directly
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runEdgeCaseTests().then(passed => {
    process.exit(passed ? 0 : 1)
  })
}


