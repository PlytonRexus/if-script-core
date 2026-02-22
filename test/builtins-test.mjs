/**
 * Built-in Library Functions Tests
 *
 * Tests all built-in functions available to story authors.
 * Builtins are tested directly since the interpreter requires a DOM environment.
 */

import BUILTINS, { resetBuiltinState } from '../src/interpreters/custom/Builtins.mjs'
import IFScript from '../src/IFScript.mjs'
import versions from '../src/constants/versions.mjs'
import {
  assert,
  assertEqual,
  assertArrayEqual,
  runTestSuite
} from './test-utils.mjs'

// ===== Math Tests =====

async function testAbs () {
  assertEqual(BUILTINS.abs(-5), 5, 'abs(-5) should be 5')
  assertEqual(BUILTINS.abs(3), 3, 'abs(3) should be 3')
  assertEqual(BUILTINS.abs(0), 0, 'abs(0) should be 0')
}

async function testFloor () {
  assertEqual(BUILTINS.floor(4.9), 4, 'floor(4.9) should be 4')
  assertEqual(BUILTINS.floor(-1.1), -2, 'floor(-1.1) should be -2')
  assertEqual(BUILTINS.floor(3), 3, 'floor(3) should be 3')
}

async function testCeil () {
  assertEqual(BUILTINS.ceil(4.1), 5, 'ceil(4.1) should be 5')
  assertEqual(BUILTINS.ceil(-1.9), -1, 'ceil(-1.9) should be -1')
  assertEqual(BUILTINS.ceil(3), 3, 'ceil(3) should be 3')
}

async function testRound () {
  assertEqual(BUILTINS.round(4.5), 5, 'round(4.5) should be 5')
  assertEqual(BUILTINS.round(4.4), 4, 'round(4.4) should be 4')
  assertEqual(BUILTINS.round(-1.5), -1, 'round(-1.5) should be -1')
}

async function testSqrt () {
  assertEqual(BUILTINS.sqrt(9), 3, 'sqrt(9) should be 3')
  assertEqual(BUILTINS.sqrt(0), 0, 'sqrt(0) should be 0')
}

async function testPow () {
  assertEqual(BUILTINS.pow(2, 10), 1024, 'pow(2, 10) should be 1024')
  assertEqual(BUILTINS.pow(3, 0), 1, 'pow(3, 0) should be 1')
  assertEqual(BUILTINS.pow(5, 1), 5, 'pow(5, 1) should be 5')
}

async function testMin () {
  assertEqual(BUILTINS.min(3, 1, 4, 1, 5), 1, 'min(3,1,4,1,5) should be 1')
  assertEqual(BUILTINS.min(10, 20), 10, 'min(10,20) should be 10')
}

async function testMax () {
  assertEqual(BUILTINS.max(3, 1, 4, 1, 5), 5, 'max(3,1,4,1,5) should be 5')
  assertEqual(BUILTINS.max(10, 20), 20, 'max(10,20) should be 20')
}

// ===== Randomness Tests =====

async function testRandom () {
  for (let i = 0; i < 20; i++) {
    const val = BUILTINS.random()
    assert(val >= 0 && val < 1, `random() should be in [0,1), got ${val}`)
  }
}

async function testRandomInt () {
  const results = []
  for (let i = 0; i < 200; i++) {
    const val = BUILTINS.randomInt(1, 6)
    assert(val >= 1 && val <= 6, `randomInt(1,6) out of range: ${val}`)
    assert(Number.isInteger(val), `randomInt(1,6) should be integer, got ${val}`)
    results.push(val)
  }
  // Over 200 calls, we expect each value 1-6 to appear at least once
  for (let v = 1; v <= 6; v++) {
    assert(results.includes(v), `randomInt(1,6) never produced ${v} in 200 calls`)
  }
}

async function testRandomChoice () {
  const arr = ['a', 'b', 'c', 'd']
  for (let i = 0; i < 50; i++) {
    const val = BUILTINS.randomChoice(arr)
    assert(arr.includes(val), `randomChoice should return element from array, got ${val}`)
  }
}

async function testPick () {
  const arr = ['x', 'y', 'z']
  for (let i = 0; i < 30; i++) {
    const val = BUILTINS.pick(arr)
    assert(arr.includes(val), `pick should return element from array, got ${val}`)
  }
}

