import Run from './Run.mjs'
import BUILTINS, { resetBuiltinState } from './Builtins.mjs'
import DOM from '../../constants/custom/dom.mjs'
import Story from '../../models/Story.mjs'
import InterpreterException from '../../exceptions/InterpreterException.mjs'
import Choice from '../../models/Choice.mjs'
import Section from '../../models/Section.mjs'
import Token from '../../models/Token.mjs'
import TokenTypes from '../../constants/custom/tokenTypes.mjs'
import ConditionalBlock from '../../models/ConditionalBlock.mjs'
import Action from '../../models/Action.mjs'
import InterpreterUtils from './InterpreterUtils.mjs'
import Loop from '../../models/Loop.mjs'
import ArrayLiteral from '../../models/ArrayLiteral.mjs'
import ArrayAccess from '../../models/ArrayAccess.mjs'
import MemberAccess from '../../models/MemberAccess.mjs'
import FunctionDef from '../../models/FunctionDef.mjs'
import FunctionCall from '../../models/FunctionCall.mjs'

/* eslint-disable no-eval */
class Interpreter {
  /**
   * @param {Run} run
   */
  constructor (run) {
    this.debug = typeof process !== 'undefined' && process
      ? process.env.IF_DEBUG
      : !!localStorage.getItem('IF_DEBUG')
    this.run = run || null
    this.utils = new InterpreterUtils()
    this.themeSheets = {}

    // Inject persistent UI styles before any applyTheme call so this sheet
    // is already counted in applyTheme's `before` baseline and never gets
    // mistakenly captured as a theme sheet (which would cause it to be
    // disabled on theme switches).
    if (typeof window !== 'undefined' && !document.getElementById('if_r-cs-styles')) {
      const csStyle = document.createElement('style')
      csStyle.id = 'if_r-cs-styles'
      csStyle.textContent = `
        /* Reset white-space inherited from #if_r-output-area (pre-wrap in many themes) */
        .if_r-stats-div { white-space: normal; }
        /* Paragraph content: override pre-wrap so the newlines between showdown's
           <p> tags don't render as extra blank lines, and normalise paragraph spacing. */
        .if_r-paras { white-space: normal; }
        .if_r-paras p { margin: 0 0 0.75em; }
        .if_r-paras p:last-child { margin-bottom: 0; }
        /* Override global pre{color} rules so status-bar stats text inherits
           the correct themed color from #if_r-status-bar instead. */
        #if_r-alerts-area pre { color: inherit; }
        /* Sidebar panel layout */
        .if_r-sb-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 13px 16px 13px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .if_r-sb-title {
          font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase; opacity: 0.45;
        }
        .if_r-stats-div .if_r-sb-header .closebtn {
          position: static; font-size: 18px; margin: 0; padding: 0;
          display: inline-block; opacity: 0.5; line-height: 1;
        }
        .if_r-stats-div .if_r-sb-header .closebtn:hover { opacity: 1; background: none; }
        .if_r-sb-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 6px 0; }
        .if_r-sb-group-label {
          padding: 6px 20px 3px;
          font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; opacity: 0.4;
        }
        /* Custom theme dropdown */
        .if_r-cs { position: relative; width: 100%; }
        .if_r-cs-btn {
          display: flex; justify-content: space-between; align-items: center;
          width: 100%; padding: 7px 12px;
          cursor: pointer; background: rgba(0,0,0,0.18); color: inherit;
          border: 1px solid rgba(255,255,255,0.15); font-size: 14px;
          font-family: inherit; border-radius: 3px; text-align: left;
          transition: background 0.15s, border-color 0.15s; box-sizing: border-box;
        }
        .if_r-cs-btn:hover { background: rgba(0,0,0,0.3); border-color: rgba(255,255,255,0.28); }
        .if_r-cs-arrow { font-size: 9px; transition: transform 0.2s; line-height: 1; opacity: 0.6; }
        .if_r-cs.open .if_r-cs-arrow { transform: rotate(180deg); }
        .if_r-cs-list {
          position: absolute; left: 0; right: 0; z-index: 200;
          margin: 3px 0 0; padding: 4px 0; list-style: none;
          background: inherit; border: 1px solid rgba(255,255,255,0.15);
          border-radius: 3px; box-shadow: 0 8px 20px rgba(0,0,0,0.5); overflow: hidden;
        }
        .if_r-cs-opt { padding: 8px 14px; cursor: pointer; font-size: 14px; transition: background 0.12s; }
        .if_r-cs-opt:hover { background: rgba(255,255,255,0.1); }
        .if_r-cs-opt.selected { font-weight: 600; }
        /* Ensure non-<a> elements in the sidebar inherit the theme's sidebar color */
        .if_r-sb-title, .if_r-sb-group-label { color: inherit; }
        .if_r-cs-btn, .if_r-cs-opt { color: inherit; }
        .if_r-made-with {
          position: fixed;
          left: 50%;
          bottom: 10px;
          transform: translateX(-50%);
          z-index: 120;
          font-size: 12px;
          opacity: 0.7;
          text-align: center;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.45);
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
          pointer-events: none;
        }
      `
      document.head.appendChild(csStyle)
    }

    // Only apply theme in browser environments
    if (this.run && typeof window !== 'undefined') {
      this.applyTheme(this.run.theme || 'default')
    }

    this.callStack = []
    this.MAX_CALL_DEPTH = 1000
    this.MAX_ITERATIONS = 10000
    this.loopControl = { break: false, continue: false }
    this.functionReturn = { hasReturned: false, value: null }
    this.runtimeOptions = {
      theme: 'default',
      allowUndo: true,
      showTurn: true,
      animations: true,
      autoSave: false
    }
    this.AUTO_SAVE_VERSION = 1
  }

