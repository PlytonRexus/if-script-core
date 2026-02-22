import fs from 'fs'
import path from 'path'
import IFScript from '../../index.mjs'
import BUILTINS from '../interpreters/custom/Builtins.mjs'

function makeDiagnostic (severity, code, message, {
  file = null,
  line = null,
  col = null,
  hint = null
} = {}) {
  return { severity, code, file, line, col, message, hint }
}

function formatLocation (d) {
  const file = d.file || '<story>'
  const line = typeof d.line === 'number' ? d.line : 0
  const col = typeof d.col === 'number' ? d.col : 0
  return `${file}:${line}:${col}`
}

function printHumanDiagnostics (diagnostics) {
  diagnostics.forEach(d => {
    process.stdout.write(`${d.severity.toUpperCase()} ${d.code} ${formatLocation(d)} ${d.message}\n`)
    if (d.hint) process.stdout.write(`  hint: ${d.hint}\n`)
  })
}

function collectNodes (nodes, visit, ctx = { inLoop: false, inFunction: false }) {
  if (!Array.isArray(nodes)) return
  nodes.forEach(node => collectNode(node, visit, ctx))
}

function collectNode (node, visit, ctx = { inLoop: false, inFunction: false }) {
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
    collectNode(node.condition, visit, { ...ctx, inLoop: true })
    collectNodes(node.body, visit, { ...ctx, inLoop: true })
    return
  }

  if (klass === 'FunctionDef') {
    collectNodes(node.body, visit, { ...ctx, inFunction: true })
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

function collectChoicesFromStory (story) {
  const choices = []
  story.sections.forEach(section => {
    collectNodes(section.text, (node) => {
      if (node && node._class === 'Choice') {
        choices.push({ choice: node, section })
      }
    })
  })
  return choices
}

function analyzeStory (story, inputPath) {
  const diagnostics = []

  const sectionTitles = new Map()
  const sceneNames = new Map()

  story.sections.forEach(section => {
    const title = section && section.settings ? section.settings.title : null
    if (typeof title === 'string' && title.trim() !== '') {
      if (!sectionTitles.has(title)) sectionTitles.set(title, [])
      sectionTitles.get(title).push(section.serial)
    }
  })

  story.scenes.forEach(scene => {
    const name = scene && scene.name
    if (typeof name === 'string' && name.trim() !== '') {
      if (!sceneNames.has(name)) sceneNames.set(name, [])
      sceneNames.get(name).push(scene.serial)
    }
  })

  sectionTitles.forEach((serials, title) => {
    if (serials.length > 1) {
      diagnostics.push(makeDiagnostic('warning', 'DUPLICATE_SECTION_TITLE', `Duplicate section title "${title}" used by sections: ${serials.join(', ')}`, {
        file: inputPath,
        hint: 'Use unique section titles when targeting by string reference.'
      }))
    }
  })

  sceneNames.forEach((serials, name) => {
    if (serials.length > 1) {
      diagnostics.push(makeDiagnostic('warning', 'DUPLICATE_SCENE_NAME', `Duplicate scene name "${name}" used by scenes: ${serials.join(', ')}`, {
        file: inputPath,
        hint: 'Use unique scene names when using @targetType "scene".'
      }))
    }
  })

  const sectionSerials = new Set(story.sections.map(s => s.serial))
  const sectionTitleSet = new Set(story.sections.map(s => s.settings && s.settings.title).filter(Boolean))
  const sceneSerials = new Set(story.scenes.map(s => s.serial))
  const sceneNameSet = new Set(story.scenes.map(s => s.name).filter(Boolean))

  collectChoicesFromStory(story).forEach(({ choice, section }) => {
    const isScene = choice.targetType === 'scene'
    const target = choice.target
    if (target === undefined || target === null || target === '') {
      diagnostics.push(makeDiagnostic('error', 'CHOICE_TARGET_MISSING', `Choice in section ${section.serial} is missing a target.`, {
        file: inputPath
      }))
      return
    }

    const exists = isScene
      ? (typeof target === 'number' ? sceneSerials.has(target) : sceneNameSet.has(target))
      : (typeof target === 'number' ? sectionSerials.has(target) : sectionTitleSet.has(target))

    if (!exists) {
      diagnostics.push(makeDiagnostic('error', 'CHOICE_TARGET_UNRESOLVED', `Choice in section ${section.serial} points to unknown ${isScene ? 'scene' : 'section'} target "${target}".`, {
        file: inputPath,
        hint: isScene ? 'Create the scene or update @target/@targetType.' : 'Create the section or update @target.'
      }))
    }
  })

  story.sections.forEach(section => {
    collectNodes(section.text, (node, ctx) => {
      if (node && node.type === 'break' && !ctx.inLoop) {
        diagnostics.push(makeDiagnostic('error', 'BREAK_OUTSIDE_LOOP', `break__ used outside loop in section ${section.serial}.`, {
          file: inputPath
        }))
      }
      if (node && node.type === 'continue' && !ctx.inLoop) {
        diagnostics.push(makeDiagnostic('error', 'CONTINUE_OUTSIDE_LOOP', `continue__ used outside loop in section ${section.serial}.`, {
          file: inputPath
        }))
      }
      if (node && node._class === 'Action' && node.type === 'return' && !ctx.inFunction) {
        diagnostics.push(makeDiagnostic('error', 'RETURN_OUTSIDE_FUNCTION', `return__ used outside function in section ${section.serial}.`, {
          file: inputPath
        }))
      }
    }, { inLoop: false, inFunction: false })
  })

  story.functions.forEach(func => {
    if (Object.prototype.hasOwnProperty.call(BUILTINS, func.name)) {
      diagnostics.push(makeDiagnostic('warning', 'FUNCTION_SHADOWS_BUILTIN', `Function "${func.name}" shadows a builtin function.`, {
        file: inputPath,
        hint: 'Rename the function to avoid unexpected calls to the builtin.'
      }))
    }
  })

  return diagnostics
}

async function check (argv) {
  const cwd = process.cwd()
  const inputArg = argv.i || argv['input-file']
  const inputPath = path.resolve(cwd, inputArg)
  const asJson = argv.json === true

  try {
    const content = await fs.promises.readFile(inputPath, 'utf-8')
    const ifscript = new IFScript('STREAM')
    await ifscript.init()
    const parsed = await ifscript.parse(content, inputPath)
    const diagnostics = analyzeStory(parsed, inputPath)
    const errors = diagnostics.filter(d => d.severity === 'error').length
    const warnings = diagnostics.filter(d => d.severity === 'warning').length
    const payload = { summary: { errors, warnings }, diagnostics }

    if (asJson) {
      process.stdout.write(JSON.stringify(payload, null, 2) + '\n')
    } else {
      if (diagnostics.length === 0) {
        process.stdout.write('No diagnostics found.\n')
      } else {
        printHumanDiagnostics(diagnostics)
      }
      process.stdout.write(`Summary: ${errors} error(s), ${warnings} warning(s)\n`)
    }

    process.exitCode = errors > 0 ? 1 : 0
  } catch (err) {
    const diagnostic = makeDiagnostic('error', 'PARSE_OR_IMPORT_ERROR', err.message, {
      file: err.file || inputPath,
      line: err.line,
      col: err.col,
      hint: err.hint || null
    })
    if (asJson) {
      process.stdout.write(JSON.stringify({ summary: { errors: 1, warnings: 0 }, diagnostics: [diagnostic] }, null, 2) + '\n')
    } else {
      printHumanDiagnostics([diagnostic])
      process.stdout.write('Summary: 1 error(s), 0 warning(s)\n')
    }
    process.exitCode = 1
  }
}

export default check
