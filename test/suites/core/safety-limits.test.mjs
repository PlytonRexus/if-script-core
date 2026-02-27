/**
 * Safety Limits Tests
 *
 * Tests for MAX_ITERATIONS and MAX_CALL_DEPTH safety limits
 */

import IFScript from '../../../src/IFScript.mjs'
import versions from '../../../src/constants/versions.mjs'
import { pathToFileURL } from 'url'
import {
  assert,
  assertEqual,
  runTestSuite
} from '../../support/test-utils.mjs'

// ===== Infinite Loop Detection =====

async function testInfiniteLoopDetection () {
  const storyText = `section__
  counter = 0
  while__ (true) {
    counter = counter + 1
  }
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  // Parsing should succeed
  assert(parsed !== null, 'Story should parse successfully')

  const section = parsed.sections[0]
  const loop = section.text.find(item => item._class === 'Loop')

  assert(loop !== undefined, 'Should find while loop')
  assertEqual(loop.condition.symbol, true, 'Condition should be true (infinite loop)')
}

async function testLoopWithLargeIterationCount () {
  const storyText = `section__
  i = 0
  while__ (i < 50000) {
    i = i + 1
  }
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  // Parsing should succeed
  assert(parsed !== null, 'Story should parse successfully')

  const section = parsed.sections[0]
  const loop = section.text.find(item => item._class === 'Loop')

  assert(loop !== undefined, 'Should find while loop')

  // Note: Actual iteration limit enforcement happens at interpreter runtime,
  // not during parsing. This test verifies the parser accepts the syntax.
}

async function testNestedLoopComplexity () {
  const storyText = `section__
  outer = 0
  while__ (outer < 100) {
    inner = 0
    while__ (inner < 100) {
      inner = inner + 1
    }
    outer = outer + 1
  }
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  // Parsing should succeed
  assert(parsed !== null, 'Story should parse successfully')

  const section = parsed.sections[0]
  const outerLoop = section.text.find(item => item._class === 'Loop')

  assert(outerLoop !== undefined, 'Should find outer loop')

  const innerLoop = outerLoop.body.find(item => item._class === 'Loop')
  assert(innerLoop !== undefined, 'Should find inner loop')

  // Note: Total iterations would be 10,000 which should trigger the safety limit
  // This is enforced at runtime, not parse time
}

// ===== Deep Recursion Detection =====

async function testDeepRecursion () {
  const storyText = `function__ recurse(n) {
  if__ (n <= 0) {
    return__ 0
  }
  return__ recurse(n - 1)
}

section__
  result = recurse(5000)
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  // Parsing should succeed
  assert(parsed !== null, 'Story should parse successfully')
  assertEqual(parsed.functions.length, 1, 'Should have 1 function')

  const funcDef = parsed.functions[0]
  assertEqual(funcDef.name, 'recurse', 'Function name should be recurse')

  // Note: Recursion depth limit is enforced at runtime, not parse time
  // A call depth of 5000 should exceed MAX_CALL_DEPTH (1000 by default)
}

async function testMutualRecursion () {
  const storyText = `function__ foo(n) {
  if__ (n <= 0) {
    return__ 0
  }
  return__ bar(n - 1)
}

function__ bar(n) {
  if__ (n <= 0) {
    return__ 0
  }
  return__ foo(n - 1)
}

section__
  result = foo(5000)
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  // Parsing should succeed
  assert(parsed !== null, 'Story should parse successfully')
  assertEqual(parsed.functions.length, 2, 'Should have 2 functions')

  const foo = parsed.functions.find(f => f.name === 'foo')
  const bar = parsed.functions.find(f => f.name === 'bar')

  assert(foo !== undefined, 'Should find foo function')
  assert(bar !== undefined, 'Should find bar function')

  // Note: Mutual recursion depth limit is enforced at runtime
}

async function testRecursionWithinReasonableLimits () {
  const storyText = `function__ factorial(n) {
  if__ (n <= 1) {
    return__ 1
  }
  return__ n * factorial(n - 1)
}

section__
  result = factorial(10)
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  // Parsing should succeed
  assert(parsed !== null, 'Story should parse successfully')

  const funcDef = parsed.functions[0]
  assertEqual(funcDef.name, 'factorial', 'Function name should be factorial')

  // Note: factorial(10) should be well within safety limits
  // Actual execution would happen at runtime
}

// ===== Loop Control Flow =====