async function testChance () {
  assertEqual(BUILTINS.chance(0), false, 'chance(0) should always be false')
  assertEqual(BUILTINS.chance(-10), false, 'chance(-10) should always be false')
  assertEqual(BUILTINS.chance(100), true, 'chance(100) should always be true')
  assertEqual(BUILTINS.chance(1000), true, 'chance(1000) should always be true')
}

async function testShuffle () {
  const arr = [1, 2, 3, 4, 5]
  const shuffled = BUILTINS.shuffle(arr)
  assert(Array.isArray(shuffled), 'shuffle() should return array')
  assertEqual(arr.length, shuffled.length, 'shuffle should preserve length')
  assert(shuffled !== arr, 'shuffle should return a copy, not mutate original reference')
  const sortedOriginal = [...arr].sort((a, b) => a - b)
  const sortedShuffled = [...shuffled].sort((a, b) => a - b)
  assertArrayEqual(sortedShuffled, sortedOriginal, 'shuffle should preserve all elements')
}

async function testSeededRandomDeterministic () {
  resetBuiltinState()
  BUILTINS.setSeed(12345)
  const seqA = [BUILTINS.seededRandom(), BUILTINS.seededRandom(), BUILTINS.seededRandom()]

  resetBuiltinState()
  BUILTINS.setSeed(12345)
  const seqB = [BUILTINS.seededRandom(), BUILTINS.seededRandom(), BUILTINS.seededRandom()]

  assertArrayEqual(seqA, seqB, 'same seed should produce same random sequence')
}

async function testSeededRandomDifferentSeed () {
  resetBuiltinState()
  BUILTINS.setSeed(111)
  const a = BUILTINS.seededRandom()

  resetBuiltinState()
  BUILTINS.setSeed(222)
  const b = BUILTINS.seededRandom()

  assert(a !== b, 'different seeds should produce different first value')
}

async function testSeededRandomIntRange () {
  resetBuiltinState()
  BUILTINS.setSeed(9)
  for (let i = 0; i < 50; i++) {
    const val = BUILTINS.seededRandomInt(3, 7)
    assert(val >= 3 && val <= 7, `seededRandomInt(3,7) should stay in range, got ${val}`)
    assert(Number.isInteger(val), `seededRandomInt(3,7) should be integer, got ${val}`)
  }
}

async function testSetSeedInvalidNormalizes () {
  resetBuiltinState()
  const seed = BUILTINS.setSeed('not-a-number')
  assertEqual(seed, 1, 'invalid seed should normalize to 1')
}

// ===== Type Conversion Tests =====

async function testToNumber () {
  assertEqual(BUILTINS.toNumber('42'), 42, 'toNumber("42") should be 42')
  assertEqual(BUILTINS.toNumber('3.14'), 3.14, 'toNumber("3.14") should be 3.14')
  assertEqual(BUILTINS.toNumber(true), 1, 'toNumber(true) should be 1')
  assertEqual(BUILTINS.toNumber(false), 0, 'toNumber(false) should be 0')
  assertEqual(BUILTINS.toNumber('not a number'), 0, 'toNumber("not a number") should be 0 (NaN case)')
  assertEqual(BUILTINS.toNumber(null), 0, 'toNumber(null) should be 0')
}

async function testToString () {
  assertEqual(BUILTINS.toString(42), '42', 'toString(42) should be "42"')
  assertEqual(BUILTINS.toString(true), 'true', 'toString(true) should be "true"')
  assertEqual(BUILTINS.toString(null), 'null', 'toString(null) should be "null"')
  assertEqual(BUILTINS.toString('hello'), 'hello', 'toString("hello") should be "hello"')
}

async function testUpper () {
  assertEqual(BUILTINS.upper('abc'), 'ABC', 'upper("abc") should be "ABC"')
}

async function testLower () {
  assertEqual(BUILTINS.lower('AbC'), 'abc', 'lower("AbC") should be "abc"')
}

async function testTrim () {
  assertEqual(BUILTINS.trim('  hello  '), 'hello', 'trim should remove edge whitespace')
}

async function testReplace () {
  assertEqual(BUILTINS.replace('a-b-c', '-', ':'), 'a:b:c', 'replace should replace all matching segments')
  assertEqual(BUILTINS.replace('hello', '', 'x'), 'hello', 'replace with empty search should keep original string')
}

async function testSlice () {
  assertEqual(BUILTINS.slice('abcdef', 1, 4), 'bcd', 'slice should support start/end bounds')
  assertEqual(BUILTINS.slice('abcdef', -2), 'ef', 'slice should support negative start indexes')
}

