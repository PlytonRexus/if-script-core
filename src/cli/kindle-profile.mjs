const DEFAULT_PROFILE = 'default'
const KINDLE_ANY_PROFILE = 'kindle-any'
const KINDLE_STRICT_PROFILE = 'kindle-strict'

const ALL_PROFILES = [DEFAULT_PROFILE, KINDLE_ANY_PROFILE, KINDLE_STRICT_PROFILE]
const KINDLE_PROFILES = [KINDLE_ANY_PROFILE, KINDLE_STRICT_PROFILE]

const NON_DETERMINISTIC_BUILTINS = new Set([
  'random',
  'randomInt',
  'seededRandom',
  'seededRandomInt',
  'randomChoice',
  'pick',
  'chance',
  'shuffle',
  'now',
  'year',
  'month',
  'day',
  'hour',
  'minute',
  'second',
  'dayOfWeek',
  'formatDate',
  'formatTime'
])

const RESERVED_VARIABLES = new Set(['turn', 'functions'])

function isTruthyString (value) {
  return typeof value === 'string' && value.trim() !== ''
}

function isNumberRef (value) {
  return typeof value === 'number' && !Number.isNaN(value)
}

function resolveFunctionName (node) {
  if (!node) return null
  if (typeof node.name === 'string') return node.name
  if (node.name && typeof node.name.symbol === 'string') return node.name.symbol
  return null
}

function buildDiagnostic (severity, code, message, inputPath, hint = null) {
  return {
    severity,
    code,
    file: inputPath || null,
    line: null,
    col: null,
    message,
    hint
  }
}

function createSectionNoteStore (story) {
  const notes = new Map()
  ;(story.sections || []).forEach(section => {
    if (!section || typeof section.serial !== 'number') return
    notes.set(section.serial, new Set())
  })
  return notes
}

function addSectionNote (sectionNotes, sectionSerial, message) {
  if (!sectionNotes || typeof sectionSerial !== 'number' || !message) return
  if (!sectionNotes.has(sectionSerial)) sectionNotes.set(sectionSerial, new Set())
  sectionNotes.get(sectionSerial).add(message)
}

function pushCount (counts, key, amount = 1) {
  counts[key] = (counts[key] || 0) + amount
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
    collectNode(node.input, visit, ctx)
    collectNode(node.variables, visit, ctx)
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

  if (klass === 'ArrayAccess') {
    collectNode(node.array, visit, ctx)
    collectNode(node.index, visit, ctx)
    return
  }

  if (klass === 'MemberAccess') {
    collectNode(node.object, visit, ctx)
    collectNodes(node.args, visit, ctx)
    return
  }

  if (klass === 'ArrayLiteral') {
    collectNodes(node.elements, visit, ctx)
  }
}

function uniqueChoiceKey (choice) {
  const owner = choice && choice.owner !== undefined ? choice.owner : 'na'
  const choiceI = choice && choice.choiceI !== undefined ? choice.choiceI : 'na'
  const target = choice && choice.target !== undefined ? choice.target : 'na'
  const targetType = choice && choice.targetType ? choice.targetType : 'section'
  return `${owner}|${choiceI}|${targetType}|${target}`
}

function collectChoicesFromSection (section) {
  const choices = []
  const seen = new Set()
  if (!section) return choices

  collectNodes(section.text, (node) => {
    if (!node || node._class !== 'Choice') return
    const key = uniqueChoiceKey(node)
    if (seen.has(key)) return
    seen.add(key)
    choices.push(node)
  })

  ;(section.choices || []).forEach(choice => {
    if (!choice || choice._class !== 'Choice') return
    const key = uniqueChoiceKey(choice)
    if (seen.has(key)) return
    seen.add(key)
    choices.push(choice)
  })

  return choices
}

