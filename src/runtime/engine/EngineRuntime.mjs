import Run from '../../interpreters/custom/Run.mjs'
import State from '../../interpreters/custom/State.mjs'
import BUILTINS, { resetBuiltinState } from '../../interpreters/custom/Builtins.mjs'
import Story from '../../models/Story.mjs'
import Section from '../../models/Section.mjs'
import Choice from '../../models/Choice.mjs'
import Token from '../../models/Token.mjs'
import TokenTypes from '../../constants/custom/tokenTypes.mjs'
import ConditionalBlock from '../../models/ConditionalBlock.mjs'
import Action from '../../models/Action.mjs'
import Loop from '../../models/Loop.mjs'
import ArrayLiteral from '../../models/ArrayLiteral.mjs'
import ArrayAccess from '../../models/ArrayAccess.mjs'
import MemberAccess from '../../models/MemberAccess.mjs'
import FunctionDef from '../../models/FunctionDef.mjs'
import FunctionCall from '../../models/FunctionCall.mjs'
import InterpreterUtils from '../../interpreters/custom/InterpreterUtils.mjs'
import InterpreterException from '../../exceptions/InterpreterException.mjs'
import EngineEventBus from './EngineEventBus.mjs'
import EngineState from './EngineState.mjs'
import EngineSerializer from './EngineSerializer.mjs'

class EngineRuntime {
  constructor (run = null, options = {}) {
    this.debug = options.debug === true
    this.run = run || null
    this.utils = new InterpreterUtils()
    this.bus = new EngineEventBus()
    this.engineState = new EngineState()
    this.engineState.runtimeOptions = { ...this.engineState.runtimeOptions, ...(options.runtimeOptions || {}) }

    this.callStack = []
    this.MAX_CALL_DEPTH = 1000
    this.MAX_ITERATIONS = 10000
    this.loopControl = { break: false, continue: false }
    this.functionReturn = { hasReturned: false, value: null }
  }

  isNodeOf (node, Ctor, className) {
    return node instanceof Ctor || !!(node && typeof node === 'object' && node._class === className)
  }

  isTokenNode (node) {
    return node instanceof Token || !!(
      node &&
      typeof node === 'object' &&
      (node._class === 'Token' || (Object.prototype.hasOwnProperty.call(node, 'type') && Object.prototype.hasOwnProperty.call(node, 'symbol')))
    )
  }

  isActionNode (node) {
    return this.isNodeOf(node, Action, 'Action')
  }

  isConditionalNode (node) {
    return this.isNodeOf(node, ConditionalBlock, 'ConditionalBlock')
  }

  isLoopNode (node) {
    return this.isNodeOf(node, Loop, 'Loop')
  }

  isArrayLiteralNode (node) {
    return this.isNodeOf(node, ArrayLiteral, 'ArrayLiteral')
  }

  isArrayAccessNode (node) {
    return this.isNodeOf(node, ArrayAccess, 'ArrayAccess')
  }

  isMemberAccessNode (node) {
    return this.isNodeOf(node, MemberAccess, 'MemberAccess')
  }

  isFunctionDefNode (node) {
    return this.isNodeOf(node, FunctionDef, 'FunctionDef')
  }

  isFunctionCallNode (node) {
    return this.isNodeOf(node, FunctionCall, 'FunctionCall')
  }

  isChoiceNode (node) {
    return this.isNodeOf(node, Choice, 'Choice')
  }

  normalizeVariableName (variable) {
    if (typeof variable === 'string' && variable.trim() !== '') return variable
    if (this.isTokenNode(variable) && typeof variable.symbol === 'string' && variable.symbol.trim() !== '') return variable.symbol
    if (variable && typeof variable === 'object' && typeof variable.name === 'string' && variable.name.trim() !== '') return variable.name
    return null
  }

  sanitizeInputValue (value) {
    const strippedControls = Array.from(String(value == null ? '' : value))
      .filter(ch => {
        const code = ch.charCodeAt(0)
        return code >= 32 && code !== 127
      })
      .join('')
    const withoutInlineBlocks = strippedControls
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    const withoutTags = withoutInlineBlocks.replace(/<[^>]*>/g, ' ')
    return withoutTags.replace(/\s+/g, ' ').trim().slice(0, 256)
  }

  on (eventName, handler) {
    return this.bus.on(eventName, handler)
  }

  off (eventName, handler) {
    this.bus.off(eventName, handler)
  }

  emit (eventName, payload = {}) {
    const sectionSerial = this.run && this.run.state && this.run.state.section
      ? this.run.state.section.serial
      : null
    const turn = this.run && this.run.state ? this.run.state.turn : 0
    const envelope = {
      timestamp: Date.now(),
      traceId: `t-${++this.engineState.traceCounter}`,
      turn,
      sectionSerial,
      ...payload
    }
    this.bus.emit(eventName, envelope)
    return envelope
  }