async function testStartsWith () {
  assertEqual(BUILTINS.startsWith('veracruz', 'vera'), true, 'startsWith should detect matching prefixes')
  assertEqual(BUILTINS.startsWith('veracruz', 'cruz'), false, 'startsWith should reject non-prefixes')
}

async function testEndsWith () {
  assertEqual(BUILTINS.endsWith('veracruz', 'cruz'), true, 'endsWith should detect matching suffixes')
  assertEqual(BUILTINS.endsWith('veracruz', 'vera'), false, 'endsWith should reject non-suffixes')
}

async function testCapitalize () {
  assertEqual(BUILTINS.capitalize('reporter'), 'Reporter', 'capitalize should uppercase first character')
  assertEqual(BUILTINS.capitalize(''), '', 'capitalize should preserve empty string')
}

async function testSlugify () {
  assertEqual(BUILTINS.slugify('A Stranger in Veracruz'), 'a-stranger-in-veracruz', 'slugify should normalize words and separators')
  assertEqual(BUILTINS.slugify('  value@@@with%%%noise  '), 'value-with-noise', 'slugify should strip unsupported characters')
}

async function testStripTags () {
  assertEqual(BUILTINS.stripTags('x <b>bold</b> y'), 'x bold y', 'stripTags should remove HTML tags')
  assertEqual(BUILTINS.stripTags('<script>alert(1)</script>safe'), ' safe', 'stripTags should remove script blocks')
}

async function testSanitize () {
  assertEqual(BUILTINS.sanitize(' <b>Elena</b>\n\t '), 'Elena', 'sanitize should remove tags and collapse whitespace')
  assertEqual(BUILTINS.sanitize('ok<script>alert(1)</script>done'), 'ok done', 'sanitize should remove script blocks')
}

async function testSplit () {
  assertArrayEqual(BUILTINS.split('a,b,c', ','), ['a', 'b', 'c'], 'split should tokenize string by separator')
}

async function testJoin () {
  assertEqual(BUILTINS.join(['a', 'b', 'c'], '-'), 'a-b-c', 'join should concatenate array with separator')
}

// ===== Inspection & Utility Tests =====

async function testType () {
  assertEqual(BUILTINS.type(42), 'number', 'type(42) should be "number"')
  assertEqual(BUILTINS.type('hello'), 'string', 'type("hello") should be "string"')
  assertEqual(BUILTINS.type(true), 'boolean', 'type(true) should be "boolean"')
  assertEqual(BUILTINS.type([1, 2, 3]), 'array', 'type([]) should be "array"')
  assertEqual(BUILTINS.type(null), 'null', 'type(null) should be "null"')
}

async function testLen () {
  assertEqual(BUILTINS.len('hello'), 5, 'len("hello") should be 5')
  assertEqual(BUILTINS.len(''), 0, 'len("") should be 0')
  assertEqual(BUILTINS.len([1, 2, 3]), 3, 'len([1,2,3]) should be 3')
  assertEqual(BUILTINS.len([]), 0, 'len([]) should be 0')
}

async function testContains () {
  assert(BUILTINS.contains([1, 2, 3], 2), 'contains([1,2,3], 2) should be true')
  assert(!BUILTINS.contains([1, 2, 3], 5), 'contains([1,2,3], 5) should be false')
  assert(BUILTINS.contains('hello world', 'world'), 'contains("hello world", "world") should be true')
  assert(!BUILTINS.contains('hello', 'xyz'), 'contains("hello", "xyz") should be false')
}

async function testClamp () {
  assertEqual(BUILTINS.clamp(5, 1, 10), 5, 'clamp within bounds should return value')
  assertEqual(BUILTINS.clamp(-5, 1, 10), 1, 'clamp below min should return min')
  assertEqual(BUILTINS.clamp(50, 1, 10), 10, 'clamp above max should return max')
}

async function testRangeOneArg () {
  assertArrayEqual(BUILTINS.range(5), [0, 1, 2, 3, 4], 'range(5) should be [0,1,2,3,4]')
  assertArrayEqual(BUILTINS.range(0), [], 'range(0) should be []')
  assertArrayEqual(BUILTINS.range(1), [0], 'range(1) should be [0]')
}

async function testRangeTwoArgs () {
  assertArrayEqual(BUILTINS.range(2, 5), [2, 3, 4], 'range(2,5) should be [2,3,4]')
  assertArrayEqual(BUILTINS.range(0, 3), [0, 1, 2], 'range(0,3) should be [0,1,2]')
  assertArrayEqual(BUILTINS.range(3, 3), [], 'range(3,3) should be []')
}