function resolveSectionByRef (story, sectionRef) {
  if (!story || sectionRef === undefined || sectionRef === null || sectionRef === '') return null
  if (isNumberRef(sectionRef)) {
    return (story.sections || []).find(section => section && section.serial === sectionRef) || null
  }
  return (story.sections || []).find(section => section && section.settings && section.settings.title === String(sectionRef)) || null
}

function resolveSceneByRef (story, sceneRef) {
  if (!story || sceneRef === undefined || sceneRef === null || sceneRef === '') return null
  if (isNumberRef(sceneRef)) {
    return (story.scenes || []).find(scene => scene && scene.serial === sceneRef) || null
  }
  return (story.scenes || []).find(scene => scene && scene.name === String(sceneRef)) || null
}

function resolveChoiceTargetSection (story, choice) {
  if (!choice) return null
  if (choice.targetType === 'scene') {
    const scene = resolveSceneByRef(story, choice.target)
    if (!scene) return null
    return resolveSectionByRef(story, scene.first)
  }
  return resolveSectionByRef(story, choice.target)
}

function extractTokenText (node) {
  if (!node) return ''
  if (node._class === 'Token') {
    if (node.type === 'VARIABLE') return '${' + node.symbol + '}'
    return node.symbol != null ? String(node.symbol) : ''
  }
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(extractTokenText).join('')
  return ''
}

function renderChoiceTextPlain (choice) {
  const text = extractTokenText(choice && choice.text ? choice.text : [])
  const compact = String(text || '').replace(/\s+/g, ' ').trim()
  return compact || 'Continue'
}

function profileSeverity (profile) {
  return profile === KINDLE_STRICT_PROFILE ? 'error' : 'warning'
}

function addVariableDependency (target, name) {
  if (typeof name !== 'string') return
  const trimmed = name.trim()
  if (!trimmed || RESERVED_VARIABLES.has(trimmed)) return
  target.add(trimmed)
}

function collectVariableNamesFromBinding (input, out) {
  if (typeof input === 'string') {
    addVariableDependency(out, input)
    return
  }
  if (Array.isArray(input)) {
    input.forEach(entry => collectVariableNamesFromBinding(entry, out))
    return
  }
  if (!input || typeof input !== 'object') return
  if (input._class === 'Token' && input.type === 'VARIABLE') {
    addVariableDependency(out, input.symbol)
    return
  }
  if (typeof input.symbol === 'string' && !input.type) {
    addVariableDependency(out, input.symbol)
  }
}

