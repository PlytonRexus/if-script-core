/**
 * Master Test Runner
 *
 * Runs all Turing Completeness test suites
 */

import { runTuringTests } from './turing-test.mjs'
import { runSafetyTests } from './safety-limits-test.mjs'
import { runRegressionTests } from './regression-test.mjs'
import { runEdgeCaseTests } from './edge-cases-test.mjs'
import { runPerformanceTests } from './performance-test.mjs'
import { runErrorMessageTests } from './error-messages-test.mjs'
import { runCheckTests } from './check-test.mjs'
import { runSaveResumeTests } from './save-resume-test.mjs'
import { runRuntimeV2Tests } from './runtime-v2-test.mjs'

console.log('╔══════════════════════════════════════════════════════════════╗')
console.log('║  IF-Script Turing Completeness Test Suite                   ║')
console.log('║  Testing Arrays, Loops, and Functions                       ║')
console.log('╚══════════════════════════════════════════════════════════════╝')

async function runAllTests () {
  const suites = [
    {
      name: 'Core Feature Tests',
      description: 'Arrays, loops, and functions',
      fn: runTuringTests,
      critical: true
    },
    {
      name: 'Safety Limits',
      description: 'MAX_ITERATIONS and MAX_CALL_DEPTH',
      fn: runSafetyTests,
      critical: true
    },
    {
      name: 'Regression Tests',
      description: 'Backward compatibility',
      fn: runRegressionTests,
      critical: true
    },
    {
      name: 'Edge Cases',
      description: 'Boundary conditions',
      fn: runEdgeCaseTests,
      critical: false
    },
    {
      name: 'Performance Benchmarks',
      description: 'Parsing speed',
      fn: runPerformanceTests,
      critical: false
    },
    {
      name: 'Error Messages',
      description: 'Error quality',
      fn: runErrorMessageTests,
      critical: false
    },
    {
      name: 'CLI Check Command',
      description: 'Static diagnostics command',
      fn: runCheckTests,
      critical: false
    },
    {
      name: 'Save/Resume Helpers',
      description: 'Autosave payload and restore behavior',
      fn: runSaveResumeTests,
      critical: false
    },
    {
      name: 'Runtime v2 / Metadata',
      description: 'New runtime API and cinematic metadata parsing',
      fn: runRuntimeV2Tests,
      critical: false
    }
  ]

  const results = []
  const startTime = process.hrtime.bigint()

  for (const suite of suites) {
    console.log(`\n${'='.repeat(64)}`)
    console.log(`${suite.name} - ${suite.description}`)
    console.log('='.repeat(64))

    try {
      const passed = await suite.fn()
      results.push({
        name: suite.name,
        passed,
        critical: suite.critical
      })
    } catch (error) {
      console.error(`\n✗ Suite failed with error: ${error.message}`)
      if (error.stack) {
        console.error(error.stack)
      }
      results.push({
        name: suite.name,
        passed: false,
        critical: suite.critical
      })
    }
  }

  const endTime = process.hrtime.bigint()
  const totalDuration = Number(endTime - startTime) / 1000000000 // Convert to seconds

  // Summary
  console.log('\n' + '='.repeat(64))
  console.log('SUMMARY')
  console.log('='.repeat(64))

  const passed = results.filter(r => r.passed)
  const failed = results.filter(r => !r.passed)
  const criticalFailed = failed.filter(r => r.critical)

  console.log('\nTest Suites:')
  results.forEach(r => {
    const status = r.passed ? '✓' : '✗'
    const badge = r.critical ? '[CRITICAL]' : '[OPTIONAL]'
    const color = r.passed ? '' : ''
    console.log(`  ${status} ${badge} ${r.name}`)
  })

  console.log(`\nResults: ${passed.length}/${results.length} suites passed`)
  console.log(`Total time: ${totalDuration.toFixed(2)}s`)

  if (failed.length > 0) {
    console.log(`\nFailed suites (${failed.length}):`)
    failed.forEach(r => {
      const badge = r.critical ? '[CRITICAL]' : '[OPTIONAL]'
      console.log(`  - ${badge} ${r.name}`)
    })
  }

  // Determine overall status
  const allPassed = results.every(r => r.passed)
  const allCriticalPassed = criticalFailed.length === 0

  console.log('\n' + '='.repeat(64))

  if (allPassed) {
    console.log('✓ ALL TESTS PASSED')
    console.log('='.repeat(64))
    return 0
  } else if (allCriticalPassed) {
    console.log('⚠ ALL CRITICAL TESTS PASSED (some optional tests failed)')
    console.log('='.repeat(64))
    return 0
  } else {
    console.log('✗ CRITICAL TESTS FAILED')
    console.log('='.repeat(64))
    return 1
  }
}

// Run all tests
runAllTests()
  .then(exitCode => {
    process.exit(exitCode)
  })
  .catch(error => {
    console.error('\n✗ Test runner crashed:', error)
    console.error(error.stack)
    process.exit(1)
  })