async function testSum () {
  assertEqual(BUILTINS.sum([1, 2, 3, 4]), 10, 'sum([1,2,3,4]) should be 10')
  assertEqual(BUILTINS.sum('x'), 0, 'sum(non-array) should be 0')
}

async function testAvg () {
  assertEqual(BUILTINS.avg([2, 4, 6]), 4, 'avg([2,4,6]) should be 4')
  assertEqual(BUILTINS.avg([]), 0, 'avg([]) should be 0')
  assertEqual(BUILTINS.avg('x'), 0, 'avg(non-array) should be 0')
}

async function testUnique () {
  assertArrayEqual(BUILTINS.unique([1, 2, 2, 3, 1]), [1, 2, 3], 'unique should remove duplicates while preserving first-seen order')
  assertArrayEqual(BUILTINS.unique('x'), [], 'unique(non-array) should return []')
}

async function testFindIndex () {
  assertEqual(BUILTINS.findIndex(['a', 'b', 'c'], 'b'), 1, 'findIndex should find existing item')
  assertEqual(BUILTINS.findIndex(['a', 'b', 'c'], 'z'), -1, 'findIndex should return -1 when missing')
  assertEqual(BUILTINS.findIndex('x', 'x'), -1, 'findIndex(non-array) should return -1')
}

// ===== Date & Time Tests =====

async function testNow () {
  const ts = BUILTINS.now()
  assert(typeof ts === 'number', 'now() should return a number')
  assert(ts > 1000000000000, 'now() should return a large positive integer (Unix ms)')
}

async function testYear () {
  const y = BUILTINS.year()
  assert(typeof y === 'number', 'year() should return a number')
  assert(y >= 2024 && y <= 2100, `year() should be a reasonable year, got ${y}`)
}

async function testMonth () {
  const m = BUILTINS.month()
  assert(typeof m === 'number', 'month() should return a number')
  assert(m >= 1 && m <= 12, `month() should be 1-12, got ${m}`)
}

async function testDay () {
  const d = BUILTINS.day()
  assert(typeof d === 'number', 'day() should return a number')
  assert(d >= 1 && d <= 31, `day() should be 1-31, got ${d}`)
}

async function testHour () {
  const h = BUILTINS.hour()
  assert(typeof h === 'number', 'hour() should return a number')
  assert(h >= 0 && h <= 23, `hour() should be 0-23, got ${h}`)
}

async function testMinute () {
  const m = BUILTINS.minute()
  assert(typeof m === 'number', 'minute() should return a number')
  assert(m >= 0 && m <= 59, `minute() should be 0-59, got ${m}`)
}

async function testSecond () {
  const s = BUILTINS.second()
  assert(typeof s === 'number', 'second() should return a number')
  assert(s >= 0 && s <= 59, `second() should be 0-59, got ${s}`)
}

async function testDayOfWeek () {
  const d = BUILTINS.dayOfWeek()
  assert(typeof d === 'number', 'dayOfWeek() should return a number')
  assert(d >= 0 && d <= 6, `dayOfWeek() should be 0-6, got ${d}`)
}

async function testFormatDate () {
  const ts = new Date('2024-03-05').getTime()
  assertEqual(BUILTINS.formatDate(ts), '2024-03-05', 'formatDate should produce YYYY-MM-DD')
  assertEqual(BUILTINS.formatDate(ts, '/'), '2024/03/05', 'formatDate with "/" separator')
  assertEqual(BUILTINS.formatDate(ts, ''), '20240305', 'formatDate with empty separator')
}

async function testFormatTime () {
  // Use a fixed timestamp: 2024-01-01T14:05:09Z but in local time may vary.
  // Instead verify structure: HH:MM:SS with correct lengths
  const ts = BUILTINS.now()
  const result = BUILTINS.formatTime(ts)
  assert(typeof result === 'string', 'formatTime() should return a string')
  const parts = result.split(':')
  assertEqual(parts.length, 3, 'formatTime() should produce HH:MM:SS (3 parts)')
  assertEqual(parts[0].length, 2, 'Hour should be 2 digits')
  assertEqual(parts[1].length, 2, 'Minute should be 2 digits')
  assertEqual(parts[2].length, 2, 'Second should be 2 digits')
}

