/**
 * Turing Completeness Feature Tests
 *
 * Tests for arrays, loops, and functions
 */

import IFScript from '../../../src/IFScript.mjs'
import versions from '../../../src/constants/versions.mjs'
import { pathToFileURL } from 'url'
import {
  assert,
  assertEqual,
  assertArrayEqual,
  assertDefined,
  runTestSuite
} from '../../support/test-utils.mjs'

// ===== Array Tests =====

async function testArrayEmpty () {
  const storyText = `section__
  empty = []
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const section = parsed.sections[0]
  const assignment = section.text.find(item =>
    item.type === 'assign' && item.left.symbol === 'empty'
  )

  assertDefined(assignment, 'Should find assignment')
  assertEqual(assignment.right._class, 'ArrayLiteral', 'Should be ArrayLiteral')
  assertEqual(assignment.right.elements.length, 0, 'Empty array should have 0 elements')
}

async function testArrayLiteral () {
  const storyText = `section__
  numbers = [1, 2, 3, 4, 5]
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const section = parsed.sections[0]
  const assignment = section.text.find(item =>
    item.type === 'assign' && item.left.symbol === 'numbers'
  )

  assertDefined(assignment, 'Should find assignment')
  assertEqual(assignment.right._class, 'ArrayLiteral', 'Should be ArrayLiteral')
  assertEqual(assignment.right.elements.length, 5, 'Array should have 5 elements')
  assertEqual(assignment.right.elements[0].symbol, 1, 'First element should be 1')
  assertEqual(assignment.right.elements[4].symbol, 5, 'Last element should be 5')
}

async function testArrayMixedTypes () {
  const storyText = `section__
  mixed = [1, "two", true]
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const section = parsed.sections[0]
  const assignment = section.text.find(item =>
    item.type === 'assign' && item.left.symbol === 'mixed'
  )

  assertDefined(assignment, 'Should find assignment')
  const elements = assignment.right.elements
  assertEqual(elements.length, 3, 'Should have 3 elements')
  assertEqual(elements[0].type, 'NUMBER', 'First element is number')
  assertEqual(elements[1].type, 'STRING', 'Second element is string')
  assertEqual(elements[2].type, 'BOOLEAN', 'Third element is boolean')
}

async function testArrayAccess () {
  const storyText = `section__
  arr = [10, 20, 30]
  first = arr[0]
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const section = parsed.sections[0]
  const assignment = section.text.find(item =>
    item.type === 'assign' && item.left.symbol === 'first'
  )

  assertDefined(assignment, 'Should find assignment')
  assertEqual(assignment.right._class, 'ArrayAccess', 'Should be ArrayAccess')
  assertEqual(assignment.right.array.symbol, 'arr', 'Should access arr')
  assertEqual(assignment.right.index.symbol, 0, 'Index should be 0')
}

async function testArrayAssignment () {
  const storyText = `section__
  arr = [1, 2, 3]
  arr[1] = 99
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const section = parsed.sections[0]
  const assignment = section.text.find(item =>
    item.type === 'assign' && item.left._class === 'ArrayAccess'
  )

  assertDefined(assignment, 'Should find array assignment')
  assertEqual(assignment.left._class, 'ArrayAccess', 'Left side should be ArrayAccess')
  assertEqual(assignment.left.index.symbol, 1, 'Index should be 1')
  assertEqual(assignment.right.symbol, 99, 'Assigned value should be 99')
}

async function testArrayMemberAccess () {
  const storyText = `section__
  arr = [1, 2, 3]
  len = arr.length
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const section = parsed.sections[0]
  const assignment = section.text.find(item =>
    item.type === 'assign' && item.left.symbol === 'len'
  )

  assertDefined(assignment, 'Should find assignment')
  assertEqual(assignment.right._class, 'MemberAccess', 'Should be MemberAccess')
  assertEqual(assignment.right.object.symbol, 'arr', 'Object should be arr')
  assertEqual(assignment.right.member, 'length', 'Property should be length')
}

