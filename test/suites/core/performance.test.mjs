/**
 * Performance Tests
 *
 * Benchmarks for arrays, loops, and functions
 */

import IFScript from '../../../src/IFScript.mjs'
import versions from '../../../src/constants/versions.mjs'
import { pathToFileURL } from 'url'
import {
  assert,
  createTimer,
  formatDuration
} from '../../support/test-utils.mjs'

// ===== Array Performance =====

async function benchmarkArrayCreationSmall () {
  const timer = createTimer()

  const storyText = `
    section__
      arr = [${Array.from({ length: 100 }, (_, i) => i).join(', ')}]
    __section
  `

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()

  timer.start()
  const parsed = await ifScript.parse(storyText)
  const duration = timer.end()

  assert(parsed !== null, 'Should parse successfully')

  return duration
}

async function benchmarkArrayCreationMedium () {
  const timer = createTimer()

  const storyText = `
    section__
      arr = [${Array.from({ length: 1000 }, (_, i) => i).join(', ')}]
    __section
  `

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()

  timer.start()
  const parsed = await ifScript.parse(storyText)
  const duration = timer.end()

  assert(parsed !== null, 'Should parse successfully')

  return duration
}

async function benchmarkNestedArrays () {
  const timer = createTimer()

  // Create 10x10 matrix
  const matrix = Array.from({ length: 10 }, () =>
    '[' + Array.from({ length: 10 }, (_, i) => i).join(', ') + ']'
  ).join(', ')

  const storyText = `
    section__
      matrix = [${matrix}]
    __section
  `

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()

  timer.start()
  const parsed = await ifScript.parse(storyText)
  const duration = timer.end()

  assert(parsed !== null, 'Should parse successfully')

  return duration
}

async function benchmarkArrayAccess () {
  const timer = createTimer()

  const accesses = Array.from({ length: 50 }, (_, i) => `elem${i} = arr[${i}]`).join('\n      ')

  const storyText = `
    section__
      arr = [${Array.from({ length: 100 }, (_, i) => i).join(', ')}]
      ${accesses}
    __section
  `

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()

  timer.start()
  const parsed = await ifScript.parse(storyText)
  const duration = timer.end()

  assert(parsed !== null, 'Should parse successfully')

  return duration
}

// ===== Loop Performance =====

async function benchmarkSimpleLoop () {
  const timer = createTimer()

  const storyText = `
    section__
      i = 0
      sum = 0
      while__ (i < 100) {
        sum = sum + i
        i = i + 1
      }
    __section
  `

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()

  timer.start()
  const parsed = await ifScript.parse(storyText)
  const duration = timer.end()

  assert(parsed !== null, 'Should parse successfully')

  return duration
}

async function benchmarkNestedLoops () {
  const timer = createTimer()

  const storyText = `
    section__
      outer = 0
      sum = 0
      while__ (outer < 10) {
        inner = 0
        while__ (inner < 10) {
          sum = sum + 1
          inner = inner + 1
        }
        outer = outer + 1
      }
    __section
  `

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()

  timer.start()
  const parsed = await ifScript.parse(storyText)
  const duration = timer.end()

  assert(parsed !== null, 'Should parse successfully')

  return duration
}

async function benchmarkLoopWithBreak () {
  const timer = createTimer()

  const storyText = `
    section__
      i = 0
      while__ (i < 1000) {
        if__ (i == 50) {
          break__
        }
        i = i + 1
      }
    __section
  `

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()

  timer.start()
  const parsed = await ifScript.parse(storyText)
  const duration = timer.end()

  assert(parsed !== null, 'Should parse successfully')

  return duration
}

// ===== Function Performance =====

async function benchmarkSimpleFunctions () {
  const timer = createTimer()

  const functions = Array.from({ length: 10 }, (_, i) => `
    function__ func${i}(x) {
      return__ x + ${i}
    }
  `).join('\n')

  const calls = Array.from({ length: 10 }, (_, i) => `result${i} = func${i}(10)`).join('\n      ')

  const storyText = `
    ${functions}

    section__
      ${calls}
    __section
  `

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()

  timer.start()
  const parsed = await ifScript.parse(storyText)
  const duration = timer.end()

  assert(parsed !== null, 'Should parse successfully')

  return duration
}

async function benchmarkRecursiveFunction () {
  const timer = createTimer()

  const storyText = `
    function__ fibonacci(n) {
      if__ (n <= 1) {
        return__ n
      }
      return__ fibonacci(n - 1) + fibonacci(n - 2)
    }

    section__
      result = fibonacci(10)
    __section
  `

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()

  timer.start()
  const parsed = await ifScript.parse(storyText)
  const duration = timer.end()

  assert(parsed !== null, 'Should parse successfully')

  return duration
}

async function benchmarkFunctionWithLoop () {
  const timer = createTimer()

  const storyText = `
    function__ sumTo(n) {
      sum = 0
      i = 0
      while__ (i <= n) {
        sum = sum + i
        i = i + 1
      }
      return__ sum
    }

    section__
      result = sumTo(100)
    __section
  `

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()

  timer.start()
  const parsed = await ifScript.parse(storyText)
  const duration = timer.end()

  assert(parsed !== null, 'Should parse successfully')

  return duration
}