function collectStoryVariableDependencies (story) {
  const all = new Set()
  const bySection = new Map()
  const functionStack = []

  const addToSection = (sectionSerial, value) => {
    if (sectionSerial === null) return
    if (!bySection.has(sectionSerial)) bySection.set(sectionSerial, new Set())
    bySection.get(sectionSerial).add(value)
  }

  const visitWithScope = (node, sectionSerial = null) => {
    if (!node || typeof node !== 'object') return

    if (node._class === 'FunctionDef') {
      const params = new Set((node.params || []).filter(param => typeof param === 'string' && param.trim() !== ''))
      functionStack.push(params)
      ;(node.body || []).forEach(entry => visitWithScope(entry, sectionSerial))
      functionStack.pop()
      return
    }

    if (node._class === 'Token' && node.type === 'VARIABLE') {
      const name = typeof node.symbol === 'string' ? node.symbol.trim() : ''
      const currentParams = functionStack[functionStack.length - 1]
      if (name && !(currentParams && currentParams.has(name)) && !RESERVED_VARIABLES.has(name)) {
        all.add(name)
        addToSection(sectionSerial, name)
      }
      return
    }

    if (node._class === 'Token' && node.type === 'STRING' && typeof node.symbol === 'string') {
      const matches = Array.from(node.symbol.matchAll(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g))
      matches.forEach((match) => {
        const name = match[1]
        if (!name || RESERVED_VARIABLES.has(name)) return
        const currentParams = functionStack[functionStack.length - 1]
        if (currentParams && currentParams.has(name)) return
        all.add(name)
        addToSection(sectionSerial, name)
      })
      return
    }

    if (node._class === 'Choice') {
      collectVariableNamesFromBinding(node.input, all)
      collectVariableNamesFromBinding(node.variables, all)
      if (sectionSerial !== null) {
        if (!bySection.has(sectionSerial)) bySection.set(sectionSerial, new Set())
        const store = bySection.get(sectionSerial)
        collectVariableNamesFromBinding(node.input, store)
        collectVariableNamesFromBinding(node.variables, store)
      }
    }

    const klass = node._class
    if (klass === 'ConditionalBlock') {
      visitWithScope(node.cond, sectionSerial)
      visitWithScope(node.then, sectionSerial)
      ;(node.ifBlock || []).forEach(entry => visitWithScope(entry, sectionSerial))
      visitWithScope(node.else, sectionSerial)
      ;(node.elseBlock || []).forEach(entry => visitWithScope(entry, sectionSerial))
      return
    }
    if (klass === 'Loop') {
      visitWithScope(node.condition, sectionSerial)
      ;(node.body || []).forEach(entry => visitWithScope(entry, sectionSerial))
      return
    }
    if (klass === 'Choice') {
      ;(node.text || []).forEach(entry => visitWithScope(entry, sectionSerial))
      visitWithScope(node.input, sectionSerial)
      visitWithScope(node.variables, sectionSerial)
      visitWithScope(node.when, sectionSerial)
      ;(node.actions || []).forEach(entry => visitWithScope(entry, sectionSerial))
      return
    }
    if (klass === 'Action') {
      visitWithScope(node.left, sectionSerial)
      visitWithScope(node.right, sectionSerial)
      return
    }
    if (klass === 'FunctionCall') {
      ;(node.args || []).forEach(entry => visitWithScope(entry, sectionSerial))
      return
    }
    if (klass === 'ArrayAccess') {
      visitWithScope(node.array, sectionSerial)
      visitWithScope(node.index, sectionSerial)
      return
    }
    if (klass === 'MemberAccess') {
      visitWithScope(node.object, sectionSerial)
      ;(node.args || []).forEach(entry => visitWithScope(entry, sectionSerial))
      return
    }
    if (klass === 'ArrayLiteral') {
      ;(node.elements || []).forEach(entry => visitWithScope(entry, sectionSerial))
    }
  }

  ;(story.sections || []).forEach(section => {
    const serial = typeof section?.serial === 'number' ? section.serial : null
    collectNodes(section?.text || [], (node) => visitWithScope(node, serial))
    ;(section?.choices || []).forEach(choice => visitWithScope(choice, serial))
  })

  ;(story.functions || []).forEach(func => visitWithScope(func, null))

  return {
    all,
    bySection
  }
}

