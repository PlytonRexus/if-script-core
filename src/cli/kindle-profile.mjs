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

function analyzeKindleCompatibility (story, inputPath, profile = KINDLE_ANY_PROFILE) {
  const severity = profileSeverity(profile)
  const diagnostics = []
  const sectionNotes = createSectionNoteStore(story)
  const counts = {
    droppedTimers: 0,
    droppedMedia: 0,
    droppedRuntimeUi: 0,
    approximatedChoiceGuards: 0,
    approximatedChoiceActions: 0,
    approximatedChoiceInput: 0,
    approximatedChoiceOnce: 0,
    nondeterministicBuiltins: 0
  }

  const settings = story && story.settings ? story.settings : {}
  if (settings && settings.fullTimer && settings.fullTimer.timer > 0) pushCount(counts, 'droppedTimers')
  if (settings && settings.autoSave === true) pushCount(counts, 'droppedRuntimeUi')
  if (settings && settings.referrable === true) pushCount(counts, 'droppedRuntimeUi')
  if (settings && isTruthyString(settings.theme)) pushCount(counts, 'droppedRuntimeUi')
  if (settings && isTruthyString(settings.presentationMode) && settings.presentationMode !== 'literary') {
    pushCount(counts, 'droppedRuntimeUi')
  }
  if (story && story.stats && Object.keys(story.stats).length > 0) pushCount(counts, 'droppedRuntimeUi')

  ;(story.scenes || []).forEach(scene => {
    if (!scene) return
    if (isTruthyString(scene.music)) pushCount(counts, 'droppedMedia')
    if (scene.sceneTransition && scene.sceneTransition !== 'cut') pushCount(counts, 'droppedMedia')
  })

  ;(story.sections || []).forEach(section => {
    if (!section || !section.settings) return
    const cfg = section.settings
    if (cfg.timer && cfg.timer.timer > 0) {
      pushCount(counts, 'droppedTimers')
      addSectionNote(sectionNotes, section.serial, 'Timers are removed in Kindle mode.')
    }
    if (isTruthyString(cfg.ambience)) {
      pushCount(counts, 'droppedMedia')
      addSectionNote(sectionNotes, section.serial, 'Audio ambience is removed in Kindle mode.')
    }
    if (Array.isArray(cfg.sfx) && cfg.sfx.length > 0) {
      pushCount(counts, 'droppedMedia')
      addSectionNote(sectionNotes, section.serial, 'Sound effects are removed in Kindle mode.')
    }
    if (isTruthyString(cfg.backdrop) || cfg.shot !== 'medium' || cfg.textPacing !== 'instant') {
      pushCount(counts, 'droppedMedia')
      addSectionNote(sectionNotes, section.serial, 'Visual presentation hints are removed in Kindle mode.')
    }

    const choices = collectChoicesFromSection(section)
    choices.forEach(choice => {
      if (choice && choice.mode === 'input') {
        pushCount(counts, 'approximatedChoiceInput')
        addSectionNote(sectionNotes, section.serial, 'Input choices are simplified to static links.')
      }
      if (choice && Array.isArray(choice.actions) && choice.actions.length > 0) {
        pushCount(counts, 'approximatedChoiceActions')
        addSectionNote(sectionNotes, section.serial, 'Choice actions are simplified for static output.')
      }
      if (choice && choice.when) {
        pushCount(counts, 'approximatedChoiceGuards')
        addSectionNote(sectionNotes, section.serial, 'Conditional choice visibility is simplified in Kindle mode.')
      }
      if (choice && choice.once === true) {
        pushCount(counts, 'approximatedChoiceOnce')
        addSectionNote(sectionNotes, section.serial, 'One-time choice consumption is simplified in Kindle mode.')
      }
      if (choice && (isTruthyString(choice.choiceSfx) || isTruthyString(choice.focusSfx))) {
        pushCount(counts, 'droppedMedia')
        addSectionNote(sectionNotes, section.serial, 'Choice sound cues are removed in Kindle mode.')
      }
    })
  })

  collectNodes((story.sections || []).flatMap(section => section && section.text ? section.text : []), (node) => {
    if (!node || node._class !== 'FunctionCall') return
    const fnName = resolveFunctionName(node)
    if (!fnName || !NON_DETERMINISTIC_BUILTINS.has(fnName)) return
    pushCount(counts, 'nondeterministicBuiltins')
  })

  ;(story.functions || []).forEach(func => {
    collectNodes(func && func.body ? func.body : [], (node) => {
      if (!node || node._class !== 'FunctionCall') return
      const fnName = resolveFunctionName(node)
      if (!fnName || !NON_DETERMINISTIC_BUILTINS.has(fnName)) return
      pushCount(counts, 'nondeterministicBuiltins')
    })
  })

  if (counts.droppedTimers > 0) {
    diagnostics.push(buildDiagnostic(
      severity,
      'KINDLE_DROPPED_TIMER',
      `Kindle output removes timer mechanics (${counts.droppedTimers} occurrence${counts.droppedTimers === 1 ? '' : 's'}).`,
      inputPath,
      'Timer-driven redirects are omitted in static HTML mode.'
    ))
  }
  if (counts.droppedMedia > 0) {
    diagnostics.push(buildDiagnostic(
      severity,
      'KINDLE_DROPPED_MEDIA',
      `Kindle output removes media/visual runtime features (${counts.droppedMedia} occurrence${counts.droppedMedia === 1 ? '' : 's'}).`,
      inputPath,
      'Audio, backdrop and cinematic hints are not emitted in Kindle HTML.'
    ))
  }
  if (counts.droppedRuntimeUi > 0) {
    diagnostics.push(buildDiagnostic(
      severity,
      'KINDLE_DROPPED_RUNTIME_UI',
      `Kindle output ignores runtime UI/session settings (${counts.droppedRuntimeUi} occurrence${counts.droppedRuntimeUi === 1 ? '' : 's'}).`,
      inputPath,
      'Undo/save/status/theme settings do not apply to static HTML pages.'
    ))
  }
  if (counts.approximatedChoiceGuards > 0) {
    diagnostics.push(buildDiagnostic(
      severity,
      'KINDLE_APPROX_CHOICE_GUARDS',
      `Kindle output approximates conditional choice visibility (${counts.approximatedChoiceGuards} guarded choice${counts.approximatedChoiceGuards === 1 ? '' : 's'}).`,
      inputPath,
      'Guarded links are rendered as static links when dynamic evaluation is not possible.'
    ))
  }
  if (counts.approximatedChoiceActions > 0) {
    diagnostics.push(buildDiagnostic(
      severity,
      'KINDLE_APPROX_CHOICE_ACTIONS',
      `Kindle output approximates stateful choice actions (${counts.approximatedChoiceActions} choice${counts.approximatedChoiceActions === 1 ? '' : 's'}).`,
      inputPath,
      'Static links cannot reproduce all runtime state mutation behavior.'
    ))
  }
  if (counts.approximatedChoiceInput > 0) {
    diagnostics.push(buildDiagnostic(
      severity,
      'KINDLE_APPROX_CHOICE_INPUT',
      `Kindle output cannot collect text input (${counts.approximatedChoiceInput} input choice${counts.approximatedChoiceInput === 1 ? '' : 's'}).`,
      inputPath,
      'Input-based choices are converted into plain links.'
    ))
  }
  if (counts.approximatedChoiceOnce > 0) {
    diagnostics.push(buildDiagnostic(
      severity,
      'KINDLE_APPROX_CHOICE_ONCE',
      `Kindle output cannot enforce one-time choice consumption (${counts.approximatedChoiceOnce} one-time choice${counts.approximatedChoiceOnce === 1 ? '' : 's'}).`,
      inputPath,
      'One-time choices may remain available in static pages.'
    ))
  }
  if (counts.nondeterministicBuiltins > 0) {
    diagnostics.push(buildDiagnostic(
      severity,
      'KINDLE_NONDETERMINISTIC_BUILTIN',
      `Kindle output detected non-deterministic builtin usage (${counts.nondeterministicBuiltins} call${counts.nondeterministicBuiltins === 1 ? '' : 's'}).`,
      inputPath,
      'Random/time-based behavior cannot be preserved exactly in static HTML output.'
    ))
  }

  return {
    diagnostics,
    droppedFeatureCounts: counts,
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
