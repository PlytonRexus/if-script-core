import fs from 'fs/promises'
import path from 'path'
import IFScript from '../../../index.mjs'
import versions from '../../../src/constants/versions.mjs'
import { ROOT_STORY_PATH } from './thrones-config.mjs'

const EXPECTED_TOTAL_SECTIONS = 432
const EXPECTED_ENDINGS = 6

function collectNodes (nodes, visit, ctx = {}) {
  if (!Array.isArray(nodes)) return
  nodes.forEach(node => collectNode(node, visit, ctx))
}

function collectNode (node, visit, ctx = {}) {
  if (!node) return
  visit(node, ctx)

  const klass = node._class
  if (klass === 'ConditionalBlock') {
    collectNode(node.cond, visit, ctx)
    collectNode(node.then, visit, ctx)
    collectNodes(node.ifBlock, visit, ctx)
    collectNode(node.else, visit, ctx)
    collectNodes(node.elseBlock, visit, ctx)
    return
  }

  if (klass === 'Loop') {
    collectNode(node.condition, visit, ctx)
    collectNodes(node.body, visit, ctx)
    return
  }

  if (klass === 'FunctionDef') {
    collectNodes(node.body, visit, ctx)
    return
  }

  if (klass === 'Choice') {
    collectNodes(node.text, visit, ctx)
    collectNode(node.when, visit, ctx)
    collectNodes(node.actions, visit, ctx)
    return
  }

  if (klass === 'Action') {
    collectNode(node.left, visit, ctx)
    collectNode(node.right, visit, ctx)
    return
  }

  if (klass === 'FunctionCall') {
    collectNodes(node.args, visit, ctx)
    return
  }

  if (klass === 'ArrayLiteral') {
    collectNodes(node.elements, visit, ctx)
  }
}

function collectChoicesFromSection (section) {
  const choices = []
  collectNodes(section.text, (node) => {
    if (node && node._class === 'Choice') choices.push(node)
  })
  return choices
}

function resolveSectionTitle (story, sectionRef) {
  if (sectionRef === undefined || sectionRef === null || sectionRef === '') return null
  if (typeof sectionRef === 'number') {
    const section = story.sections.find(item => item.serial === sectionRef)
    return section && section.settings ? section.settings.title : null
  }
  return String(sectionRef)
}

function resolveScene (story, sceneRef) {
  if (sceneRef === undefined || sceneRef === null || sceneRef === '') return null
  if (typeof sceneRef === 'number') {
    return story.scenes.find(scene => scene.serial === sceneRef) || null
  }
  return story.scenes.find(scene => scene.name === sceneRef) || null
}

function bfsReachable (adjacency, start) {
  const visited = new Set()
  if (!start || !adjacency.has(start)) return visited

  const queue = [start]
  visited.add(start)

  while (queue.length > 0) {
    const current = queue.shift()
    const nextNodes = adjacency.get(current) || []
    for (const next of nextNodes) {
      if (!visited.has(next)) {
        visited.add(next)
        queue.push(next)
      }
    }
  }

  return visited
}

function isEndingTitle (title) {
  return /^END-[A-F]:\s/.test(title)
}

function printFailures (failures) {
  failures.forEach((failure) => {
    process.stdout.write(`FAIL ${failure.code}: ${failure.message}\n`)
  })
}