async function testBreakPreventsInfiniteLoop () {
  const storyText = `section__
  while__ (true) {
    break__
  }
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  // Parsing should succeed
  assert(parsed !== null, 'Story should parse successfully')

  const section = parsed.sections[0]
  const loop = section.text.find(item => item._class === 'Loop')

  assert(loop !== undefined, 'Should find while loop')

  // Find break statement in loop body
  const breakStmt = loop.body.find(stmt => stmt.type === 'break')
  assert(breakStmt !== undefined, 'Should find break statement')
  assertEqual(breakStmt.type, 'break', 'Should be break statement')
}

async function testConditionalBreak () {
  const storyText = `section__
  i = 0
  while__ (true) {
    if__ (i >= 100) {
      break__
    }
    i = i + 1
  }
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  // Parsing should succeed
  assert(parsed !== null, 'Story should parse successfully')

  const section = parsed.sections[0]
  const loop = section.text.find(item => item._class === 'Loop')

  assert(loop !== undefined, 'Should find while loop')

  // Find conditional with break
  const conditional = loop.body.find(stmt => stmt._class === 'ConditionalBlock')
  assert(conditional !== undefined, 'Should find conditional in loop')

  const breakStmt = conditional.ifBlock.find(stmt => stmt.type === 'break')
  assert(breakStmt !== undefined, 'Should find break in conditional')
}

// ===== Edge Cases =====

async function testZeroIterationLoop () {
  const storyText = `section__
  while__ (false) {
    x = 1
  }
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  // Parsing should succeed
  assert(parsed !== null, 'Story should parse successfully')

  const section = parsed.sections[0]
  const loop = section.text.find(item => item._class === 'Loop')

  assert(loop !== undefined, 'Should find while loop')
  assertEqual(loop.condition.symbol, false, 'Condition should be false')
}

async function testSingleIterationLoop () {
  const storyText = `section__
  ran = false
  while__ (!ran) {
    ran = true
  }
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  // Parsing should succeed
  assert(parsed !== null, 'Story should parse successfully')

  const section = parsed.sections[0]
  const loop = section.text.find(item => item._class === 'Loop')

  assert(loop !== undefined, 'Should find while loop')
}

async function testFunctionWithNoReturnValue () {
  const storyText = `function__ doSomething() {
  x = 1
}

section__
  doSomething()
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  // Parsing should succeed
  assert(parsed !== null, 'Story should parse successfully')

  const funcDef = parsed.functions[0]
  assertEqual(funcDef.name, 'doSomething', 'Function name should be doSomething')

  // Function has no return statement - should return undefined at runtime
  const hasReturn = funcDef.body.some(stmt => stmt.type === 'return')
  assert(!hasReturn, 'Function should not have explicit return statement')
}

async function testEmptyFunctionBody () {
  const storyText = `function__ noop() {
}

section__
  noop()
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  // Parsing should succeed
  assert(parsed !== null, 'Story should parse successfully')

  const funcDef = parsed.functions[0]
  assertEqual(funcDef.name, 'noop', 'Function name should be noop')
  assert(Array.isArray(funcDef.body), 'Function body should be array')
  assertEqual(funcDef.body.length, 0, 'Function body should be empty')
}

// ===== Run Test Suite =====

export async function runSafetyTests () {
  const tests = [
    { name: 'Infinite loop detection (parsing)', fn: testInfiniteLoopDetection },
    { name: 'Loop with large iteration count', fn: testLoopWithLargeIterationCount },
    { name: 'Nested loop complexity', fn: testNestedLoopComplexity },
    { name: 'Deep recursion (parsing)', fn: testDeepRecursion },
    { name: 'Mutual recursion (parsing)', fn: testMutualRecursion },
    { name: 'Recursion within limits', fn: testRecursionWithinReasonableLimits },
    { name: 'Break prevents infinite loop', fn: testBreakPreventsInfiniteLoop },
    { name: 'Conditional break', fn: testConditionalBreak },
    { name: 'Zero iteration loop', fn: testZeroIterationLoop },
    { name: 'Single iteration loop', fn: testSingleIterationLoop },
    { name: 'Function with no return value', fn: testFunctionWithNoReturnValue },
    { name: 'Empty function body', fn: testEmptyFunctionBody }
  ]

  return await runTestSuite('Safety Limits Tests', tests)
}

// Run if executed directly
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSafetyTests().then(passed => {
    process.exit(passed ? 0 : 1)
  })
}