  /**
   * @param {Story} story
   * @param {Run} run
   * @param {string} theme
   */
  loadStory (story, run, theme) {
    if (!story || !(story instanceof Story)) throw new InterpreterException('Invalid story supplied')
    this.run = run || new Run(story, null, null)
    this.run.story = story
    this.runtimeOptions = this.resolveRuntimeOptions(story, this.run, theme)
    this.run.theme = this.runtimeOptions.theme
    resetBuiltinState()

    /* Bring variables to original values. */
    // TODO: Don't need this. No global variables.
    this.resetVariables()
    this.run.state.onceConsumed = {}
    this.run.state.oldOnceConsumed = {}

    let startSection = this.run.story.settings.startAt
    let startTurn = 0
    const restoredState = this._loadAutoSave()
    if (restoredState) {
      this.run.state.variables = {
        ...this.run.state.variables,
        ...(restoredState.variables || {})
      }
      this.run.state.onceConsumed = { ...(restoredState.onceConsumed || {}) }
      this.run.state.oldOnceConsumed = { ...(restoredState.onceConsumed || {}) }
      startSection = restoredState.sectionSerial
      startTurn = typeof restoredState.turn === 'number' ? restoredState.turn : 0
      if (typeof restoredState.theme === 'string' && restoredState.theme.trim() !== '') {
        this.run.theme = restoredState.theme
        this.runtimeOptions.theme = restoredState.theme
      }
    }

    // Only apply theme/preferences in browser environments
    if (typeof window !== 'undefined') {
      this.applyTheme(this.run.theme || 'default')
      this.applyAnimationPreference(this.runtimeOptions.animations)
    }
    console.info('Story loading...')

    this.generateDisplay()
    this.applyRuntimeUiSettings()

    if (this.run.story.settings.fullTimer) {
      /* Set timer, if any. */
      const {
        timer,
        target
      } = this.run.story.settings.fullTimer
      if (timer !== 0) this.setTimer(timer, target)
    }

    if (this.run.story.settings.maxIterations) {
      this.MAX_ITERATIONS = this.run.story.settings.maxIterations
    }
    if (this.run.story.settings.maxCallDepth) {
      this.MAX_CALL_DEPTH = this.run.story.settings.maxCallDepth
    }

    /* Set initial state and initial variables */
    this.setState({
      section: startSection,
      turn: startTurn
    })
    this.run.state.variables.turn = startTurn

    /* Load the section into the viewport */
    this.loadSection(null, startSection)

    /* Start the stats bar */
    this.showStats()

    const undoButton = document.querySelector(DOM.undoButtonId)
    if (undoButton) {
      undoButton.style.display = this.runtimeOptions.allowUndo && startTurn > 0 ? 'block' : 'none'
    }

    if (!restoredState) this._persistAutoSave()

    /* Clear the console to make things clearer */
    if (!this.debug) console.clear()

    /* Good luck! */
    console.info('Load finished. Happy playing!')
  }

  resolveRuntimeOptions (story, run, themeOverride) {
    const defaults = {
      theme: 'default',
      allowUndo: true,
      showTurn: true,
      animations: true,
      autoSave: false
    }
    const settings = story && story.settings ? story.settings : {}
    const storyOptions = {
      theme: settings.theme || null,
      allowUndo: settings.allowUndo,
      showTurn: settings.showTurn,
      animations: settings.animations,
      autoSave: settings.autoSave
    }
    const hostOptions = run && run.options ? run.options : {}
    const explicitTheme = themeOverride !== undefined && themeOverride !== null ? { theme: themeOverride } : {}
    return {
      ...defaults,
      ...storyOptions,
      ...hostOptions,
      ...explicitTheme,
      theme: (explicitTheme.theme || hostOptions.theme || storyOptions.theme || defaults.theme)
    }
  }

  _getStorage () {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  }

  _isAutoSaveEnabled () {
    return this.runtimeOptions && this.runtimeOptions.autoSave === true
  }

