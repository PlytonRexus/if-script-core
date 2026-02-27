import fs from 'fs/promises'
import path from 'path'
import IFScript from '../../../index.mjs'
import versions from '../../../src/constants/versions.mjs'
import {
  ROOT_STORY_PATH,
  ENDING_TITLES,
  buildSectionIndex,
  titleToIdMap
} from './thrones-config.mjs'

const OUTPUT_PATH = 'test/fixtures/stories/thrones.branch-map.json'

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

function findSectionTitle (story, sectionRef) {
  if (sectionRef === undefined || sectionRef === null || sectionRef === '') return null
  if (typeof sectionRef === 'number') {
    const section = story.sections.find(item => item.serial === sectionRef)
    return section && section.settings ? section.settings.title : null
  }
  return String(sectionRef)
}

function findScene (story, sceneRef) {
  if (sceneRef === undefined || sceneRef === null || sceneRef === '') return null
  if (typeof sceneRef === 'number') {
    return story.scenes.find(scene => scene.serial === sceneRef) || null
  }
  return story.scenes.find(scene => scene.name === sceneRef) || null
}

function collectChoicesFromSection (section) {
  const choices = []
  collectNodes(section.text, (node) => {
    if (node && node._class === 'Choice') {
      choices.push(node)
    }
  })
  return choices
}

function uniqueEdges (edges) {
  const seen = new Set()
  const unique = []
  for (const edge of edges) {
    const key = `${edge.from}|${edge.to}|${edge.targetType}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(edge)
  }
  return unique
}

async function run () {
  const rootPath = path.resolve(process.cwd(), ROOT_STORY_PATH)
  const outPath = path.resolve(process.cwd(), OUTPUT_PATH)
  const source = await fs.readFile(rootPath, 'utf-8')

  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  const story = await ifScript.parse(source, rootPath)

  const sectionIndex = buildSectionIndex()
  const sectionMetaByTitle = new Map(sectionIndex.map(section => [section.title, section]))
  const idByTitle = titleToIdMap()

  const sceneBySectionTitle = new Map()
  for (const scene of story.scenes) {
    for (const ref of scene.sections || []) {
      const title = findSectionTitle(story, ref)
      if (title) sceneBySectionTitle.set(title, scene.name)
    }
  }

  const sections = []
  const edges = []

  for (const section of story.sections) {
    const title = section && section.settings ? section.settings.title : null
    if (!title) continue

    const choices = collectChoicesFromSection(section)
    const choiceTargets = []

    for (const choice of choices) {
      if (!choice) continue
      const targetType = choice.targetType || 'section'

      if (targetType === 'scene') {
        const scene = findScene(story, choice.target)
        if (!scene) continue
        const firstTitle = findSectionTitle(story, scene.first)
        if (!firstTitle) continue
        edges.push({ from: title, to: firstTitle, targetType: 'scene' })
        choiceTargets.push(firstTitle)
      } else {
        const targetTitle = findSectionTitle(story, choice.target)
        if (!targetTitle) continue
        edges.push({ from: title, to: targetTitle, targetType: 'section' })
        choiceTargets.push(targetTitle)
      }
    }

    const meta = sectionMetaByTitle.get(title)
    sections.push({
      id: idByTitle.get(title) || null,
      title,
      file: meta ? `test/fixtures/stories/thrones/${meta.moduleFile}` : null,
      scene: sceneBySectionTitle.get(title) || null,
      actTag: meta ? meta.actTag : null,
      ending: ENDING_TITLES.includes(title),
      choiceTargets
    })
  }

  const normalizedEdges = uniqueEdges(edges)
  const endings = sections.filter(section => section.ending).map(section => section.title)

  const payload = {
    meta: {
      storyTitle: story.settings ? story.settings.name : 'Thrones',
      startAt: story.settings ? story.settings.startAt : null,
      sectionCount: sections.length,
      endingCount: endings.length,
      builtAt: new Date().toISOString()
    },
    sections,
    edges: normalizedEdges
  }

  await fs.writeFile(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf-8')
  process.stdout.write(`Wrote ${OUTPUT_PATH} with ${sections.length} sections and ${normalizedEdges.length} edges.\n`)
}

run().catch((error) => {
  process.stderr.write(`thrones branch-map build failed: ${error.stack || error.message}\n`)
  process.exit(1)
})