async function testArrayPushMethod () {
  const storyText = `section__
  arr = []
  arr.push(10)
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const section = parsed.sections[0]
  const pushCall = section.text.find(item =>
    item._class === 'MemberAccess' && item.member === 'push'
  )

  assertDefined(pushCall, 'Should find push call')
  assertEqual(pushCall._class, 'MemberAccess', 'Should be method call')
  assertEqual(pushCall.args.length, 1, 'Should have 1 argument')
  assertEqual(pushCall.args[0].symbol, 10, 'Argument should be 10')
}

async function testArrayPopMethod () {
  const storyText = `section__
  arr = [1, 2, 3]
  last = arr.pop()
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const section = parsed.sections[0]
  const assignment = section.text.find(item =>
    item.type === 'assign' && item.left.symbol === 'last'
  )

  assertDefined(assignment, 'Should find assignment')
  assertEqual(assignment.right._class, 'MemberAccess', 'Should be method call')
  assertEqual(assignment.right.member, 'pop', 'Method should be pop')
}

async function testNestedArrays () {
  const storyText = `section__
  nested = [[1, 2], [3, 4]]
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const section = parsed.sections[0]
  const assignment = section.text.find(item =>
    item.type === 'assign' && item.left.symbol === 'nested'
  )

  assertDefined(assignment, 'Should find assignment')
  const outerArray = assignment.right
  assertEqual(outerArray._class, 'ArrayLiteral', 'Should be ArrayLiteral')
  assertEqual(outerArray.elements.length, 2, 'Should have 2 elements')
  assertEqual(outerArray.elements[0]._class, 'ArrayLiteral', 'First element is array')
  assertEqual(outerArray.elements[1]._class, 'ArrayLiteral', 'Second element is array')
  assertEqual(outerArray.elements[0].elements.length, 2, 'Inner array has 2 elements')
}

async function testNestedArrayAccess () {
  const storyText = `section__
  matrix = [[1, 2], [3, 4]]
  elem = matrix[1][0]
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const section = parsed.sections[0]
  const assignment = section.text.find(item =>
    item.type === 'assign' && item.left.symbol === 'elem'
  )

  assertDefined(assignment, 'Should find assignment')
  assertEqual(assignment.right._class, 'ArrayAccess', 'Should be ArrayAccess')
  assertEqual(assignment.right.array._class, 'ArrayAccess', 'Nested access')
  assertEqual(assignment.right.index.symbol, 0, 'Inner index should be 0')
}

// ===== Loop Tests =====

async function testBasicWhileLoop () {
  const storyText = `section__
  counter = 0
  while__ (counter < 5) {
    counter = counter + 1
  }
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const section = parsed.sections[0]
  const loop = section.text.find(item => item._class === 'Loop')

  assertDefined(loop, 'Should find loop')
  assertEqual(loop._class, 'Loop', 'Should be Loop model')
  assertEqual(loop.condition.operator, '<', 'Condition operator should be <')
  assert(Array.isArray(loop.body), 'Loop body should be array')
  assert(loop.body.length > 0, 'Loop body should have statements')
}

async function testWhileBreak () {
  const storyText = `section__
  i = 0
  while__ (i < 100) {
    if__ (i == 10) {
      break__
    }
    i = i + 1
  }
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const section = parsed.sections[0]
  const loop = section.text.find(item => item._class === 'Loop')

  assertDefined(loop, 'Should find loop')

  // Find break statement in conditional
  let foundBreak = false
  for (const stmt of loop.body) {
    if (stmt._class === 'ConditionalBlock' && stmt.ifBlock) {
      for (const ifStmt of stmt.ifBlock) {
        if (ifStmt.type === 'break') {
          foundBreak = true
          break
        }
      }
    }
  }

  assert(foundBreak, 'Should find break statement in loop body')
}