function analyzeKindleCompatibility (story, inputPath, profile = KINDLE_ANY_PROFILE, options = {}) {
  const severity = profileSeverity(profile)
  const diagnostics = []
  const sectionNotes = createSectionNoteStore(story)
  const droppedCounts = {
    droppedTimers: 0,
    droppedMedia: 0,
    droppedRuntimeUi: 0
  }
  const blockerCounts = {
    unsupportedInputChoices: 0,
    undeclaredExportState: 0,
    nondeterministicBuiltins: 0
  }

  const kindleConfig = options.kindleConfig || null
  const allowedVariables = new Set(kindleConfig && kindleConfig.state ? kindleConfig.state.variableNames : [])

  if (!kindleConfig) {
    diagnostics.push(buildDiagnostic(
      'error',
      'KINDLE_CONFIG_REQUIRED',
      'Kindle compile/check requires --kindle-config for variant-aware export.',
      inputPath,
      'Provide a sidecar JSON config that declares export-safe state domains.'
    ))
    return {
      diagnostics,
      droppedFeatureCounts: droppedCounts,
      blockerCounts,
      sectionNotes: Object.fromEntries(Array.from(sectionNotes.entries()).map(([serial, notes]) => [serial, Array.from(notes)]))
    }
  }

  const settings = story && story.settings ? story.settings : {}
  if (settings && settings.fullTimer && settings.fullTimer.timer > 0) pushCount(droppedCounts, 'droppedTimers')
  if (settings && settings.autoSave === true) pushCount(droppedCounts, 'droppedRuntimeUi')
  if (settings && settings.referrable === true) pushCount(droppedCounts, 'droppedRuntimeUi')
  if (settings && isTruthyString(settings.theme)) pushCount(droppedCounts, 'droppedRuntimeUi')
  if (settings && isTruthyString(settings.presentationMode) && settings.presentationMode !== 'literary') {
    pushCount(droppedCounts, 'droppedRuntimeUi')
  }
  if (story && story.stats && Object.keys(story.stats).length > 0) pushCount(droppedCounts, 'droppedRuntimeUi')

  ;(story.scenes || []).forEach(scene => {
    if (!scene) return
    if (isTruthyString(scene.music)) pushCount(droppedCounts, 'droppedMedia')
    if (scene.sceneTransition && scene.sceneTransition !== 'cut') pushCount(droppedCounts, 'droppedMedia')
  })

  ;(story.sections || []).forEach(section => {
    if (!section || !section.settings) return
    const cfg = section.settings
    if (cfg.timer && cfg.timer.timer > 0) {
      pushCount(droppedCounts, 'droppedTimers')
      addSectionNote(sectionNotes, section.serial, 'Timers are removed in Kindle mode.')
    }
    if (isTruthyString(cfg.ambience)) {
      pushCount(droppedCounts, 'droppedMedia')
      addSectionNote(sectionNotes, section.serial, 'Audio ambience is removed in Kindle mode.')
    }
    if (Array.isArray(cfg.sfx) && cfg.sfx.length > 0) {
      pushCount(droppedCounts, 'droppedMedia')
      addSectionNote(sectionNotes, section.serial, 'Sound effects are removed in Kindle mode.')
    }
    if (isTruthyString(cfg.backdrop) || cfg.shot !== 'medium' || cfg.textPacing !== 'instant') {
      pushCount(droppedCounts, 'droppedMedia')
      addSectionNote(sectionNotes, section.serial, 'Visual presentation hints are removed in Kindle mode.')
    }

    const choices = collectChoicesFromSection(section)
    choices.forEach(choice => {
      if (choice && choice.mode === 'input') {
        pushCount(blockerCounts, 'unsupportedInputChoices')
        addSectionNote(sectionNotes, section.serial, 'Input choices are not supported in Kindle mode.')
      }
      if (choice && (isTruthyString(choice.choiceSfx) || isTruthyString(choice.focusSfx))) {
        pushCount(droppedCounts, 'droppedMedia')
        addSectionNote(sectionNotes, section.serial, 'Choice sound cues are removed in Kindle mode.')
      }
    })
  })

  collectNodes((story.sections || []).flatMap(section => section && section.text ? section.text : []), (node) => {
    if (!node || node._class !== 'FunctionCall') return
    const fnName = resolveFunctionName(node)
    if (!fnName || !NON_DETERMINISTIC_BUILTINS.has(fnName)) return
    pushCount(blockerCounts, 'nondeterministicBuiltins')
  })

  ;(story.functions || []).forEach(func => {
    collectNodes(func && func.body ? func.body : [], (node) => {
      if (!node || node._class !== 'FunctionCall') return
      const fnName = resolveFunctionName(node)
      if (!fnName || !NON_DETERMINISTIC_BUILTINS.has(fnName)) return
      pushCount(blockerCounts, 'nondeterministicBuiltins')
    })
  })

  const dependencies = collectStoryVariableDependencies(story)
  const undeclared = Array.from(dependencies.all).filter(name => !allowedVariables.has(name)).sort((left, right) => left.localeCompare(right))
  if (undeclared.length > 0) {
    blockerCounts.undeclaredExportState = undeclared.length
    undeclared.forEach((name) => {
      diagnostics.push(buildDiagnostic(
        'error',
        'KINDLE_UNDECLARED_EXPORT_STATE',
        `Kindle export-safe state does not declare variable "${name}".`,
        inputPath,
        'Add the variable to --kindle-config state.variables or remove it from Kindle-visible logic/text.'
      ))
    })
  }

  if (droppedCounts.droppedTimers > 0) {
    diagnostics.push(buildDiagnostic(
      severity,
      'KINDLE_DROPPED_TIMER',
      `Kindle output removes timer mechanics (${droppedCounts.droppedTimers} occurrence${droppedCounts.droppedTimers === 1 ? '' : 's'}).`,
      inputPath,
      'Timer-driven redirects are omitted in static Kindle output.'
    ))
  }
  if (droppedCounts.droppedMedia > 0) {
    diagnostics.push(buildDiagnostic(
      severity,
      'KINDLE_DROPPED_MEDIA',
      `Kindle output removes media/visual runtime features (${droppedCounts.droppedMedia} occurrence${droppedCounts.droppedMedia === 1 ? '' : 's'}).`,
      inputPath,
      'Audio, backdrop, images, and cinematic hints are not emitted.'
    ))
  }
  if (droppedCounts.droppedRuntimeUi > 0) {
    diagnostics.push(buildDiagnostic(
      severity,
      'KINDLE_DROPPED_RUNTIME_UI',
      `Kindle output ignores runtime UI/session settings (${droppedCounts.droppedRuntimeUi} occurrence${droppedCounts.droppedRuntimeUi === 1 ? '' : 's'}).`,
      inputPath,
      'Undo/save/status/theme settings do not apply to static hyperlink pages.'
    ))
  }
  if (blockerCounts.unsupportedInputChoices > 0) {
    diagnostics.push(buildDiagnostic(
      'error',
      'KINDLE_UNSUPPORTED_INPUT_CHOICE',
      `Kindle output does not support input choices (${blockerCounts.unsupportedInputChoices} occurrence${blockerCounts.unsupportedInputChoices === 1 ? '' : 's'}).`,
      inputPath,
      'Replace text input with explicit hyperlink choices.'
    ))
  }
  if (blockerCounts.nondeterministicBuiltins > 0) {
    diagnostics.push(buildDiagnostic(
      'error',
      'KINDLE_UNSUPPORTED_NONDETERMINISM',
      `Kindle output detected non-deterministic builtin usage (${blockerCounts.nondeterministicBuiltins} call${blockerCounts.nondeterministicBuiltins === 1 ? '' : 's'}).`,
      inputPath,
      'Remove random/time builtins from Kindle-visible logic.'
    ))
  }

  return {
    diagnostics,
    droppedFeatureCounts: droppedCounts,
    blockerCounts,
    sectionNotes: Object.fromEntries(
      Array.from(sectionNotes.entries()).map(([serial, notes]) => [serial, Array.from(notes)])
    )
  }
}

function isKnownProfile (profile) {
  return ALL_PROFILES.includes(profile)
}

function isKindleProfile (profile) {
  return KINDLE_PROFILES.includes(profile)
}

export {
  DEFAULT_PROFILE,
  KINDLE_ANY_PROFILE,
  KINDLE_STRICT_PROFILE,
  ALL_PROFILES,
  KINDLE_PROFILES,
  NON_DETERMINISTIC_BUILTINS,
  collectNodes,
  collectChoicesFromSection,
  resolveSectionByRef,
  resolveSceneByRef,
  resolveChoiceTargetSection,
  renderChoiceTextPlain,
  analyzeKindleCompatibility,
  isKnownProfile,
  isKindleProfile
}