async function run () {
  const rootPath = path.resolve(process.cwd(), ROOT_STORY_PATH)
  const source = await fs.readFile(rootPath, 'utf-8')

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const story = await ifScript.parse(source, rootPath)

  const failures = []
  const titleCounts = new Map()
  const sectionTitles = []

  for (const section of story.sections) {
    const title = section && section.settings ? section.settings.title : null
    if (!title) continue
    sectionTitles.push(title)
    titleCounts.set(title, (titleCounts.get(title) || 0) + 1)
  }

  if (sectionTitles.length !== EXPECTED_TOTAL_SECTIONS) {
    failures.push({
      code: 'SECTION_COUNT',
      message: `Expected ${EXPECTED_TOTAL_SECTIONS} sections but found ${sectionTitles.length}.`
    })
  }

  for (const [title, count] of titleCounts.entries()) {
    if (count > 1) {
      failures.push({
        code: 'DUPLICATE_TITLE',
        message: `Section title "${title}" appears ${count} times.`
      })
    }
  }

  const endingTitles = sectionTitles.filter(isEndingTitle)
  if (endingTitles.length !== EXPECTED_ENDINGS) {
    failures.push({
      code: 'ENDING_COUNT',
      message: `Expected ${EXPECTED_ENDINGS} endings but found ${endingTitles.length}.`
    })
  }

  const titleSet = new Set(sectionTitles)
  const adjacency = new Map(sectionTitles.map(title => [title, []]))

  for (const section of story.sections) {
    const sourceTitle = section && section.settings ? section.settings.title : null
    if (!sourceTitle) continue

    const choices = collectChoicesFromSection(section)
    for (const choice of choices) {
      const targetType = choice.targetType || 'section'
      let targetTitle = null

      if (targetType === 'scene') {
        const scene = resolveScene(story, choice.target)
        if (!scene) {
          failures.push({
            code: 'UNRESOLVED_SCENE_TARGET',
            message: `Choice in "${sourceTitle}" targets missing scene "${choice.target}".`
          })
          continue
        }
        targetTitle = resolveSectionTitle(story, scene.first)
      } else {
        targetTitle = resolveSectionTitle(story, choice.target)
      }

      if (!targetTitle || !titleSet.has(targetTitle)) {
        failures.push({
          code: 'UNRESOLVED_SECTION_TARGET',
          message: `Choice in "${sourceTitle}" targets missing section "${choice.target}".`
        })
        continue
      }

      adjacency.get(sourceTitle).push(targetTitle)
    }
  }

  const startAt = resolveSectionTitle(story, story.settings ? story.settings.startAt : null)
  if (!startAt || !titleSet.has(startAt)) {
    failures.push({
      code: 'START_AT_UNRESOLVED',
      message: `@startAt "${story.settings ? story.settings.startAt : null}" does not resolve to a section.`
    })
  }

  const reachable = bfsReachable(adjacency, startAt)

  for (const title of sectionTitles) {
    const outgoing = adjacency.get(title) || []
    const ending = isEndingTitle(title)

    if (ending && outgoing.length > 0) {
      failures.push({
        code: 'ENDING_WITH_CHOICES',
        message: `Ending section "${title}" has ${outgoing.length} outgoing choices.`
      })
    }

    if (!ending && outgoing.length === 0) {
      failures.push({
        code: 'DEAD_END_NON_ENDING',
        message: `Non-ending section "${title}" has no outgoing choices.`
      })
    }

    if (!ending && !reachable.has(title)) {
      failures.push({
        code: 'UNREACHABLE_NON_ENDING',
        message: `Non-ending section "${title}" is unreachable from @startAt.`
      })
    }
  }

  for (const title of endingTitles) {
    if (!reachable.has(title)) {
      failures.push({
        code: 'UNREACHABLE_ENDING',
        message: `Ending section "${title}" is unreachable from @startAt.`
      })
    }
  }

  const summary = {
    sections: sectionTitles.length,
    endings: endingTitles.length,
    reachable: reachable.size,
    failures: failures.length
  }

  if (failures.length > 0) {
    printFailures(failures)
    process.stdout.write(`Summary: sections=${summary.sections}, endings=${summary.endings}, reachable=${summary.reachable}, failures=${summary.failures}\n`)
    process.exit(1)
  }

  process.stdout.write(`PASS Thrones graph validation. sections=${summary.sections}, endings=${summary.endings}, reachable=${summary.reachable}\n`)
}

run().catch((error) => {
  process.stderr.write(`thrones graph validation failed: ${error.stack || error.message}\n`)
  process.exit(1)
})