async function testFormatTimeSeparator () {
  const ts = BUILTINS.now()
  const result = BUILTINS.formatTime(ts, '-')
  const parts = result.split('-')
  assertEqual(parts.length, 3, 'formatTime(ts, "-") should produce HH-MM-SS (3 parts)')
}

// ===== Parser Integration Tests =====
// Verify that function call syntax parses correctly (existing behaviour preserved)

async function testFunctionCallParses () {
  const storyText = `function__ double(x) {
  return__ x * 2
}
section__
  result = double(5)
__section`

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  assert(parsed !== null, 'Story with function call should parse successfully')
  assert(parsed.sections.length > 0, 'Should have sections')

  const funcDef = parsed.persistent.functions.double
  assert(funcDef !== undefined, 'Function "double" should be stored in persistent.functions')
  assertEqual(funcDef.name, 'double', 'Function name should be "double"')
  assertEqual(funcDef.params.length, 1, 'Function should have 1 param')
  assertEqual(funcDef.params[0], 'x', 'Param should be "x"')
}

export async function runBuiltinsTests () {
  return runTestSuite('Built-in Library Functions', [
    { name: 'abs()', fn: testAbs },
    { name: 'floor()', fn: testFloor },
    { name: 'ceil()', fn: testCeil },
    { name: 'round()', fn: testRound },
    { name: 'sqrt()', fn: testSqrt },
    { name: 'pow(base, exp)', fn: testPow },
    { name: 'min(...args)', fn: testMin },
    { name: 'max(...args)', fn: testMax },
    { name: 'random()', fn: testRandom },
    { name: 'randomInt(min, max)', fn: testRandomInt },
    { name: 'randomChoice(arr)', fn: testRandomChoice },
    { name: 'pick(arr)', fn: testPick },
    { name: 'chance(percent)', fn: testChance },
    { name: 'shuffle(arr)', fn: testShuffle },
    { name: 'setSeed()/seededRandom() deterministic', fn: testSeededRandomDeterministic },
    { name: 'seededRandom() with different seeds', fn: testSeededRandomDifferentSeed },
    { name: 'seededRandomInt(min, max)', fn: testSeededRandomIntRange },
    { name: 'setSeed(invalid) normalizes', fn: testSetSeedInvalidNormalizes },
    { name: 'toNumber(x)', fn: testToNumber },
    { name: 'toString(x)', fn: testToString },
    { name: 'upper(x)', fn: testUpper },
    { name: 'lower(x)', fn: testLower },
    { name: 'trim(x)', fn: testTrim },
    { name: 'replace(x, search, replacement)', fn: testReplace },
    { name: 'slice(x, start, end)', fn: testSlice },
    { name: 'startsWith(x, prefix)', fn: testStartsWith },
    { name: 'endsWith(x, suffix)', fn: testEndsWith },
    { name: 'capitalize(x)', fn: testCapitalize },
    { name: 'slugify(x)', fn: testSlugify },
    { name: 'stripTags(x)', fn: testStripTags },
    { name: 'sanitize(x)', fn: testSanitize },
    { name: 'split(x, sep)', fn: testSplit },
    { name: 'join(arr, sep)', fn: testJoin },
    { name: 'type(x)', fn: testType },
    { name: 'len(x)', fn: testLen },
    { name: 'contains(collection, item)', fn: testContains },
    { name: 'clamp(value, min, max)', fn: testClamp },
    { name: 'sum(arr)', fn: testSum },
    { name: 'avg(arr)', fn: testAvg },
    { name: 'unique(arr)', fn: testUnique },
    { name: 'findIndex(arr, item)', fn: testFindIndex },
    { name: 'range(n)', fn: testRangeOneArg },
    { name: 'range(start, end)', fn: testRangeTwoArgs },
    { name: 'now()', fn: testNow },
    { name: 'year()', fn: testYear },
    { name: 'month()', fn: testMonth },
    { name: 'day()', fn: testDay },
    { name: 'hour()', fn: testHour },
    { name: 'minute()', fn: testMinute },
    { name: 'second()', fn: testSecond },
    { name: 'dayOfWeek()', fn: testDayOfWeek },
    { name: 'formatDate(ts, sep)', fn: testFormatDate },
    { name: 'formatTime(ts)', fn: testFormatTime },
    { name: 'formatTime(ts, sep)', fn: testFormatTimeSeparator },
    { name: 'function call parses (regression)', fn: testFunctionCallParses }
  ])
}

// Run directly
runBuiltinsTests()
  .then(passed => process.exit(passed ? 0 : 1))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