  _hashString (text) {
    let hash = 5381
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) + hash) + text.charCodeAt(i)
      hash = hash >>> 0
    }
    return hash.toString(16)
  }

  _computeStoryFingerprint () {
    const story = this.run && this.run.story ? this.run.story : null
    if (!story) return 'unknown'
    const descriptor = {
      name: story.name || null,
      startAt: story.settings ? story.settings.startAt : null,
      sections: (story.sections || []).map(s => ({
        serial: s.serial,
        title: s && s.settings ? s.settings.title : null
      })),
      scenes: (story.scenes || []).map(s => ({
        serial: s.serial,
        name: s.name,
        first: s.first
      }))
    }
    return this._hashString(JSON.stringify(descriptor))
  }

  _getSaveKey () {
    const runOptions = this.run && this.run.options ? this.run.options : {}
    const suffix = runOptions.saveKey || this._computeStoryFingerprint()
    return `ifscript:save:${suffix}`
  }

  _buildSavePayload () {
    if (!this.run || !this.run.state || !this.run.story) return null
    const sectionSerial = this.run.state.section ? this.run.state.section.serial : null
    if (typeof sectionSerial !== 'number') return null

    const variables = {}
    const sourceVars = this.run.state.variables || {}
    Object.keys(sourceVars).forEach(key => {
      if (key === 'functions') return
      const value = sourceVars[key]
      if (typeof value === 'function') return
      try {
        variables[key] = JSON.parse(JSON.stringify(value))
      } catch {
        // Skip non-serializable values.
      }
    })

    return {
      version: this.AUTO_SAVE_VERSION,
      savedAt: Date.now(),
      storyFingerprint: this._computeStoryFingerprint(),
      sectionSerial,
      turn: this.run.state.turn,
      variables,
      onceConsumed: { ...(this.run.state.onceConsumed || {}) },
      theme: this.run.theme || this.runtimeOptions.theme || null
    }
  }

  _isValidSavePayload (payload) {
    if (!payload || typeof payload !== 'object') return false
    if (payload.version !== this.AUTO_SAVE_VERSION) return false
    if (payload.storyFingerprint !== this._computeStoryFingerprint()) return false
    if (typeof payload.sectionSerial !== 'number') return false
    const sectionExists = (this.run.story.sections || []).some(section => section.serial === payload.sectionSerial)
    if (!sectionExists) return false
    if (payload.variables && typeof payload.variables !== 'object') return false
    if (payload.onceConsumed && typeof payload.onceConsumed !== 'object') return false
    return true
  }

  _persistAutoSave () {
    if (!this._isAutoSaveEnabled()) return
    const storage = this._getStorage()
    if (!storage) return
    const payload = this._buildSavePayload()
    if (!payload) return
    try {
      storage.setItem(this._getSaveKey(), JSON.stringify(payload))
    } catch (err) {
      if (this.debug) console.warn('Auto-save failed:', err.message)
    }
  }

  _loadAutoSave () {
    if (!this._isAutoSaveEnabled()) return null
    const storage = this._getStorage()
    if (!storage) return null
    let payload = null
    try {
      const raw = storage.getItem(this._getSaveKey())
      if (!raw) return null
      payload = JSON.parse(raw)
    } catch (err) {
      if (this.debug) console.warn('Failed to parse saved state:', err.message)
      return null
    }

    if (!this._isValidSavePayload(payload)) return null

    if (this.run.options && this.run.options.resumePrompt === false) {
      return payload
    }

    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      const dateText = payload.savedAt ? new Date(payload.savedAt).toLocaleString() : 'unknown time'
      const accepted = window.confirm(`Resume previous session from ${dateText}?`)
      if (!accepted) return null
    }
    return payload
  }

  _clearAutoSave () {
    const storage = this._getStorage()
    if (!storage) return
    try {
      storage.removeItem(this._getSaveKey())
    } catch (err) {
      if (this.debug) console.warn('Failed to clear saved state:', err.message)
    }
  }

  applyRuntimeUiSettings () {
    const undoButton = document.querySelector(DOM.undoButtonId)
    if (!undoButton) return
    if (!this.runtimeOptions.allowUndo) {
      undoButton.style.display = 'none'
    }
  }

  generateDisplay () {
    console.info('Generating dislay...')
    let $main = document.querySelector(DOM.targetId)

    if (!$main) {
      const element = document.createElement('div')
      element.setAttribute('id', this.replaceHash(DOM.targetId))
      document.querySelector('body').appendChild(element)
      $main = document.querySelector(DOM.targetId)
    }

    $main.innerHTML = `
        <div id="${this.replaceHash(DOM.statsDivId)}" class="${this.replaceDot(DOM.statsDivClass)}">
            <div class="if_r-sb-header">
              <span class="if_r-sb-title">Menu</span>
              <a href="javascript:void(0)" class="closebtn">&#215;</a>
            </div>
            <div class="if_r-sb-divider"></div>
            <a href="#" id="${this.replaceHash(DOM.resetButtonId)}">&#8635;&ensp;Restart</a>
            <a href="#" id="${this.replaceHash(DOM.undoButtonId)}">&#8592;&ensp;Undo</a>
            <div class="if_r-sb-divider"></div>
            <div class="if_r-sb-group-label">Theme</div>
            <div style="padding:0 12px 10px;position:relative;background:inherit">
              <div id="${this.replaceHash(DOM.themeSelectId)}" class="if_r-cs" style="background:inherit">
                <button class="if_r-cs-btn" type="button">
                  <span class="if_r-cs-label">Theme</span>
                  <span class="if_r-cs-arrow">&#9660;</span>
                </button>
                <ul class="if_r-cs-list" hidden>
                  <li class="if_r-cs-opt" data-value="default">Default</li>
                  <li class="if_r-cs-opt" data-value="bricks">Bricks</li>
                  <li class="if_r-cs-opt" data-value="terminal">Terminal</li>
                  <li class="if_r-cs-opt" data-value="neon">Neon</li>
                  <li class="if_r-cs-opt" data-value="parchment">Parchment</li>
                  <li class="if_r-cs-opt" data-value="contrast">Contrast</li>
                  <li class="if_r-cs-opt" data-value="dark">Dark</li>
                  <li class="if_r-cs-opt" data-value="minimal">Minimal</li>
                  <li class="if_r-cs-opt" data-value="glass">Glass</li>
                </ul>
              </div>
            </div>
            <div class="if_r-sb-divider"></div>
            <a href="#" id="${this.replaceHash(DOM.animToggleId)}">&#9889;&ensp;Animations: on</a>
            <audio controls id="if_r-audio-player" style="display:none">
                <source src="" type="audio/mp3" id="if_r-audio-source">
                Your browser does not support audio.
            </audio>
        </div>
        <div id="if_r-status-bar">
        <div id="${this.replaceHash(DOM.alertAreaId)}">
        </div>
        <div id="${this.replaceHash(DOM.burgerId)}">
        <a href="#" id="if_r-burger-icon">&#9776;</a>
        </div>
        </div>
        <div id="${this.replaceHash(DOM.sectionDisplayId)}">
        </div>
        <div class="if_r-made-with">Made with ❤️ in IF-Script</div>`

    if (this.run) this._syncThemeSelect(this.run.theme || 'default')
    this._updateAnimToggleLabel(!document.body.classList.contains('if_r-reduce-motion'))

    const burger = document.querySelector(DOM.burgerId)

    burger.addEventListener('click', (e) => {
      e.preventDefault()
      const panel = document.querySelector(DOM.statsDivClass)
      if (panel && panel.style.display === 'block') {
        this.hideStatsDiv()
      } else {
        this.showStatsDiv()
      }
    })

    console.info('Display loaded.')
  }

  resetVariables () {
    this.run.state.variables = {}
    Object.keys(this.run.story.persistent)
      .forEach(key => (this.run.state.variables[key] = this.run.story.persistent[key]))
  }

  generateSectionBySerial (serial) {
    const section = this.run.story.findSection(serial)
    return this.generateHTMLForSection(section)
  }

  /**
   * @param {Section} section
   * @returns {*|string}
   */
  generateHTMLForSection (section) {
    let wrapper = ''
    if (!section || !(section instanceof Section)) {
      this.showAlert("Something's wrong!")
      return
    }
    section.choices = []
    let {
      title,
      choices,
      text,
      serial
    } = section

    let titleText = this.resolveSyntaxTree(title, '', section)
    titleText = this.replaceVars(titleText, this.run.state.variables)
    titleText = this.utils.formatText(titleText)
    let parasText = this.resolveSyntaxTree(text, '', section)
    parasText = this.replaceVars(parasText, this.run.state.variables)
    parasText = this.utils.formatText(parasText)

    wrapper += `<div class="if_r-section" id="section-${serial}">`

    wrapper += `<h3 class="if_r-section-title">${titleText}</h3>`

    wrapper += `<div class="if_r-paras">${parasText}</div>`

    wrapper += `<div class="if_r-section-choices-list" id="section-${serial}-choices">`

    wrapper = this.loadChoices(choices, wrapper, serial)

    wrapper += '</div>'

    return wrapper.replaceAll('<p></p>', '')
  }

  resolveArrayLiteral (arrLit, section) {
    const elements = arrLit.elements.map(elem => this.resolveAction(elem, false, section))
    return elements
  }

  resolveArrayAccess (access, returnName, section) {
    const array = this.resolveAction(access.array, false, section)
    const index = this.resolveAction(access.index, false, section)

    if (returnName) {
      // For assignment: arr[idx] = value
      // We need to return a way to set the value
      return { array, index, isArrayAccess: true }
    }

    // For reading
    if (!Array.isArray(array)) {
      throw new InterpreterException('Cannot index non-array value')
    }
    return array[index]
  }

  resolveMemberAccess (member, section) {
    const object = this.resolveAction(member.object, false, section)

    if (member.args === null) {
      // Property access
      return object[member.member]
    } else {
      // Method call
      const args = member.args.map(arg => this.resolveAction(arg, false, section))
      if (typeof object[member.member] === 'function') {
        return object[member.member](...args)
      } else {
        throw new InterpreterException(`${member.member} is not a method`)
      }
    }
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
        // Check for break
        if (statement.type === 'break') {
          this.loopControl.break = true
          break
        }

        // Check for continue
        if (statement.type === 'continue') {
          this.loopControl.continue = true
          break
        }

        // Check for return (from function)
        if (statement instanceof Action && statement.type === 'return') {
          this.functionReturn.hasReturned = true
          this.functionReturn.value = statement.left !== null
            ? this.resolveAction(statement.left, false, section)
            : null
          return ''
        }

        this.resolveSyntaxTree([statement], '', section)

        if (this.loopControl.continue) break
      }

      if (this.loopControl.break) break
      if (this.functionReturn.hasReturned) break
    }

    this.loopControl = { break: false, continue: false }
    return ''
  }

  callFunction (funcCall, section) {
    const funcName = typeof funcCall.name === 'string' ? funcCall.name : funcCall.name.symbol

    // Check built-in functions first
    if (BUILTINS[funcName]) {
      const argValues = funcCall.args.map(arg => this.resolveAction(arg, false, section))
      return BUILTINS[funcName](...argValues)
    }

    // Get user-defined function
    const funcDef = this.run.story.persistent.functions[funcName]
    if (!funcDef) {
      throw new InterpreterException(`Undefined function: ${funcName}`)
    }

    // Check call depth
    if (this.callStack.length >= this.MAX_CALL_DEPTH) {
      throw new InterpreterException(`Maximum call depth (${this.MAX_CALL_DEPTH}) exceeded`)
    }

    // Evaluate arguments
    const argValues = funcCall.args.map(arg => this.resolveAction(arg, false, section))

    // Save current variables (for local scope)
    const savedVars = { ...this.run.state.variables }

    this.callStack.push({ name: funcName, savedVars })

    // Bind parameters
    funcDef.params.forEach((param, i) => {
      this.run.state.variables[param] = argValues[i]
    })

    // Reset function return state
    this.functionReturn = { hasReturned: false, value: null }

    // Execute function body
    for (const statement of funcDef.body) {
      // Check for return statement
      if (statement instanceof Action && statement.type === 'return') {
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

    // Restore variables (local scope)
    // Keep any new globals created in the function
    const newGlobals = {}
    for (const key in this.run.state.variables) {
      if (!(key in savedVars) && !funcDef.params.includes(key)) {
        newGlobals[key] = this.run.state.variables[key]
      }
    }
    this.run.state.variables = { ...savedVars, ...newGlobals }

    // Reset function return state
    this.functionReturn = { hasReturned: false, value: null }

    return returnValue
  }

  /**
   * @param {ConditionalBlock} block
   */
  resolveConditionalBlock (block, section) {
    let result = ''
    if (block instanceof ConditionalBlock) {
      if (this.resolveAction(block.cond, false, section))
        result = this.resolveAction(block.then, false, section)
      else if (block.else) result = this.resolveAction(block.else, false, section)
    }

    return result
  }

  /**
   * @param {Array|string} tree
   * @param start
   */
  resolveSyntaxTree (tree, start = '', section) {
    if (typeof tree === 'string') { return tree }
    return tree.reduce((acc, v, idx) => {
      if (typeof start === 'string') {
        if (v instanceof Token) {
          const { VARIABLE, STRING, NUMBER } = TokenTypes
          if (v.type === VARIABLE) acc += this.run.state.variables[v.symbol]
          else if (v.type === STRING) acc += v.symbol + '\n\n'
          else if (v.type === NUMBER) acc += v.symbol
          else acc += v.symbol
        } else if (v instanceof ConditionalBlock) {
          acc += this.resolveConditionalBlock(v, section)
        } else if (v instanceof Loop) {
          acc += this.resolveLoop(v, section)
        } else if (v instanceof FunctionDef) {
          // Already stored in story.persistent.functions by parser; nothing to do here
        } else if (v instanceof FunctionCall || v instanceof MemberAccess || v instanceof ArrayAccess) {
          // Statement-level call (e.g. markVisited(1), arr.push(x)) — execute but don't add to text
          try {
            const result = this.resolveAction(v, false, section)
            if (result !== null && result !== undefined && result !== '') acc += result
          } catch (e) { /* ignore errors from statement-level calls */ }
        } else if (v instanceof Action) {
          acc += this.resolveAction(v, false, section)
        }
      }
      if (v instanceof Choice) {
        section.choices.push(v)
      }
      return acc
    }, start)
  }

  /**
   * @param {Action|Token} action
   * @param {boolean} returnName
   */
  resolveAction (action, returnName = false, section) {
    if (action instanceof Action) {
      if (action.type === 'assign') {
        const leftResolved = this.resolveAction(action.left, true, section)

        // Handle array access assignment: arr[idx] = value
        if (leftResolved && leftResolved.isArrayAccess) {
          leftResolved.array[leftResolved.index] = this.resolveAction(action.right, false, section)
          return ''
        }

        // Normal variable assignment
        this.run.state.variables[leftResolved] = this.resolveAction(action.right, false, section)
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
        // Return statement - handled in resolveLoop and callFunction
        return null
      }
    } else if (action instanceof ArrayLiteral) {
      return this.resolveArrayLiteral(action, section)
    } else if (action instanceof ArrayAccess) {
      return this.resolveArrayAccess(action, returnName, section)
    } else if (action instanceof MemberAccess) {
      return this.resolveMemberAccess(action, section)
    } else if (action instanceof FunctionCall) {
      return this.callFunction(action, section)
    } else if (!returnName && action instanceof Token && action.type === TokenTypes.VARIABLE) {
      return this.run.state.variables[action.symbol]
    } else if (action instanceof Choice) {
      section.choices.push(action)
      return null
    } else return action.symbol
  }

  loadChoices (choices, wrapper, serial) {
    choices = [...new Set(choices)]
    choices.forEach((choice, i) => {
      const { target, owner, mode } = choice
      const choiceIndex = choice.choiceI || (i + 1)
      if (choice.once && this.isChoiceConsumed(choice)) return
      const visibility = this.evaluateChoiceVisibility(choice, this.run.state.section)
      if (!visibility.visible) {
        if (typeof choice.disabledText === 'string' && choice.disabledText.trim() !== '') {
          wrapper += this.getDisabledChoiceWrapper(choice.disabledText)
        }
        return
      }
      const choiceText = this.utils.formatText(this.resolveSyntaxTree(choice.text, '')).trim()
        .replace(/^<p>/, '').replace(/<\/p>$/, '')
      if (choice.mode === 'input') wrapper += this.getChoiceWrapper(target, owner, serial, choiceIndex, mode, `${choiceText} <input type="text" class="if_r-choice-input" id="if_r-choice-input-${choiceIndex}" />`)
      else wrapper += this.getChoiceWrapper(target, owner, serial, choiceIndex, mode, choiceText)
    })
    return wrapper
  }

  getChoiceWrapper (target, owner, serial, i, mode, choiceText) {
    return `<div class="if_r-section-choice-li"> <div class="if_r-section-choice" data-if_r-target="${target}"
data-if_r-owner="${owner}" id="if_r-${serial}-choice-${i}"
data-if_r-mode="${mode}" data-if_r-i="${i}">${choiceText}</div></div>`
  }

  getDisabledChoiceWrapper (choiceText) {
    const safeText = this.utils.formatText(choiceText).trim().replace(/^<p>/, '').replace(/<\/p>$/, '')
    return `<div class="if_r-section-choice-li"><div class="if_r-section-choice if_r-section-choice-disabled" aria-disabled="true">${safeText}</div></div>`
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

  isSatisfied (condition) {
    if (!condition) {
      return true
    }

    const {
      comparisons,
      glue,
      // eslint-disable-next-line no-unused-vars
      type
    } = condition
    // let operators = ["==", ">=", "<=", ">", "<"];

    if (glue) {
      if (glue.trim() === '&') {
        comparisons.forEach(comp => {
          const truth = this.doesMatch(comp)

          if (!truth) {
            return false
          }
        })
        return true
      } else if (glue.trim() === '|') {
        comparisons.forEach(comp => {
          const truth = this.doesMatch(comp)

          if (truth) {
            return true
          }
        })
        return false
      }
    } else {
      return this.doesMatch(comparisons[0])
    }
  }

  doesMatch (comp, type) {
    let truth
    if (type && type === 'vs') {
      const real = this.run.state.variables[comp.variable]
      const given = parseInt(comp.against) ? parseInt(comp.against) : comp.against.trim()

      // console.log("eval(`(parseInt(${real}) ? parseInt(${real}) : '${real}') ${comp.operator.trim()} (parseInt(${given}) ? parseInt(${given}) : '${given}') ? true : false`)");

      truth = eval(`(parseInt('${real}') ? parseInt('${real}') : '${real}') ${comp.operator.trim()} (parseInt('${given}') ? parseInt('${given}') : '${given}') ? true : false`)
    } else {
      const real = this.run.state.variables[comp.variable]
      const given = parseInt(comp.against) ? parseInt(comp.against) : this.run.state.variables[comp.against.trim()]

      // console.log(`(parseInt(${real}) ? parseInt(${real}) : '${real}') ${comp.operator.trim()} (parseInt(${given}) ? parseInt(${given}) : '${given}') ? true : false`);

      truth = eval(`(parseInt('${real}') ? parseInt('${real}') : '${real}') ${comp.operator.trim()} (parseInt('${given}') ? parseInt('${given}') : '${given}') ? true : false`)
    }

    return truth
  }

  replaceVars (str, variables) {
    Object.keys(variables)
      .forEach(v => (str = this.replaceOneVariable(str, v, variables[v])))
    return str
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
  }

  setupUndo () {
    this.setState({
      lastSection: this.run.state.section
    })
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

  undoTurn () {
    if (!this.runtimeOptions.allowUndo) return
    this.undoVars(this.run.state.oldValues)
    this.run.state.onceConsumed = { ...this.run.state.oldOnceConsumed }
    this.changeTurn(-1)
    this.switchSection(this.run.state.lastSection.serial, true)
    document.querySelector(DOM.undoButtonId).style.display = 'none'
    this._persistAutoSave()
  }

  switchSection (targetSec, isUndo) {
    const sectionHTML = this.generateSectionBySerial(targetSec)
    this.loadSection(sectionHTML)

    if (!isUndo) {
      this.setupUndo()
      document.querySelector(DOM.undoButtonId).style.display = this.runtimeOptions.allowUndo ? 'block' : 'none'
    }

    const section = this.run.story.findSection(targetSec)
    const {
      timer,
      target
    } = section.settings.timer
    if (this.run.state.currentTimeout) { clearTimeout(this.run.state.currentTimeout) }
    if (timer && target) {
      this.setTimer(timer, target)
    }

    if (!isUndo) this.changeTurn()

    this.setState({
      section: targetSec
    })

    this.showStats()
    this._persistAutoSave()
  }

  setState (opts) {
    Object.keys(opts).forEach(opt => {
      if (opt !== 'section') {
        this.run.state[opt] = opts[opt]
        // if (opt === "turn")
        //     this.changeTurn(null, opts[opt]);
      } else if (opt === 'section') {
        // if (this.debug) console.log(this.run.story.findSection(opts['section']));
        this.run.state.section = this.run.story.findSection(opts.section)
      }
    })
  }

  changeTurn (change, abs) {
    this.setState({
      turn: abs || (change ? (this.run.state.turn + change) : this.run.state.turn + 1)
    })

    this.run.state.variables.turn = abs || (change ? (this.run.state.turn + change) : this.run.state.turn + 1)
  }

  _isStatusStatVisible (name, statsConfig, hasExplicitInclusions) {
    const config = statsConfig[name]
    if (config && typeof config === 'object' && Object.prototype.hasOwnProperty.call(config, 'showInStatusBar')) {
      return config.showInStatusBar === true
    }
    return !hasExplicitInclusions
  }

  showStats () {
    const statsConfig = this.run.story && this.run.story.stats && typeof this.run.story.stats === 'object'
      ? this.run.story.stats
      : {}
    const hasExplicitInclusions = Object.values(statsConfig).some(cfg =>
      cfg && typeof cfg === 'object' && cfg.showInStatusBar === true
    )

    const stats = Object.keys(this.run.state.variables)
    let statsHTML = '<pre> '
    if (this.runtimeOptions.showTurn !== false) {
      statsHTML += `<b>Turn:</b> ${this.run.state.turn}   `
    }

    stats.forEach(stat => {
      if (stat === 'turn') return
      const val = this.run.state.variables[stat]
      if (val !== null && typeof val === 'object') return
      if (!this._isStatusStatVisible(stat, statsConfig, hasExplicitInclusions)) return
      const config = statsConfig[stat]
      const displayName = config && typeof config === 'object' && typeof config.statusBarLabel === 'string' && config.statusBarLabel.trim() !== ''
        ? config.statusBarLabel
        : stat
      statsHTML += `<b>${displayName}:</b> ${val}   `
    })

    statsHTML += '</pre>'

    document.querySelector(DOM.alertAreaId).innerHTML = statsHTML
  }

  loadSection (sectionHTML, serial) {
    if (!this.run.story.settings.referrable) {
      this.replaceSection(sectionHTML, serial)
    } else {
      this.appendSection(sectionHTML, serial)
    }
  }

  changeVariables (vars, to) {
    /* Precautionary saving of old values of variables. */
    this.recordOldValues(vars)

    vars.forEach(variable => {
      this.run.state.variables[variable instanceof Token ? variable.symbol : variable] = parseInt(to) ? parseInt(to) : to
    })
    this._persistAutoSave()
  }

  doActions (actions) {
    actions.forEach(act => {
      Object.assign(this.run.state.oldValues, this.run.state.variables)
      this.resolveAction(act)
    })
    this._persistAutoSave()
  }

  finishAction (subject, op, modifier) {
    if (op === '+') {
      this.run.state.variables[subject] += modifier
    } else if (op === '-') {
      this.run.state.variables[subject] -= modifier
    } else if (op === '*') {
      this.run.state.variables[subject] *= modifier
    } else if (op === '/') {
      this.run.state.variables[subject] /= modifier
    } else if (op === '=') {
      this.run.state.variables[subject] = modifier
    }
  }

  setTimer (timer, target) {
    return (this.run.state.currentTimeout = setTimeout(() => {
      this.switchSection(target)
    }, timer * 1000))
  }

  replaceSection (sectionHTML, serial) {
    if (serial !== null && serial !== undefined) document.querySelector(DOM.sectionDisplayId).innerHTML = this.generateSectionBySerial(serial)
    else {
      document.querySelector(DOM.sectionDisplayId).innerHTML = sectionHTML
    }
    this.setListenersOnChoices()
  }

  appendSection (sectionHTML, serial) {
    if (serial !== null && serial !== undefined) document.querySelector(DOM.sectionDisplayId).innerHTML = this.generateSectionBySerial(serial)
    else {
      document.querySelector(DOM.sectionDisplayId).innerHTML += sectionHTML
    }
    this.setListenersOnChoices()
  }

  showAlert (html) {
    document.querySelector(DOM.alertAreaId).innerHTML = html
    setTimeout(() => {
      document.querySelector(DOM.alertAreaId).innerHTML = ''
    }, 3000)
  }

  setListenersOnChoices () {
    document.querySelectorAll('.if_r-section-choice').forEach(choice => {
      if (choice.classList.contains('if_r-section-choice-disabled')) return
      choice.onclick = (e) => {
        e.preventDefault()
        const choiceI = choice.getAttribute('data-if_r-i')
        if (!choiceI) return
        let { actions, targetType, mode, variables: vars, target: tar, input } = this.run.state.section.findChoice(choiceI)
        const selectedChoice = this.run.state.section.findChoice(choiceI)
        this.run.state.oldOnceConsumed = { ...this.run.state.onceConsumed }

        // if (this.debug) console.log("owner:", owner);

        if (targetType === 'scene') {
          const scene = this.run.story.findScene(tar)
          if (this.debug === true) console.log('Going to scene ' + tar)
          tar = scene.first
          if (this.debug === true) console.log('Starting section ' + tar)
          this.doSceneActions(scene)
        }

        if (mode === 'input') {
          const inputValue = document.querySelector(`#if_r-choice-input-${choiceI}`).value
          if (inputValue === '') {
            // if (this.debug === true) this.showAlert("Empty input not allowed!");
          } else {
            choice.onclick = ''
            this.changeVariables(vars, inputValue)
            this.changeVariables(input, inputValue)
            if (actions) this.doActions(actions)
            this.consumeChoice(selectedChoice)
            this.switchSection(tar)
          }
        } else {
          choice.onclick = ''
          this.changeVariables(vars, choice.innerHTML)
          if (actions) this.doActions(actions)
          this.consumeChoice(selectedChoice)
          this.switchSection(tar)
        }
      }
    })
  }

  doSceneActions (scene) {
    if (this.debug) console.log('Doing relevant scene actions...')

    this.run.state.scene = scene

    const { music } = this.run.state.scene

    if (music) {
      try {
        // eslint-disable-next-line no-unused-vars
        const url = new URL(music)
        document.querySelector('#if_r-audio-source').src = url.href
        const player = document.querySelector('#if_r-audio-player')
        player.load()
        player.play()
        // .then(d => console.log("Playing audio now."))
        // .catch(e => console.log(e));
      } catch (e) {
        if (this.debug) console.log('Invalid URL.')
      }
    }
  }

  resetStory () {
    if (window.confirm('Restart the story? this is a beta feature.')) {
      this._clearAutoSave()
      this.loadStory(this.run.story, null, this.run.theme)
    }
  }

  showStatsDiv () {
    const statsDiv = document.querySelector(DOM.statsDivClass)
    statsDiv.style.display = 'block'
    statsDiv.style.width = '100%'

    this.sidebarListeners('set')
  }

  sidebarListeners (setting) {
    if (setting === 'set') {
      document.querySelector(`${DOM.statsDivId} .closebtn`).onclick = this.hideStatsDiv
      if (this.runtimeOptions.allowUndo) {
        document.querySelector(DOM.undoButtonId).onclick = this.undoTurn
      } else {
        document.querySelector(DOM.undoButtonId).onclick = null
      }
      document.querySelector(DOM.resetButtonId).onclick = this.resetStory.bind(this)
      document.querySelector(DOM.animToggleId).onclick = (e) => { e.preventDefault(); this.toggleAnimations() }

      const cs = document.querySelector(DOM.themeSelectId)
      const csBtn = cs.querySelector('.if_r-cs-btn')
      const csList = cs.querySelector('.if_r-cs-list')
      csBtn.onclick = () => {
        const closing = !csList.hidden
        csList.hidden = closing
        cs.classList.toggle('open', !closing)
      }
      csList.onclick = (e) => {
        const opt = e.target.closest('.if_r-cs-opt')
        if (!opt) return
        this.applyTheme(opt.dataset.value)
        csList.hidden = true
        cs.classList.remove('open')
      }
      this._csOutside = (e) => {
        if (!cs.contains(e.target)) { csList.hidden = true; cs.classList.remove('open') }
      }
      document.addEventListener('click', this._csOutside)
    } else if (setting === 'unset') {
      document.querySelector(`${DOM.statsDivClass} .closebtn`).onclick = ''
      document.querySelector(DOM.undoButtonId).onclick = ''
      document.querySelector(DOM.resetButtonId).onclick = ''
      document.querySelector(DOM.animToggleId).onclick = null

      const cs = document.querySelector(DOM.themeSelectId)
      if (cs) {
        const csBtn = cs.querySelector('.if_r-cs-btn')
        if (csBtn) csBtn.onclick = null
        const csList = cs.querySelector('.if_r-cs-list')
        if (csList) csList.onclick = null
      }
      if (this._csOutside) {
        document.removeEventListener('click', this._csOutside)
        this._csOutside = null
      }
    }
  }

  hideStatsDiv = () => {
    const statsDiv = document.querySelector(DOM.statsDivClass)
    statsDiv.style.display = 'none'
    statsDiv.style.width = '0'

    this.sidebarListeners('unset')
  }

  _syncThemeSelect (name) {
    const cs = document.querySelector(DOM.themeSelectId)
    if (!cs) return
    const label = cs.querySelector('.if_r-cs-label')
    if (label) label.textContent = name.charAt(0).toUpperCase() + name.slice(1)
    cs.querySelectorAll('.if_r-cs-opt').forEach(o => o.classList.toggle('selected', o.dataset.value === name))

    // Re-read the themed link color and apply it to the sidebar container so
    // non-<a> children (spans, buttons, divs) inherit the correct color after
    // every theme switch.
    const statsDiv = document.querySelector(DOM.statsDivId)
    const firstLink = statsDiv ? statsDiv.querySelector('a[id]') : null
    if (firstLink) statsDiv.style.color = window.getComputedStyle(firstLink).color
  }

  replaceHash (str, to) {
    return str.replace('#', to || '')
  }

  replaceDot (str, to) {
    return str.replace('.', to || '')
  }

  // unused
  generateHTML (story) {
    const {
      name,
      sections,
      // eslint-disable-next-line no-unused-vars
      passages
    } = story
    let wrapper = ''
    wrapper += `<h2>${name} - New Story</h2>`

    document.title = `${name} | IF`

    sections.forEach(section => {
      wrapper += this.generateHTMLForSection(section)
    })
    return wrapper
  }

  executeJs (text) {
    // eslint-disable-next-line no-eval
    return eval(text)
  }

  generateStatsHtml () {
    // Should generate html for stats section of the sidebar.
  }

  setStats (html) {
    document.querySelector(DOM.statsDivId).innerHTML = html
  }

  async applyTheme (name) {
    if (typeof window === 'undefined') return
    if (!this.themeSheets[name]) {
      const before = document.styleSheets.length
      await import('../../themes/' + name + '.css').catch(() => {})
      this.themeSheets[name] = Array.from(document.styleSheets).slice(before)
    }
    // Disable all tracked theme sheets
    for (const sheets of Object.values(this.themeSheets)) {
      sheets.forEach(s => { s.disabled = true })
    }
    // Enable target
    ;(this.themeSheets[name] || []).forEach(s => { s.disabled = false })
    this.run.theme = name
    localStorage.setItem('if-theme', name)
    this._syncThemeSelect(name)
    this._persistAutoSave()
  }

  applyAnimationPreference (animationsEnabled = true) {
    // Inject disable-rule stylesheet once
    if (!document.getElementById('if_r-reduce-motion-style')) {
      const s = document.createElement('style')
      s.id = 'if_r-reduce-motion-style'
      s.textContent = 'body.if_r-reduce-motion *,body.if_r-reduce-motion *::before,body.if_r-reduce-motion *::after{animation:none!important;transition:none!important}'
      document.head.appendChild(s)
    }
    if (animationsEnabled === false) {
      document.body.classList.add('if_r-reduce-motion')
      this._updateAnimToggleLabel(false)
      return
    }
    const saved = localStorage.getItem('if-reduce-motion')
    const osPrefers = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (saved === '1' || (saved === null && osPrefers)) {
      document.body.classList.add('if_r-reduce-motion')
      this._updateAnimToggleLabel(false)
    } else {
      document.body.classList.remove('if_r-reduce-motion')
      this._updateAnimToggleLabel(true)
    }
  }

  toggleAnimations () {
    const reduced = document.body.classList.toggle('if_r-reduce-motion')
    localStorage.setItem('if-reduce-motion', reduced ? '1' : '0')
    this._updateAnimToggleLabel(!reduced)
  }

  _updateAnimToggleLabel (animationsOn) {
    const btn = document.querySelector(DOM.animToggleId)
    if (btn) btn.textContent = animationsOn ? 'Animations: on' : 'Animations: off'
  }
}

/* eslint-enable no-eval */

export default Interpreter