  resolveRuntimeOptions (story, run, options = {}) {
    const defaults = {
      theme: 'literary-default',
      presentationMode: 'literary',
      allowUndo: true,
      showTurn: true,
      animations: true,
      autoSave: false
    }
    const settings = story && story.settings ? story.settings : {}
    const storyOptions = {
      theme: settings.theme || null,
      presentationMode: settings.presentationMode || null,
      allowUndo: settings.allowUndo,
      showTurn: settings.showTurn,
      animations: settings.animations,
      autoSave: settings.autoSave
    }
    const hostOptions = run && run.options ? run.options : {}
    const explicitOptions = options || {}
    return {
      ...defaults,
      ...storyOptions,
      ...hostOptions,
      ...explicitOptions,
      theme: explicitOptions.theme || hostOptions.theme || storyOptions.theme || defaults.theme,
      presentationMode: explicitOptions.presentationMode || hostOptions.presentationMode || storyOptions.presentationMode || defaults.presentationMode
    }
  }

  cloneSerializableValue (value) {
    try {
      return JSON.parse(JSON.stringify(value))
    } catch (err) {
      return undefined
    }
  }

  sanitizeInitialVariables (initialVariables) {
    if (!initialVariables || typeof initialVariables !== 'object' || Array.isArray(initialVariables)) {
      return {}
    }

    const out = {}
    Object.keys(initialVariables).forEach(key => {
      if (key === 'turn') return
      const cloned = this.cloneSerializableValue(initialVariables[key])
      if (cloned !== undefined) out[key] = cloned
    })
    return out
  }

  start (story, options = {}) {
    if (!(story instanceof Story)) {
      story = Story.fromJson(story)
    }
    if (!story || !(story instanceof Story)) {
      throw new InterpreterException('Invalid story supplied')
    }

    const run = new Run(story, new State(), null, options.runOptions || {})
    this.run = run
    this.run.story = story
    const startAt = options.startAt !== undefined ? options.startAt : story.settings.startAt
    const initialVariables = this.sanitizeInitialVariables(options.initialVariables)
    this.engineState.startOptions = {
      startAt,
      initialVariables
    }
    this.engineState.runtimeOptions = this.resolveRuntimeOptions(story, run, options)
    this.run.theme = this.engineState.runtimeOptions.theme
    this.engineState.storyFingerprint = EngineSerializer.computeStoryFingerprint(story)
    resetBuiltinState()

    this.resetVariables()
    Object.keys(initialVariables).forEach(key => {
      this.run.state.variables[key] = initialVariables[key]
    })
    this.run.state.onceConsumed = {}
    this.run.state.oldOnceConsumed = {}
    this.clearTimers()

    if (story.settings && story.settings.maxIterations) this.MAX_ITERATIONS = story.settings.maxIterations
    if (story.settings && story.settings.maxCallDepth) this.MAX_CALL_DEPTH = story.settings.maxCallDepth

    this.setState({
      section: startAt !== undefined ? startAt : 0,
      turn: 0
    })
    this.run.state.variables.turn = 0

    if (story.settings && story.settings.fullTimer) {
      const { timer, target } = story.settings.fullTimer
      if (typeof timer === 'number' && timer > 0) this.setFullTimer(timer, target)
    }

    this.emit('session_started', {
      runtimeOptions: { ...this.engineState.runtimeOptions },
      storyFingerprint: this.engineState.storyFingerprint
    })

    this.syncSceneForSection(this.run.state.section.serial)
    this.evaluateCurrentSection()
    this.emit('stats_updated', { stats: this.getStatsView() })
    return this.getViewModel()
  }

  destroy () {
    this.clearTimers()
    this.run = null
    this.engineState.currentSectionView = null
    this.engineState.choiceLookup = {}
  }

  resetVariables () {
    this.run.state.variables = {}
    const persistent = this.run.story && this.run.story.persistent ? this.run.story.persistent : {}
    Object.keys(persistent).forEach(key => {
      this.run.state.variables[key] = persistent[key]
    })
  }

  setState (opts) {
    Object.keys(opts).forEach(opt => {
      if (opt !== 'section') {
        this.run.state[opt] = opts[opt]
      } else {
        this.run.state.section = this.run.story.findSection(opts.section)
      }
    })
  }

  changeTurn (change, abs) {
    const nextTurn = abs !== undefined
      ? abs
      : (change ? (this.run.state.turn + change) : this.run.state.turn + 1)
    this.setState({ turn: nextTurn })
    this.run.state.variables.turn = nextTurn
    this.emit('turn_changed', { turn: nextTurn })
  }

  getChoiceKey (choice) {
    return `${choice.owner}:${choice.choiceI}`
  }

