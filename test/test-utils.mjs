/**
 * Test Utilities
 *
 * Shared utilities for the Turing Completeness test suite
 */

/**
 * Assert that a condition is true
 * @param {boolean} condition - The condition to check
 * @param {string} message - Error message if assertion fails
 * @throws {Error} If condition is false
 */
export function assert (condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed')
  }
}

/**
 * Assert that two values are equal
 * @param {*} actual - The actual value
 * @param {*} expected - The expected value
 * @param {string} message - Error message prefix
 * @throws {Error} If values are not equal
 */
export function assertEqual (actual, expected, message) {
  if (actual !== expected) {
    const error = message
      ? `${message}\nExpected: ${expected}\nActual: ${actual}`
      : `Expected: ${expected}\nActual: ${actual}`
    throw new Error(error)
  }
}

/**
 * Assert that two arrays are equal (deep comparison)
 * @param {Array} actual - The actual array
 * @param {Array} expected - The expected array
 * @param {string} message - Error message prefix
 * @throws {Error} If arrays are not equal
 */
export function assertArrayEqual (actual, expected, message) {
  if (!Array.isArray(actual) || !Array.isArray(expected)) {
    throw new Error(`${message || 'Arrays not equal'}\nOne or both values are not arrays`)
  }

  if (actual.length !== expected.length) {
    throw new Error(`${message || 'Arrays not equal'}\nLength mismatch: ${actual.length} vs ${expected.length}`)
  }

  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== expected[i]) {
      throw new Error(`${message || 'Arrays not equal'}\nMismatch at index ${i}: ${actual[i]} vs ${expected[i]}`)
    }
  }
}

/**
 * Assert that a value is defined (not null or undefined)
 * @param {*} value - The value to check
 * @param {string} message - Error message
 * @throws {Error} If value is null or undefined
 */
export function assertDefined (value, message) {
  if (value === null || value === undefined) {
    throw new Error(message || 'Value is null or undefined')
  }
}

/**
 * Assert that a function throws an error
 * @param {Function} fn - The function to execute
 * @param {string} expectedMessage - Expected error message (optional)
 * @param {string} message - Error message if assertion fails
 * @throws {Error} If function doesn't throw
 */
export async function assertThrows (fn, expectedMessage, message) {
  try {
    await fn()
    throw new Error(message || 'Expected function to throw an error')
  } catch (error) {
    if (error.message === message || error.message === 'Expected function to throw an error') {
      throw error
    }
    if (expectedMessage && !error.message.includes(expectedMessage)) {
      throw new Error(`Expected error message to include "${expectedMessage}"\nActual: ${error.message}`)
    }
  }
}

/**
 * Run a single test and report results
 * @param {string} name - Test name
 * @param {Function} fn - Test function
 * @returns {Promise<boolean>} True if test passed
 */
export async function runTest (name, fn) {
  try {
    await fn()
    console.log(`✓ ${name}`)
    return true
  } catch (err) {
    console.error(`✗ ${name}`)
    console.error(`  ${err.message}`)
    if (err.stack) {
      const stackLines = err.stack.split('\n').slice(1, 3)
      stackLines.forEach(line => console.error(`  ${line.trim()}`))
    }
    return false
  }
}

/**
 * Run a test suite
 * @param {string} suiteName - Suite name
 * @param {Array<{name: string, fn: Function}>} tests - Array of test objects
 * @returns {Promise<boolean>} True if all tests passed
 */
export async function runTestSuite (suiteName, tests) {
  console.log(`\n--- ${suiteName} ---`)

  const results = []
  for (const test of tests) {
    results.push(await runTest(test.name, test.fn))
  }

  const passed = results.filter(r => r).length
  const total = results.length

  if (passed === total) {
    console.log(`\n✓ All ${total} tests passed`)
  } else {
    console.log(`\n✗ ${passed}/${total} tests passed, ${total - passed} failed`)
  }

  return passed === total
}

/**
 * Create a minimal mock DOM for testing
 * @returns {Object} Mock DOM object
 */
export function createMockDOM () {
  const elements = new Map()
  let idCounter = 0

  const createElement = (tag) => {
    const id = `mock-${idCounter++}`
    const element = {
      tagName: tag,
      id,
      className: '',
      innerHTML: '',
      textContent: '',
      style: {},
      children: [],
      attributes: {},
      addEventListener: () => {},
      appendChild: (child) => {
        element.children.push(child)
      },
      setAttribute: (name, value) => {
        element.attributes[name] = value
      },
      getAttribute: (name) => element.attributes[name],
      querySelector: () => null,
      querySelectorAll: () => []
    }
    elements.set(id, element)
    return element
  }

  const getElementById = (id) => elements.get(id) || null

  return {
    createElement,
    getElementById,
    body: createElement('body'),
    querySelector: () => null,
    querySelectorAll: () => []
  }
}

/**
 * Extract variable value from parsed story section
 * @param {Object} section - Parsed section object
 * @param {string} varName - Variable name to find
 * @returns {*} Variable value or undefined
 */
export function extractVariable (section, varName) {
  if (!section || !section.text) return undefined

  for (const item of section.text) {
    if (item.type === 'assign' && item.left && item.left.symbol === varName) {
      return item.right
    }
  }

  return undefined
}

/**
 * Find a model by class name in section text
 * @param {Object} section - Parsed section object
 * @param {string} className - Model class name (e.g., 'ArrayLiteral')
 * @returns {Object|null} Model object or null
 */
export function findModelByClass (section, className) {
  if (!section || !section.text) return null

  for (const item of section.text) {
    if (item._class === className) {
      return item
    }
    if (item.right && item.right._class === className) {
      return item.right
    }
  }

  return null
}

/**
 * Create a simple timer for performance testing
 * @returns {Object} Timer object with start() and end() methods
 */
export function createTimer () {
  let startTime

  return {
    start: () => {
      startTime = process.hrtime.bigint()
    },
    end: () => {
      const endTime = process.hrtime.bigint()
      const durationNs = endTime - startTime
      const durationMs = Number(durationNs) / 1000000
      return durationMs
    }
  }
}

/**
 * Format duration in milliseconds
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
export function formatDuration (ms) {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)}μs`
  } else if (ms < 1000) {
    return `${ms.toFixed(2)}ms`
  } else {
    return `${(ms / 1000).toFixed(2)}s`
  }
}