// ===== Complex Algorithm Performance =====

async function benchmarkSieveAlgorithm () {
  const timer = createTimer()

  const storyText = `
    function__ sieve(max) {
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
      result = sieve(50)
    __section
  `

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()

  timer.start()
  const parsed = await ifScript.parse(storyText)
  const duration = timer.end()

  assert(parsed !== null, 'Should parse successfully')

  return duration
}

async function benchmarkComplexStory () {
  const timer = createTimer()

  const storyText = `
    settings__
      @storyTitle "Performance Test"
      @startAt 1
    __settings

    function__ helper1(x) {
      return__ x * 2
    }

    function__ helper2(x) {
      return__ x + 10
    }

    section__
      @title "Main Section"

      arr1 = [1, 2, 3, 4, 5]
      arr2 = [6, 7, 8, 9, 10]
      arr3 = []

      i = 0
      while__ (i < arr1.length) {
        arr3.push(helper1(arr1[i]))
        i = i + 1
      }

      j = 0
      while__ (j < arr2.length) {
        arr3.push(helper2(arr2[j]))
        j = j + 1
      }

      total = 0
      k = 0
      while__ (k < arr3.length) {
        total = total + arr3[k]
        k = k + 1
      }

      choice__
        "Continue"
        @target 2
      __choice
    __section

    section__
      @title "Second Section"
      "Done"
    __section
  `

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()

  timer.start()
  const parsed = await ifScript.parse(storyText)
  const duration = timer.end()

  assert(parsed !== null, 'Should parse successfully')

  return duration
}

// ===== Parsing Multiple Times =====

async function benchmarkParsingMultipleTimes () {
  const storyText = `
    function__ factorial(n) {
      if__ (n <= 1) {
        return__ 1
      }
      return__ n * factorial(n - 1)
    }

    section__
      result = factorial(10)
    __section
  `

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()

  const timer = createTimer()
  timer.start()

  for (let i = 0; i < 10; i++) {
    const parsed = await ifScript.parse(storyText)
    assert(parsed !== null, 'Should parse successfully')
  }

  const duration = timer.end()

  return duration / 10 // Average time per parse
}

// ===== Run Benchmarks =====

export async function runPerformanceTests () {
  console.log('\n--- Performance Benchmarks ---')
  console.log('(Note: These are parsing benchmarks, not execution benchmarks)\n')

  const benchmarks = [
    { name: 'Array creation (100 elements)', fn: benchmarkArrayCreationSmall },
    { name: 'Array creation (1000 elements)', fn: benchmarkArrayCreationMedium },
    { name: 'Nested arrays (10x10 matrix)', fn: benchmarkNestedArrays },
    { name: 'Array access (50 accesses)', fn: benchmarkArrayAccess },
    { name: 'Simple loop (100 iterations)', fn: benchmarkSimpleLoop },
    { name: 'Nested loops (10x10)', fn: benchmarkNestedLoops },
    { name: 'Loop with break', fn: benchmarkLoopWithBreak },
    { name: 'Simple functions (10 functions)', fn: benchmarkSimpleFunctions },
    { name: 'Recursive function (Fibonacci)', fn: benchmarkRecursiveFunction },
    { name: 'Function with loop', fn: benchmarkFunctionWithLoop },
    { name: 'Sieve algorithm', fn: benchmarkSieveAlgorithm },
    { name: 'Complex story', fn: benchmarkComplexStory },
    { name: 'Parse 10 times (avg)', fn: benchmarkParsingMultipleTimes }
  ]

  const results = []

  for (const benchmark of benchmarks) {
    try {
      const duration = await benchmark.fn()
      results.push({ name: benchmark.name, duration, success: true })
      console.log(`✓ ${benchmark.name}: ${formatDuration(duration)}`)
    } catch (err) {
      results.push({ name: benchmark.name, duration: 0, success: false })
      console.error(`✗ ${benchmark.name}: ${err.message}`)
    }
  }

  // Summary
  const successful = results.filter(r => r.success)
  const totalDuration = successful.reduce((sum, r) => sum + r.duration, 0)
  const avgDuration = totalDuration / successful.length

  console.log('\n=== Summary ===')
  console.log(`Total benchmarks: ${results.length}`)
  console.log(`Successful: ${successful.length}`)
  console.log(`Average parse time: ${formatDuration(avgDuration)}`)
  console.log(`Total time: ${formatDuration(totalDuration)}`)

  // Find slowest and fastest
  if (successful.length > 0) {
    const sorted = [...successful].sort((a, b) => b.duration - a.duration)
    console.log(`\nSlowest: ${sorted[0].name} (${formatDuration(sorted[0].duration)})`)
    console.log(`Fastest: ${sorted[sorted.length - 1].name} (${formatDuration(sorted[sorted.length - 1].duration)})`)
  }

  return successful.length === results.length
}

// Run if executed directly
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runPerformanceTests().then(passed => {
    process.exit(passed ? 0 : 1)
  })
}