  isChoiceConsumed (choice) {
    return this.run.state.onceConsumed[this.getChoiceKey(choice)] === true
  }

  consumeChoice (choice) {
    if (!choice || choice.once !== true) return
    this.run.state.onceConsumed[this.getChoiceKey(choice)] = true
  }

  evaluateChoiceVisibility (choice, section) {
    if (!choice || !choice.when) return { visible: true }
    try {
      return { visible: !!this.resolveAction(choice.when, false, section) }
    } catch (err) {
      if (this.debug) console.warn('Failed to evaluate @when for choice:', err.message)
      return { visible: false }
    }
  }

  replaceVars (str, variables, section = this.run && this.run.state ? this.run.state.section : null) {
    Object.keys(variables).forEach(v => {
      str = this.replaceOneVariable(str, v, variables[v])
    })
    return this.replaceFunctionCalls(str, section)
  }

  replaceFunctionCalls (str, section = this.run && this.run.state ? this.run.state.section : null) {
    if (typeof str !== 'string') return str

    const startedAt = Date.now()
    let changed = true
    let result = str

    while (changed && Date.now() - startedAt < 10000) {
      changed = false
      result = result.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\(\)\}/g, (match, fnName, index, source) => {
        if (index > 0 && source[index - 1] === '\\') return match
        try {
          const value = this.callFunction({ name: fnName, args: [] }, section)
          changed = true
          return value === null || value === undefined ? '' : String(value)
        } catch (err) {
          return match
        }
      })
    }

    return result
  }

  replaceOneVariable (str, name, value) {
    const then = Date.now()
    if (typeof str === 'string') {
      let j = 0
      while (j >= 0 && Date.now() - then < 10000) {
        j = str.indexOf('${' + name + '}', j > 0 ? j + 1 : 0)
        if (!(j === -1 || (j > 0 && str[j - 1] === '\\'))) {
          const first = str.substring(0, j)
          const last = str.substring(j + name.length + 3)
          str = first + value + last
        }
      }
      return str
    }
    return str
  }

  resolveArrayLiteral (arrLit, section) {
    return arrLit.elements.map(elem => this.resolveAction(elem, false, section))
  }

  resolveArrayAccess (access, returnName, section) {
    const array = this.resolveAction(access.array, false, section)
    const index = this.resolveAction(access.index, false, section)

    if (returnName) return { array, index, isArrayAccess: true }
    if (!Array.isArray(array)) throw new InterpreterException('Cannot index non-array value')
    return array[index]
  }

  resolveMemberAccess (member, section) {
    const object = this.resolveAction(member.object, false, section)
    if (member.args === null) return object[member.member]
    const args = member.args.map(arg => this.resolveAction(arg, false, section))
    if (typeof object[member.member] === 'function') return object[member.member](...args)
    throw new InterpreterException(`${member.member} is not a method`)
  }

  resolveLoop (loop, section) {
    let iterations = 0
    this.loopControl = { break: false, continue: false }

    while (this.resolveAction(loop.condition, false, section)) {
      if (iterations++ >= this.MAX_ITERATIONS) {
        throw new InterpreterException(`Maximum iterations (${this.MAX_ITERATIONS}) exceeded`)
      }
      this.loopControl.continue = false
      for (const statement of loop.body) {
        if (statement.type === 'break') {
          this.loopControl.break = true
          break
        }
        if (statement.type === 'continue') {
          this.loopControl.continue = true
          break
        }
        if (this.isActionNode(statement) && statement.type === 'return') {
          this.functionReturn.hasReturned = true
          this.functionReturn.value = statement.left !== null
            ? this.resolveAction(statement.left, false, section)
            : null
          return ''
        }
        this.resolveSyntaxTree([statement], '', section)
        if (this.loopControl.continue) break
      }
      if (this.loopControl.break || this.functionReturn.hasReturned) break
    }

    this.loopControl = { break: false, continue: false }
    return ''
  }

  callFunction (funcCall, section) {
    const funcName = typeof funcCall.name === 'string' ? funcCall.name : funcCall.name.symbol
    const args = Array.isArray(funcCall.args) ? funcCall.args : []
    if (BUILTINS[funcName]) {
      const argValues = args.map(arg => this.resolveAction(arg, false, section))
      return BUILTINS[funcName](...argValues)
    }

    const funcDef = this.run.story.persistent.functions[funcName]
    if (!funcDef) throw new InterpreterException(`Undefined function: ${funcName}`)
    if (this.callStack.length >= this.MAX_CALL_DEPTH) {
      throw new InterpreterException(`Maximum call depth (${this.MAX_CALL_DEPTH}) exceeded`)
    }

    const argValues = args.map(arg => this.resolveAction(arg, false, section))
    const savedVars = { ...this.run.state.variables }
    this.callStack.push({ name: funcName, savedVars })

    funcDef.params.forEach((param, i) => {
      this.run.state.variables[param] = argValues[i]
    })
    this.functionReturn = { hasReturned: false, value: null }

    for (const statement of (funcDef.body || [])) {
      if (this.isActionNode(statement) && statement.type === 'return') {
        this.functionReturn.hasReturned = true
        this.functionReturn.value = statement.left !== null
          ? this.resolveAction(statement.left, false, section)
          : null
        break
      }
      this.resolveSyntaxTree([statement], '', section)
      if (this.functionReturn.hasReturned) break
    }

    const returnValue = this.functionReturn.value
    this.callStack.pop()

    const newGlobals = {}
    for (const key in this.run.state.variables) {
      if (!(key in savedVars) && !funcDef.params.includes(key)) {
        newGlobals[key] = this.run.state.variables[key]
      }
    }
    this.run.state.variables = { ...savedVars, ...newGlobals }
    this.functionReturn = { hasReturned: false, value: null }
    return returnValue
  }

  resolveConditionalBranch (branch, section) {
    if (branch === null || branch === undefined) return ''
    if (Array.isArray(branch)) return this.resolveSyntaxTree(branch, '', section)
    const result = this.resolveAction(branch, false, section)
    return result === null || result === undefined ? '' : result
  }

  resolveConditionalBlock (block, section) {
    if (!this.isConditionalNode(block)) return ''
    if (this.resolveAction(block.cond, false, section)) {
      return this.resolveConditionalBranch(
        Array.isArray(block.ifBlock) ? block.ifBlock : block.then,
        section
      )
    }
    return this.resolveConditionalBranch(
      Array.isArray(block.elseBlock) ? block.elseBlock : block.else,
      section
    )
  }

  resolveSyntaxTree (tree, start = '', section) {
    if (typeof tree === 'string') return tree
    return tree.reduce((acc, v) => {
      if (typeof start === 'string') {
        if (this.isTokenNode(v)) {
          const { VARIABLE, STRING, NUMBER } = TokenTypes
          if (v.type === VARIABLE) acc += this.run.state.variables[v.symbol]
          else if (v.type === STRING) acc += v.symbol + '\n\n'
          else if (v.type === NUMBER) acc += v.symbol
          else acc += v.symbol
        } else if (this.isConditionalNode(v)) {
          acc += this.resolveConditionalBlock(v, section)
        } else if (this.isLoopNode(v)) {
          acc += this.resolveLoop(v, section)
        } else if (this.isFunctionDefNode(v)) {
          // Functions are already captured by parser.
        } else if (this.isFunctionCallNode(v) || this.isMemberAccessNode(v) || this.isArrayAccessNode(v)) {
          try {
            this.resolveAction(v, false, section)
          } catch (err) {
            if (this.debug) console.warn('Statement call failed:', err.message)
          }
        } else if (this.isActionNode(v)) {
          acc += this.resolveAction(v, false, section)
        }
      }
      if (this.isChoiceNode(v)) {
        section.choices.push(v)
      }
      return acc
    }, start)
  }

  resolveAction (action, returnName = false, section) {
    if (this.isActionNode(action)) {
      if (action.type === 'assign') {
        const leftResolved = this.resolveAction(action.left, true, section)
        const rightResolved = this.resolveAction(action.right, false, section)
        if (leftResolved && leftResolved.isArrayAccess) {
          leftResolved.array[leftResolved.index] = rightResolved
          return ''
        }
        this.run.state.variables[leftResolved] = rightResolved
        this.emit('variable_changed', { variable: leftResolved, value: this.run.state.variables[leftResolved] })
        return ''
      } else if (action.type === 'binary') {
        const left = this.resolveAction(action.left, false, section)
        const right = this.resolveAction(action.right, false, section)
        return this.utils.solveAction(action, left, right)
      } else if (action.type === 'unary') {
        const operand = this.resolveAction(action.left, false, section)
        if (action.operator === '-') return -operand
        if (action.operator === '!') return !operand
        throw new InterpreterException(`Unsupported unary operator: ${action.operator}`)
      } else if (action.type === 'return') {
        return null
      }
    } else if (this.isArrayLiteralNode(action)) {
      return this.resolveArrayLiteral(action, section)
    } else if (this.isArrayAccessNode(action)) {
      return this.resolveArrayAccess(action, returnName, section)
    } else if (this.isMemberAccessNode(action)) {
      return this.resolveMemberAccess(action, section)
    } else if (this.isFunctionCallNode(action)) {
      return this.callFunction(action, section)
    } else if (!returnName && this.isTokenNode(action) && action.type === TokenTypes.VARIABLE) {
      return this.run.state.variables[action.symbol]
    } else if (this.isChoiceNode(action)) {
      section.choices.push(action)
      return null
    } else if (action && Object.prototype.hasOwnProperty.call(action, 'symbol')) {
      return action.symbol
    }
    return action
  }

  evaluateCurrentSection () {
    const section = this.run.state.section
    if (!section || !(section instanceof Section)) {
      this.emit('error_raised', { message: "Current section couldn't be resolved." })
      return null
    }

    const originalChoices = Array.isArray(section.choices) ? [...section.choices] : []
    section.choices = []

    let titleText = this.resolveSyntaxTree(section.title, '', section)
    titleText = this.replaceVars(titleText, this.run.state.variables)

    let parasText = this.resolveSyntaxTree(section.text, '', section)
    parasText = this.replaceVars(parasText, this.run.state.variables)

    const rawChoices = section.choices.length > 0 ? section.choices : originalChoices
    const viewChoices = []
    this.engineState.choiceLookup = {}

    ;[...new Set(rawChoices)].forEach((choice, i) => {
      const choiceIndex = choice.choiceI || (i + 1)
      const consumed = choice.once && this.isChoiceConsumed(choice)
      if (consumed) return

      const visibility = this.evaluateChoiceVisibility(choice, this.run.state.section)
      let disabled = false
      let hidden = false
      let text = ''
      if (!visibility.visible) {
        if (typeof choice.disabledText === 'string' && choice.disabledText.trim() !== '') {
          disabled = true
          text = choice.disabledText
        } else {
          hidden = true
        }
      } else {
        text = this.resolveSyntaxTree(choice.text, '')
      }
      if (hidden) return

      text = this.replaceVars(text, this.run.state.variables)
      const textHtml = this.utils.formatText(String(text)).trim().replace(/^<p>/, '').replace(/<\/p>$/, '')

      viewChoices.push({
        choiceIndex,
        target: choice.target,
        mode: choice.mode,
        disabled,
        text: text,
        textHtml,
        choiceStyle: choice.choiceStyle || 'default',
        choiceSfx: choice.choiceSfx || null,
        focusSfx: choice.focusSfx || null
      })

      if (!disabled) this.engineState.choiceLookup[String(choiceIndex)] = choice
    })

    this.engineState.currentSectionView = {
      serial: section.serial,
      titleText: titleText || '',
      titleHtml: this.utils.formatText(String(titleText || '')),
      bodyText: parasText || '',
      bodyHtml: this.utils.formatText(String(parasText || '')).replaceAll('<p></p>', ''),
      choices: viewChoices,
      backdrop: section.settings ? section.settings.backdrop : null,
      shot: section.settings ? section.settings.shot : 'medium',
      textPacing: section.settings ? section.settings.textPacing : 'instant'
    }

    this.setSectionTimerFromCurrentSection()
    this.emit('section_entered', {
      view: this.engineState.currentSectionView
    })
    this.emit('choices_updated', {
      choices: viewChoices
    })
    this.emit('stats_updated', { stats: this.getStatsView() })
    return this.engineState.currentSectionView
  }

  setSectionTimerFromCurrentSection () {
    if (!this.run || !this.run.state || !this.run.state.section) return
    const timerConfig = this.run.state.section.settings ? this.run.state.section.settings.timer : null
    if (this.engineState.sectionTimerHandle) {
      clearTimeout(this.engineState.sectionTimerHandle)
      this.engineState.sectionTimerHandle = null
      this.engineState.timers.section = null
      this.emit('timer_stopped', { timerType: 'section' })
      this.emit('timer_state_changed', {
        timerType: 'section',
        state: 'stopped',
        reason: 'reconfigured',
        activeTimers: this.getActiveTimersView()
      })
    }

    if (!timerConfig || typeof timerConfig.timer !== 'number' || timerConfig.timer <= 0 || timerConfig.target === null || timerConfig.target === undefined) {
      this.engineState.timers.section = null
      this.emit('timer_state_changed', {
        timerType: 'section',
        state: 'idle',
        reason: 'no_timer',
        activeTimers: this.getActiveTimersView()
      })
      return
    }
    const durationMs = timerConfig.timer * 1000
    const startedAt = Date.now()
    const sectionTimerOutcome = this.run.state.section && this.run.state.section.settings
      ? this.run.state.section.settings.timerOutcome
      : null
    const outcomeText = typeof sectionTimerOutcome === 'string' && sectionTimerOutcome.trim() !== ''
      ? sectionTimerOutcome.trim()
      : null
    this.engineState.timers.section = {
      timerType: 'section',
      seconds: timerConfig.timer,
      durationMs,
      startedAt,
      deadlineAt: startedAt + durationMs,
      outcomeText
    }
    this.emit('timer_started', {
      timerType: 'section',
      seconds: timerConfig.timer,
      target: timerConfig.target,
      startedAt,
      deadlineAt: startedAt + durationMs,
      outcomeText
    })
    this.emit('timer_state_changed', {
      timerType: 'section',
      state: 'running',
      target: timerConfig.target,
      startedAt,
      deadlineAt: startedAt + durationMs,
      outcomeText,
      activeTimers: this.getActiveTimersView()
    })
    this.engineState.sectionTimerHandle = setTimeout(() => {
      this.engineState.sectionTimerHandle = null
      this.engineState.timers.section = null
      this.emit('timer_elapsed', { timerType: 'section', target: timerConfig.target })
      this.emit('timer_state_changed', {
        timerType: 'section',
        state: 'elapsed',
        target: timerConfig.target,
        activeTimers: this.getActiveTimersView()
      })
      this.switchSection(timerConfig.target)
    }, durationMs)
  }

  setFullTimer (seconds, target) {
    if (this.engineState.fullTimerHandle) {
      clearTimeout(this.engineState.fullTimerHandle)
      this.engineState.fullTimerHandle = null
      this.engineState.timers.full = null
      this.emit('timer_stopped', { timerType: 'full' })
      this.emit('timer_state_changed', {
        timerType: 'full',
        state: 'stopped',
        reason: 'reconfigured',
        activeTimers: this.getActiveTimersView()
      })
    }
    if (typeof seconds !== 'number' || seconds <= 0 || target === undefined || target === null) {
      this.engineState.timers.full = null
      this.emit('timer_state_changed', {
        timerType: 'full',
        state: 'idle',
        reason: 'no_timer',
        activeTimers: this.getActiveTimersView()
      })
      return
    }
    const durationMs = seconds * 1000
    const startedAt = Date.now()
    const fullTimerOutcome = this.run && this.run.story && this.run.story.settings
      ? this.run.story.settings.fullTimerOutcome
      : null
    const outcomeText = typeof fullTimerOutcome === 'string' && fullTimerOutcome.trim() !== ''
      ? fullTimerOutcome.trim()
      : null
    this.engineState.timers.full = {
      timerType: 'full',
      seconds,
      durationMs,
      startedAt,
      deadlineAt: startedAt + durationMs,
      outcomeText
    }
    this.emit('timer_started', {
      timerType: 'full',
      seconds,
      target,
      startedAt,
      deadlineAt: startedAt + durationMs,
      outcomeText
    })
    this.emit('timer_state_changed', {
      timerType: 'full',
      state: 'running',
      target,
      startedAt,
      deadlineAt: startedAt + durationMs,
      outcomeText,
      activeTimers: this.getActiveTimersView()
    })
    this.engineState.fullTimerHandle = setTimeout(() => {
      this.engineState.fullTimerHandle = null
      this.engineState.timers.full = null
      this.emit('timer_elapsed', { timerType: 'full', target })
      this.emit('timer_state_changed', {
        timerType: 'full',
        state: 'elapsed',
        target,
        activeTimers: this.getActiveTimersView()
      })
      this.switchSection(target)
    }, durationMs)
  }

  clearTimers () {
    if (this.engineState.sectionTimerHandle) {
      clearTimeout(this.engineState.sectionTimerHandle)
      this.engineState.sectionTimerHandle = null
    }
    this.engineState.timers.section = null
    this.emit('timer_state_changed', {
      timerType: 'section',
      state: 'cleared',
      activeTimers: this.getActiveTimersView()
    })
    if (this.engineState.fullTimerHandle) {
      clearTimeout(this.engineState.fullTimerHandle)
      this.engineState.fullTimerHandle = null
    }
    this.engineState.timers.full = null
    this.emit('timer_state_changed', {
      timerType: 'full',
      state: 'cleared',
      activeTimers: this.getActiveTimersView()
    })
  }

  setupUndo () {
    this.setState({ lastSection: this.run.state.section })
  }

  recordOldValues (vars) {
    this.run.state.oldValues = {}
    vars.forEach(variable => {
      this.run.state.oldValues[variable] = this.run.state.variables[variable]
    })
  }

  undoVars (vars) {
    Object.keys(vars).forEach(variable => {
      this.run.state.variables[variable] = vars[variable]
    })
  }

  getChoiceTextValue (choice) {
    let text = this.resolveSyntaxTree(choice.text, '', this.run.state.section)
    text = this.replaceVars(text, this.run.state.variables)
    return String(text || '').trim()
  }

  changeVariables (vars, to, options = {}) {
    const names = (vars || [])
      .map(variable => this.normalizeVariableName(variable))
      .filter(Boolean)
    this.recordOldValues(names)

    const shouldCoerceNumbers = options.coerceNumeric !== false
    const numericPattern = /^-?\d+$/
    const normalizedText = typeof to === 'string' ? to.trim() : String(to)
    const nextValue = shouldCoerceNumbers && numericPattern.test(normalizedText)
      ? Number(normalizedText)
      : to

    names.forEach(key => {
      this.run.state.variables[key] = nextValue
      this.emit('variable_changed', { variable: key, value: this.run.state.variables[key] })
    })
  }

  doActions (actions) {
    ;(actions || []).forEach(act => {
      Object.assign(this.run.state.oldValues, this.run.state.variables)
      this.resolveAction(act, false, this.run.state.section)
    })
  }

  resolveSectionSerialRef (sectionRef) {
    if (typeof sectionRef === 'number') return sectionRef
    if (typeof sectionRef === 'string') {
      const sections = this.run && this.run.story && Array.isArray(this.run.story.sections)
        ? this.run.story.sections
        : []
      const match = sections.find(section => section && section.settings && section.settings.title === sectionRef)
      return match ? match.serial : null
    }
    return null
  }

  sceneIncludesSection (scene, sectionSerial) {
    if (!scene || typeof sectionSerial !== 'number') return false
    const firstSerial = this.resolveSectionSerialRef(scene.first)
    if (firstSerial === sectionSerial) return true
    const refs = Array.isArray(scene.sections) ? scene.sections : []
    return refs.some(ref => this.resolveSectionSerialRef(ref) === sectionSerial)
  }

  createSceneEventPayload (scene) {
    if (!scene) return null
    return {
      serial: scene.serial,
      name: scene.name,
      music: scene.music || null,
      musicVolume: typeof scene.musicVolume === 'number' ? scene.musicVolume : 1,
      musicLoop: scene.musicLoop !== undefined ? scene.musicLoop : true,
      musicFadeInMs: scene.musicFadeInMs || 0,
      musicFadeOutMs: scene.musicFadeOutMs || 0,
      sceneTransition: scene.sceneTransition || 'cut'
    }
  }

  syncSceneForSection (sectionSerial) {
    const scene = (this.run.story.scenes || []).find(s => this.sceneIncludesSection(s, sectionSerial))
    const payload = this.createSceneEventPayload(scene)
    this.run.state.scene = scene || null
    this.emit('scene_resolved', {
      sectionSerial,
      scene: payload,
      matched: Boolean(scene)
    })
    if (!scene) return
    this.emit('scene_changed', { scene: payload })
  }

  switchSection (targetSec, isUndo = false) {
    if (!isUndo) {
      this.setupUndo()
      this.run.state.oldOnceConsumed = { ...this.run.state.onceConsumed }
      this.changeTurn()
    }
    this.setState({ section: targetSec })
    this.syncSceneForSection(this.run.state.section.serial)
    this.evaluateCurrentSection()
    return this.getViewModel()
  }

  selectChoice ({ choiceIndex, inputValue = '' }) {
    if (!this.run || !this.run.state || !this.run.state.section) return null
    const selected = this.engineState.choiceLookup[String(choiceIndex)]
    if (!selected) {
      this.emit('error_raised', { message: `Choice ${choiceIndex} is not available.` })
      return null
    }

    this.run.state.oldOnceConsumed = { ...this.run.state.onceConsumed }
    this.run.state.oldValues = { ...this.run.state.variables }
    this.run.state.lastSection = this.run.state.section

    let target = selected.target
    if (selected.targetType === 'scene') {
      const scene = this.run.story.findScene(target)
      target = scene.first
      this.run.state.scene = scene
      this.emit('scene_changed', { scene: this.createSceneEventPayload(scene) })
    }

    if (selected.mode === 'input') {
      const sanitizedInput = this.sanitizeInputValue(inputValue)
      if (sanitizedInput === '') {
        this.emit('error_raised', { message: 'Input choice requires a non-empty value.' })
        return null
      }
      this.changeVariables(selected.variables, sanitizedInput, { coerceNumeric: false })
      this.changeVariables(selected.input || [], sanitizedInput, { coerceNumeric: false })
    } else {
      this.changeVariables(selected.variables, this.getChoiceTextValue(selected))
    }

    if (selected.actions) this.doActions(selected.actions)
    this.consumeChoice(selected)

    this.emit('choice_consumed', {
      choiceIndex: selected.choiceI,
      target
    })
    return this.switchSection(target, false)
  }

  undo () {
    if (!this.engineState.runtimeOptions.allowUndo) return null
    if (!this.run || !this.run.state || !this.run.state.lastSection) return null

    this.undoVars(this.run.state.oldValues || {})
    this.run.state.onceConsumed = { ...this.run.state.oldOnceConsumed }
    this.changeTurn(-1)
    this.setState({ section: this.run.state.lastSection.serial })
    this.syncSceneForSection(this.run.state.section.serial)
    this.evaluateCurrentSection()
    return this.getViewModel()
  }

  restart () {
    if (!this.run || !this.run.story) return null
    const startOptions = this.engineState.startOptions || {}
    const hasInitialVariables = Object.keys(startOptions.initialVariables || {}).length > 0
    return this.start(this.run.story, {
      ...this.engineState.runtimeOptions,
      runOptions: this.run.options,
      ...(startOptions.startAt !== undefined ? { startAt: startOptions.startAt } : {}),
      ...(hasInitialVariables ? { initialVariables: startOptions.initialVariables } : {})
    })
  }

  setPreference ({ key, value }) {
    if (!key) return
    this.engineState.runtimeOptions[key] = value
    if (key === 'theme') this.run.theme = value
    this.emit('session_started', {
      runtimeOptions: { ...this.engineState.runtimeOptions },
      storyFingerprint: this.engineState.storyFingerprint
    })
  }

  getStatsView () {
    const statsConfig = this.run.story && this.run.story.stats && typeof this.run.story.stats === 'object'
      ? this.run.story.stats
      : {}
    const hasExplicitInclusions = Object.values(statsConfig).some(cfg =>
      cfg && typeof cfg === 'object' && cfg.showInStatusBar === true
    )

    const stats = []
    if (this.engineState.runtimeOptions.showTurn !== false) {
      stats.push({ key: 'turn', label: 'Turn', value: this.run.state.turn })
    }
    Object.keys(this.run.state.variables).forEach(stat => {
      if (stat === 'turn') return
      const val = this.run.state.variables[stat]
      if (val !== null && typeof val === 'object') return
      const config = statsConfig[stat]
      const show = config && typeof config === 'object' && Object.prototype.hasOwnProperty.call(config, 'showInStatusBar')
        ? config.showInStatusBar === true
        : !hasExplicitInclusions
      if (!show) return
      const displayName = config && typeof config === 'object' && typeof config.statusBarLabel === 'string' && config.statusBarLabel.trim() !== ''
        ? config.statusBarLabel
        : stat
      stats.push({ key: stat, label: displayName, value: val })
    })
    return stats
  }

  getActiveTimersView () {
    const now = Date.now()
    const timers = [this.engineState.timers.section, this.engineState.timers.full]
      .filter(timer => timer && typeof timer.deadlineAt === 'number' && timer.deadlineAt > now)
      .map(timer => ({
        timerType: timer.timerType,
        seconds: timer.seconds,
        durationMs: timer.durationMs,
        startedAt: timer.startedAt,
        deadlineAt: timer.deadlineAt,
        outcomeText: timer.outcomeText || null
      }))
    return timers.sort((a, b) => a.deadlineAt - b.deadlineAt)
  }

  getViewModel () {
    return {
      runtimeOptions: { ...this.engineState.runtimeOptions },
      themeId: this.run ? this.run.theme : this.engineState.runtimeOptions.theme,
      section: this.engineState.currentSectionView,
      stats: this.getStatsView(),
      timers: this.getActiveTimersView(),
      turn: this.run && this.run.state ? this.run.state.turn : 0
    }
  }

  getDebugSnapshot () {
    const scene = this.run && this.run.state ? this.run.state.scene : null
    const section = this.run && this.run.state ? this.run.state.section : null
    return {
      runtimeOptions: { ...this.engineState.runtimeOptions },
      section: section
        ? {
            serial: section.serial,
            title: section.settings ? section.settings.title : null
          }
        : null,
      scene: scene ? this.createSceneEventPayload(scene) : null,
      timers: {
        active: this.getActiveTimersView(),
        full: this.engineState.timers.full ? { ...this.engineState.timers.full } : null,
        section: this.engineState.timers.section ? { ...this.engineState.timers.section } : null
      },
      variables: this.run && this.run.state ? { ...this.run.state.variables } : {}
    }
  }

  createSnapshot (metadata = {}) {
    return EngineSerializer.buildSnapshot(this, metadata)
  }

  loadSnapshot (snapshot) {
    if (!EngineSerializer.isValidSnapshot(this, snapshot)) {
      this.emit('error_raised', { message: 'Invalid snapshot payload.' })
      return null
    }
    this.run.state.variables = {
      ...this.run.state.variables,
      ...(snapshot.variables || {})
    }
    this.run.state.onceConsumed = { ...(snapshot.onceConsumed || {}) }
    this.run.state.oldOnceConsumed = { ...(snapshot.onceConsumed || {}) }
    this.run.theme = snapshot.themeId || this.engineState.runtimeOptions.theme
    this.engineState.runtimeOptions.presentationMode = snapshot.presentationMode || this.engineState.runtimeOptions.presentationMode
    this.setState({
      section: snapshot.sectionSerial,
      turn: typeof snapshot.turn === 'number' ? snapshot.turn : 0
    })
    this.run.state.variables.turn = this.run.state.turn
    this.syncSceneForSection(this.run.state.section.serial)
    this.evaluateCurrentSection()
    this.emit('save_loaded', { snapshot })
    return this.getViewModel()
  }
}

export default EngineRuntime