async function testWhileContinue () {
  const storyText = `section__
  j = 0
  while__ (j < 10) {
    j = j + 1
    if__ (j % 2 == 1) {
      continue__
    }
  }
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const section = parsed.sections[0]
  const loop = section.text.find(item => item._class === 'Loop')

  assertDefined(loop, 'Should find loop')

  // Find continue statement
  let foundContinue = false
  for (const stmt of loop.body) {
    if (stmt._class === 'ConditionalBlock' && stmt.ifBlock) {
      for (const ifStmt of stmt.ifBlock) {
        if (ifStmt.type === 'continue') {
          foundContinue = true
          break
        }
      }
    }
  }

  assert(foundContinue, 'Should find continue statement in loop body')
}

async function testNestedLoops () {
  const storyText = `section__
  outer = 0
  while__ (outer < 3) {
    inner = 0
    while__ (inner < 2) {
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

  // Find inner loop
  const innerLoop = outerLoop.body.find(item => item._class === 'Loop')
  assertDefined(innerLoop, 'Should find inner loop in outer loop body')
  assertEqual(innerLoop._class, 'Loop', 'Inner loop should be Loop model')
}

// ===== Function Tests =====

async function testSimpleFunction () {
  const storyText = `function__ greet() {
  x = 1
}

section__
  greet()
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  // Check function definition
  assertDefined(parsed.functions, 'Should have functions property')
  assert(Array.isArray(parsed.functions), 'Functions should be array')
  assertEqual(parsed.functions.length, 1, 'Should have 1 function')

  const funcDef = parsed.functions[0]
  assertEqual(funcDef._class, 'FunctionDef', 'Should be FunctionDef')
  assertEqual(funcDef.name, 'greet', 'Function name should be greet')
  assertEqual(funcDef.params.length, 0, 'Should have 0 parameters')
  assert(Array.isArray(funcDef.body), 'Function body should be array')

  // Check function call
  const section = parsed.sections[0]
  const funcCall = section.text.find(item => item._class === 'FunctionCall')

  assertDefined(funcCall, 'Should find function call')
  assertEqual(funcCall._class, 'FunctionCall', 'Should be FunctionCall')
  assertEqual(funcCall.name.symbol, 'greet', 'Should call greet function')
  assertEqual(funcCall.args.length, 0, 'Should have 0 arguments')
}

async function testFunctionWithParameters () {
  const storyText = `function__ add(a, b) {
  return__ a + b
}

section__
  result = add(5, 3)
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const funcDef = parsed.functions[0]
  assertEqual(funcDef.name, 'add', 'Function name should be add')
  assertEqual(funcDef.params.length, 2, 'Should have 2 parameters')
  assertEqual(funcDef.params[0], 'a', 'First param should be a')
  assertEqual(funcDef.params[1], 'b', 'Second param should be b')

  // Check for return statement
  const returnStmt = funcDef.body.find(stmt => stmt.type === 'return')
  assertDefined(returnStmt, 'Should have return statement')
  assertEqual(returnStmt.type, 'return', 'Statement type should be return')

  // Check function call
  const section = parsed.sections[0]
  const assignment = section.text.find(item =>
    item.type === 'assign' && item.left.symbol === 'result'
  )

  assertDefined(assignment, 'Should find assignment')
  assertEqual(assignment.right._class, 'FunctionCall', 'Should be FunctionCall')
  assertEqual(assignment.right.args.length, 2, 'Should have 2 arguments')
  assertEqual(assignment.right.args[0].symbol, 5, 'First arg should be 5')
  assertEqual(assignment.right.args[1].symbol, 3, 'Second arg should be 3')
}

async function testFunctionRecursion () {
  const storyText = `function__ factorial(n) {
  if__ (n <= 1) {
    return__ 1
  }
  return__ n * factorial(n - 1)
}

section__
  result = factorial(5)
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const funcDef = parsed.functions[0]
  assertEqual(funcDef.name, 'factorial', 'Function name should be factorial')

  // Check for recursive call in function body
  let foundRecursiveCall = false
  for (const stmt of funcDef.body) {
    if (stmt.type === 'return' && stmt.left) {
      // Check if return value contains a function call
      const checkForCall = (obj) => {
        if (obj._class === 'FunctionCall' && obj.name.symbol === 'factorial') {
          foundRecursiveCall = true
          return
        }
        if (obj.left) checkForCall(obj.left)
        if (obj.right) checkForCall(obj.right)
      }
      checkForCall(stmt.left)
    }
  }

  assert(foundRecursiveCall, 'Should find recursive call to factorial')
}

async function testFunctionReturningArray () {
  const storyText = `function__ makeArray(size) {
  arr = []
  i = 0
  while__ (i < size) {
    arr.push(i)
    i = i + 1
  }
  return__ arr
}

section__
  myArray = makeArray(5)
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const funcDef = parsed.functions[0]
  assertEqual(funcDef.name, 'makeArray', 'Function name should be makeArray')

  // Find return statement
  const returnStmt = funcDef.body.find(stmt => stmt.type === 'return')
  assertDefined(returnStmt, 'Should have return statement')
  assertEqual(returnStmt.left.symbol, 'arr', 'Should return arr variable')

  // Check function call in section
  const section = parsed.sections[0]
  const assignment = section.text.find(item =>
    item.type === 'assign' && item.left.symbol === 'myArray'
  )

  assertDefined(assignment, 'Should find assignment')
  assertEqual(assignment.right._class, 'FunctionCall', 'Should be FunctionCall')
}

// ===== Integration Tests =====

async function testArrayInLoop () {
  const storyText = `section__
  arr = []
  i = 0
  while__ (i < 5) {
    arr.push(i)
    i = i + 1
  }
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const section = parsed.sections[0]
  const loop = section.text.find(item => item._class === 'Loop')

  assertDefined(loop, 'Should find loop')

  // Find push call in loop body
  const pushCall = loop.body.find(stmt =>
    stmt._class === 'MemberAccess' && stmt.member === 'push'
  )

  assertDefined(pushCall, 'Should find push call in loop body')
}

async function testComplexAlgorithmSieve () {
  const storyText = `function__ sieve(max) {
  primes = []
  n = 2
  while__ (n <= max) {
    isPrime = true
    i = 0
    while__ (i < primes.length) {
      if__ (n % primes[i] == 0) {
        isPrime = false
        break__
      }
      i = i + 1
    }
    if__ (isPrime) {
      primes.push(n)
    }
    n = n + 1
  }
  return__ primes
}

section__
  result = sieve(20)
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  assertDefined(parsed.functions, 'Should have functions')
  assertEqual(parsed.functions.length, 1, 'Should have 1 function')

  const funcDef = parsed.functions[0]
  assertEqual(funcDef.name, 'sieve', 'Function should be sieve')

  // Should have nested loops
  const outerLoop = funcDef.body.find(stmt => stmt._class === 'Loop')
  assertDefined(outerLoop, 'Should have outer loop')

  const innerLoop = outerLoop.body.find(stmt => stmt._class === 'Loop')
  assertDefined(innerLoop, 'Should have inner loop in outer loop')
}

async function testComplexAlgorithmGCD () {
  const storyText = `function__ gcd(a, b) {
  while__ (b != 0) {
    temp = b
    b = a % b
    a = temp
  }
  return__ a
}

section__
  result = gcd(48, 18)
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  const funcDef = parsed.functions[0]
  assertEqual(funcDef.name, 'gcd', 'Function should be gcd')
  assertEqual(funcDef.params.length, 2, 'Should have 2 parameters')

  const loop = funcDef.body.find(stmt => stmt._class === 'Loop')
  assertDefined(loop, 'Should have while loop')
  assertEqual(loop.condition.operator, '!=', 'Condition should be !=')
}

// ===== Run Test Suite =====

export async function runTuringTests () {
  const tests = [
    // Array tests
    { name: 'Array: Create empty array', fn: testArrayEmpty },
    { name: 'Array: Create literal with elements', fn: testArrayLiteral },
    { name: 'Array: Mixed types', fn: testArrayMixedTypes },
    { name: 'Array: Access by index', fn: testArrayAccess },
    { name: 'Array: Assignment by index', fn: testArrayAssignment },
    { name: 'Array: Member access (length)', fn: testArrayMemberAccess },
    { name: 'Array: Push method', fn: testArrayPushMethod },
    { name: 'Array: Pop method', fn: testArrayPopMethod },
    { name: 'Array: Nested arrays', fn: testNestedArrays },
    { name: 'Array: Nested array access', fn: testNestedArrayAccess },

    // Loop tests
    { name: 'Loop: Basic while loop', fn: testBasicWhileLoop },
    { name: 'Loop: While with break', fn: testWhileBreak },
    { name: 'Loop: While with continue', fn: testWhileContinue },
    { name: 'Loop: Nested loops', fn: testNestedLoops },

    // Function tests
    { name: 'Function: Simple function call', fn: testSimpleFunction },
    { name: 'Function: Multiple parameters', fn: testFunctionWithParameters },
    { name: 'Function: Recursion (factorial)', fn: testFunctionRecursion },
    { name: 'Function: Return array', fn: testFunctionReturningArray },

    // Integration tests
    { name: 'Integration: Array in loop', fn: testArrayInLoop },
    { name: 'Integration: Sieve algorithm', fn: testComplexAlgorithmSieve },
    { name: 'Integration: GCD algorithm', fn: testComplexAlgorithmGCD }
  ]

  return await runTestSuite('Turing Completeness Feature Tests', tests)
}

// Run if executed directly
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runTuringTests().then(passed => {
    process.exit(passed ? 0 : 1)
  })
}


