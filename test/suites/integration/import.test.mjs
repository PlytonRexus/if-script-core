/**
 * Import System Tests
 *
 * Tests for the new multi-file import system with ModuleLoader
 */

import IFScript from '../../../src/IFScript.mjs'
import versions from '../../../src/constants/versions.mjs'
import { pathToFileURL } from 'url'

console.log('=== IF-Script Import System Tests ===\n')

// Test 1: Basic import functionality
async function testBasicImport () {
  console.log('Test 1: Basic Import')
  try {
    const ifScript = new IFScript(versions.STREAM)
    await ifScript.init()

    const story = `
settings__
  @storyTitle "Import Test Story"
  @startAt 1
__settings

import__"./fixtures/imports/common.partial.if"__import

section__
  @title "Main Section"
  "Main story section"
  choice__
    @target 2
    "Continue"
  __choice
__section
`

    const parsed = await ifScript.parse(story, 'test/test-story.if')
    console.log('✓ Basic import parsed successfully')
    console.log(`  Sections found: ${parsed.sections.length}`)

    // Should have at least 2 sections (imported + defined)
    if (parsed.sections.length >= 2) {
      console.log('✓ Imported sections merged correctly\n')
      return true
    } else {
      console.log('✗ Expected at least 2 sections\n')
      return false
    }
  } catch (error) {
    console.error('✗ Basic import test failed:', error.message)
    if (error.cause) console.error('  Caused by:', error.cause.message)
    console.log()
    return false
  }
}

// Test 2: Module caching
async function testModuleCaching () {
  console.log('Test 2: Module Caching')
  try {
    const ifScript = new IFScript(versions.STREAM)
    await ifScript.init()

    const story = `
settings__
  @storyTitle "Caching Test"
  @startAt 1
__settings

import__"./fixtures/imports/common.partial.if"__import
import__"./fixtures/imports/common.partial.if"__import

section__
  @title "Main Section"
  "Test section"
__section
`

    await ifScript.parse(story, 'test/test-story.if')

    // Check cache size - should only load once
    const cacheStats = ifScript.moduleLoader.getCacheStats()
    console.log(`  Cache size: ${cacheStats.size}`)

    if (cacheStats.size === 1) {
      console.log('✓ Module caching works correctly\n')
      return true
    } else {
      console.log('✗ Expected cache size of 1\n')
      return false
    }
  } catch (error) {
    console.error('✗ Caching test failed:', error.message)
    console.log()
    return false
  }
}

// Test 3: File not found error handling
async function testFileNotFound () {
  console.log('Test 3: File Not Found Error Handling')
  try {
    const ifScript = new IFScript(versions.STREAM)
    await ifScript.init()

    const story = `
settings__
  @storyTitle "Error Test"
  @startAt 1
__settings

import__"./nonexistent-file.if"__import

section__
  @title "Main Section"
  "Test section"
__section
`

    await ifScript.parse(story, 'test/test-story.if')
    console.log('✗ Should have thrown ImportException\n')
    return false
  } catch (error) {
    if (error.type === 'ImportError') {
      console.log('✓ ImportException thrown correctly')
      console.log(`  Error: ${error.message}\n`)
      return true
    } else {
      console.error('✗ Wrong error type:', error)
      console.log()
      return false
    }
  }
}

// Test 4: Path resolution
async function testPathResolution () {
  console.log('Test 4: Path Resolution')
  try {
    const ifScript = new IFScript(versions.STREAM, {
      paths: {
        aliases: {
          '@imports': 'test/fixtures/imports'
        }
      }
    })
    await ifScript.init()

    const story = `
settings__
  @storyTitle "Alias Test"
  @startAt 1
__settings

import__"@imports/common.partial.if"__import

section__
  @title "Main Section"
  "Test section"
__section
`

    const parsed = await ifScript.parse(story, '<inline>')
    console.log('✓ Path alias resolved correctly')
    console.log(`  Sections found: ${parsed.sections.length}\n`)
    return true
  } catch (error) {
    console.error('✗ Path resolution test failed:', error.message)
    console.log()
    return false
  }
}

// Test 5: Nested imports
async function testNestedImports () {
  console.log('Test 5: Nested Imports')
  try {
    const ifScript = new IFScript(versions.STREAM)
    await ifScript.init()

    // chapter1.partial.if imports intro.partial.if
    const story = `
settings__
  @storyTitle "Nested Import Test"
  @startAt 1
__settings

import__"./fixtures/imports/chapter1.partial.if"__import

section__
  @title "Main Section"
  "Test section"
__section
`

    const parsed = await ifScript.parse(story, 'test/test-story.if')
    console.log('✓ Nested imports parsed successfully')
    console.log(`  Sections found: ${parsed.sections.length}`)

    // Check cache to verify both files were loaded
    const cacheStats = ifScript.moduleLoader.getCacheStats()
    console.log(`  Modules cached: ${cacheStats.size}`)
    console.log(`  Cached paths: ${cacheStats.paths.join(', ')}\n`)
    return true
  } catch (error) {
    console.error('✗ Nested imports test failed:', error.message)
    if (error.cause) console.error('  Caused by:', error.cause.message)
    console.log()
    return false
  }
}

// Run all tests
async function runTests () {
  const results = []

  results.push(await testBasicImport())
  results.push(await testModuleCaching())
  results.push(await testFileNotFound())
  results.push(await testPathResolution())
  results.push(await testNestedImports())

  const passed = results.filter(r => r).length
  const total = results.length

  console.log('=== Test Results ===')
  console.log(`${passed}/${total} tests passed`)

  if (passed === total) {
    console.log('✓ All tests passed!')
  } else {
    console.log(`✗ ${total - passed} test(s) failed`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runTests().catch(error => {
    console.error('Test runner failed:', error)
    process.exit(1)
  })
}
