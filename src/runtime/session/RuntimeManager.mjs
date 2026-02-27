import EngineRuntime from '../engine/EngineRuntime.mjs'
import StorageAdapter from './StorageAdapter.mjs'
import AudioAdapter from './AudioAdapter.mjs'
import ThemeRegistry from './ThemeRegistry.mjs'
import LiteraryRenderer from '../renderers/literary/LiteraryRenderer.mjs'
import CinematicRenderer from '../renderers/cinematic/CinematicRenderer.mjs'
import EventTimeline from '../debug/EventTimeline.mjs'
import StateInspector from '../debug/StateInspector.mjs'
import DebugPanel from '../debug/DebugPanel.mjs'

const FORWARDED_EVENTS = [
  'session_started',
  'section_entered',
  'choices_updated',
  'stats_updated',
  'variable_changed',
  'scene_changed',
  'timer_started',
  'timer_elapsed',
  'timer_stopped',
  'turn_changed',
  'choice_consumed',
  'save_written',
  'save_loaded',
  'error_raised'
]

class RuntimeManager {
  constructor (options = {}) {
    this.options = options
    this.engine = new EngineRuntime(null, { debug: options.debug === true })
    this.storage = new StorageAdapter(options.storage || null)
    this.audio = new AudioAdapter({ debug: options.debug === true })
    this.themeRegistry = new ThemeRegistry()
    this.target = null
    this.renderer = null
    this.listeners = new Map()
    this.story = null
    this.menuOpen = false
    this.saveOpen = false
    this.activeTheme = 'literary-default'
    this.lastRendered = null
    this.isBootstrapping = false
    this.audioUnlockHandler = null

    this.debugEnabled = this.resolveDebugEnabled(options)
    this.audio.setDebug(this.debugEnabled)
    this.eventTimeline = new EventTimeline()
    this.stateInspector = new StateInspector()
    this.debugPanel = this.debugEnabled ? new DebugPanel() : null

    FORWARDED_EVENTS.forEach(name => {
      this.engine.on(name, payload => this.handleEngineEvent(name, payload))
    })
  }

  resolveDebugEnabled (options = {}) {
    if (options.debug === true) return true
    if (typeof process !== 'undefined' && process.env && process.env.IF_RUNTIME_DEBUG === '1') return true
    if (typeof window !== 'undefined' && window.location) {
      const url = new URL(window.location.href)
      if (url.searchParams.get('if_runtime_debug') === '1') return true
    }
    return false
  }

  on (eventName, handler) {
    if (typeof handler !== 'function') return () => {}
    if (!this.listeners.has(eventName)) this.listeners.set(eventName, new Set())
    const set = this.listeners.get(eventName)
    set.add(handler)
    return () => this.off(eventName, handler)
  }

  off (eventName, handler) {
    const set = this.listeners.get(eventName)
    if (!set) return
    set.delete(handler)
    if (set.size === 0) this.listeners.delete(eventName)
  }

  emit (eventName, payload) {
    const set = this.listeners.get(eventName)
    if (!set) return
    for (const handler of set) {
      try {
        handler(payload)
      } catch (err) {
        // Ignore observer errors.
      }
    }
  }

  resolveTarget (target) {
    if (!target && typeof document !== 'undefined') return document.querySelector('#if_r-output-area') || document.body
    if (typeof target === 'string' && typeof document !== 'undefined') return document.querySelector(target)
    return target
  }

  mount (target) {
    this.target = this.resolveTarget(target)
    if (!this.target) throw new Error('Runtime mount target not found')
    this.ensureRenderer(this.options.presentationMode || 'literary')
    this.installAudioUnlock()
    if (this.debugPanel) this.debugPanel.mount()
    return this
  }

  installAudioUnlock () {
    if (typeof document === 'undefined') return
    if (this.audioUnlockHandler) return

    const handler = () => {
      this.audio.resume()
      this.removeAudioUnlock()
      // Defer UI sync so first interaction (e.g. clicking a choice) can complete.
      if (typeof setTimeout === 'function') {
        setTimeout(() => this.syncAudioUi(), 0)
      } else {
        this.syncAudioUi()
      }
    }

    this.audioUnlockHandler = handler
    document.addEventListener('pointerdown', handler, { once: true })
    document.addEventListener('keydown', handler, { once: true })
    document.addEventListener('touchstart', handler, { once: true })
  }

  removeAudioUnlock () {
    if (typeof document === 'undefined') return
    if (!this.audioUnlockHandler) return
    document.removeEventListener('pointerdown', this.audioUnlockHandler)
    document.removeEventListener('keydown', this.audioUnlockHandler)
    document.removeEventListener('touchstart', this.audioUnlockHandler)
    this.audioUnlockHandler = null
  }

  ensureRenderer (mode = 'literary') {
    const nextMode = mode === 'cinematic' ? 'cinematic' : 'literary'
    const shouldReplace = !this.renderer || this.renderer.name !== nextMode
    if (!shouldReplace) return

    if (this.renderer) this.renderer.destroy()
    this.renderer = nextMode === 'cinematic' ? new CinematicRenderer() : new LiteraryRenderer()
    if (this.target) {
      this.renderer.mount(this.target, this.getRendererHandlers())
      this.renderer.setThemes(this.themeRegistry.getAvailableThemes())
      this.renderer.toggleMenu(this.menuOpen)
      this.renderer.toggleSavePanel(this.saveOpen)
      this.syncAudioUi()
    }
  }

  getRendererHandlers () {
    return {
      onChoiceSelect: (choiceIndex, inputValue = '') => this.selectChoice({ choiceIndex, inputValue }),
      onChoiceFocus: (choiceIndex) => this.handleChoiceFocus(choiceIndex),
      onUndo: () => this.undo(),
      onRestart: () => this.restart(),
      onThemeChange: (themeId) => this.setTheme(themeId),
      onToggleAudioEnabled: () => this.toggleAudioEnabled(),
      onToggleAudioPaused: () => this.toggleAudioPaused(),
      onToggleMenu: () => this.toggleMenu(),
      onToggleSavePanel: () => this.toggleSavePanel(),
      onSaveSlot: (slot) => this.save(slot),
      onLoadSlot: (slot) => this.load(slot)
    }
  }

  start (story, options = {}) {
    this.story = story
    const presentationMode = options.presentationMode || (story && story.settings ? story.settings.presentationMode : 'literary') || 'literary'
    this.ensureRenderer(presentationMode)
    this.audio.stopAll({ resetPaused: false, clearState: true })
    if (story && story.settings) this.audio.applyStory(story.settings)

    this.isBootstrapping = true
    try {
      let view = this.engine.start(story, options)

      if (this.engine.engineState.runtimeOptions.autoSave === true && options.resume !== false) {
        const auto = this.storage.readAutoSave(this.engine.engineState.storyFingerprint)
        const shouldResume = !!auto && this.shouldResumeAutoSave(auto, options)
        if (shouldResume) {
          const restored = this.engine.loadSnapshot(auto)
          if (restored) {
            this.applyAudioState(auto.audioState)
            view = restored
          }
        }
      }

      const requestedTheme = options.theme || this.engine.engineState.runtimeOptions.theme || 'literary-default'
      this.setTheme(requestedTheme)
      this.render(view)
      this.refreshSaveState()

      if (this.engine.engineState.runtimeOptions.autoSave === true) {
        this.persistAutoSave()
      }

      return view
    } finally {
      this.isBootstrapping = false
    }
  }

  shouldResumeAutoSave (payload, options = {}) {
    if (options.resumePrompt === false) return true
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      const dateText = payload.savedAt ? new Date(payload.savedAt).toLocaleString() : 'unknown time'
      return window.confirm(`Resume previous session from ${dateText}?`)
    }
    return true
  }

  render (viewModel) {
    if (!this.renderer) return
    this.lastRendered = viewModel
    this.renderer.render(viewModel)
    this.renderer.setThemes(this.themeRegistry.getAvailableThemes())
    this.renderer.setTheme(this.activeTheme)
    this.renderer.toggleMenu(this.menuOpen)
    this.renderer.toggleSavePanel(this.saveOpen)
    this.renderer.setSaveState(this.getSavePanelState())
    this.syncAudioUi()
  }

  syncAudioUi () {
    if (!this.renderer || typeof this.renderer.setAudioState !== 'function') return
    this.renderer.setAudioState(this.audio.getUiState())
  }

  getSavePanelState () {
    if (!this.engine || !this.engine.engineState || !this.engine.engineState.storyFingerprint) {
      return { autoSavedAt: null, slots: [] }
    }
    const fingerprint = this.engine.engineState.storyFingerprint
    const auto = this.storage.readAutoSave(fingerprint)
    const slots = this.storage.listSlotMetadata(fingerprint)
    return {
      autoSavedAt: auto ? auto.savedAt : null,
      slots
    }
  }

  refreshSaveState () {
    if (!this.renderer) return
    this.renderer.setSaveState(this.getSavePanelState())
  }

  persistAutoSave () {
    if (!this.engine || !this.engine.engineState || this.engine.engineState.runtimeOptions.autoSave !== true) return
    const fingerprint = this.engine.engineState.storyFingerprint
    const payload = this.engine.createSnapshot({ audioState: this.audio.getState() })
    if (!payload) return
    const ok = this.storage.writeAutoSave(fingerprint, payload)
    if (ok) this.emit('save_written', { slot: 'auto', payload })
  }

  applyAudioState (audioState) {
    if (!audioState || typeof audioState !== 'object') return
    this.audio.setState(audioState)
    if (audioState.enabled === false) {
      this.audio.setEnabled(false)
    } else if (audioState.paused === true) {
      this.audio.pausePlayback()
    } else {
      this.audio.resumePlayback()
    }
    this.syncAudioUi()
  }

  selectChoice ({ choiceIndex, inputValue = '' }) {
    const choice = this.lastRendered && this.lastRendered.section && Array.isArray(this.lastRendered.section.choices)
      ? this.lastRendered.section.choices.find(c => c.choiceIndex === choiceIndex)
      : null
    if (choice && choice.choiceSfx) this.audio.playSfx(choice.choiceSfx)

    const view = this.engine.selectChoice({ choiceIndex, inputValue })
    if (!view) return null
    this.render(view)
    this.persistAutoSave()
    this.refreshSaveState()
    return view
  }

  undo () {
    const view = this.engine.undo()
    if (!view) return null
    this.render(view)
    this.persistAutoSave()
    this.refreshSaveState()
    return view
  }

  restart () {
    const view = this.engine.restart()
    if (!view) return null
    this.render(view)
    this.persistAutoSave()
    this.refreshSaveState()
    return view
  }

  save (slot) {
    if (![1, 2, 3].includes(slot)) return false
    if (!this.engine || !this.engine.engineState) return false
    const payload = this.engine.createSnapshot({ audioState: this.audio.getState() })
    if (!payload) return false
    const ok = this.storage.writeSlotSave(this.engine.engineState.storyFingerprint, slot, payload)
    if (ok) {
      this.emit('save_written', { slot, payload })
      this.refreshSaveState()
    }
    return ok
  }

  load (slot) {
    if (![1, 2, 3].includes(slot)) return null
    if (!this.engine || !this.engine.engineState) return null
    const payload = this.storage.readSlotSave(this.engine.engineState.storyFingerprint, slot)
    if (!payload) return null
    const view = this.engine.loadSnapshot(payload)
    if (!view) return null
    this.applyAudioState(payload.audioState)
    this.emit('save_loaded', { slot, payload })
    this.render(view)
    this.persistAutoSave()
    this.refreshSaveState()
    return view
  }

  setTheme (themeId) {
    if (!this.target) return null
    const applied = this.themeRegistry.applyTheme(this.target, themeId, this.renderer ? this.renderer.name : 'literary')
    if (!applied) return null
    this.activeTheme = applied.id
    this.engine.setPreference({ key: 'theme', value: applied.id })
    if (this.renderer) this.renderer.setTheme(applied.id)
    this.persistAutoSave()
    this.refreshSaveState()
    return applied
  }

  setPreference ({ key, value }) {
    this.engine.setPreference({ key, value })
    if (key === 'presentationMode') {
      this.ensureRenderer(value)
      this.render(this.engine.getViewModel())
    } else if (key === 'theme') {
      this.setTheme(value)
    } else if (key === 'audioEnabled') {
      this.audio.setEnabled(value)
      this.syncAudioUi()
    }
    this.persistAutoSave()
    this.refreshSaveState()
  }

  toggleAudioEnabled () {
    const current = this.audio.getUiState()
    const next = !current.enabled
    this.setPreference({ key: 'audioEnabled', value: next })
    return next
  }

  toggleAudioPaused () {
    const current = this.audio.getUiState()
    if (current.paused) this.audio.resumePlayback()
    else this.audio.pausePlayback()
    this.syncAudioUi()
    this.persistAutoSave()
    this.refreshSaveState()
    return !current.paused
  }

  toggleMenu () {
    this.menuOpen = !this.menuOpen
    if (this.renderer) this.renderer.toggleMenu(this.menuOpen)
  }

  toggleSavePanel () {
    this.saveOpen = !this.saveOpen
    if (this.renderer) this.renderer.toggleSavePanel(this.saveOpen)
  }

  handleChoiceFocus (choiceIndex) {
    const choice = this.lastRendered && this.lastRendered.section && Array.isArray(this.lastRendered.section.choices)
      ? this.lastRendered.section.choices.find(c => c.choiceIndex === choiceIndex)
      : null
    if (choice && choice.focusSfx) this.audio.playSfx(choice.focusSfx)
  }

  handleEngineEvent (eventName, payload) {
    this.eventTimeline.push(eventName, payload)

    if (eventName === 'scene_changed' && payload && payload.scene) {
      this.audio.applyScene(payload.scene)
      this.syncAudioUi()
    }
    if (eventName === 'section_entered') {
      const current = this.engine && this.engine.run && this.engine.run.state ? this.engine.run.state.section : null
      if (current && current.settings) {
        this.audio.applySection(current.settings)
        const sectionSfx = Array.isArray(current.settings.sfx) ? current.settings.sfx : []
        sectionSfx.forEach(url => this.audio.playSfx(url))
      }
      this.syncAudioUi()
      if (!this.isBootstrapping) this.persistAutoSave()
      this.render(this.engine.getViewModel())
      this.refreshSaveState()
    }
    if (eventName === 'stats_updated' || eventName === 'choices_updated' || eventName === 'turn_changed') {
      this.render(this.engine.getViewModel())
    }

    this.emit(eventName, payload)

    if (this.debugPanel) {
      const model = {
        event: eventName,
        payload,
        state: this.stateInspector.summarize(this.engine),
        timeline: this.eventTimeline.getAll().slice(-20)
      }
      this.debugPanel.render(model)
    }
  }

  destroy () {
    this.removeAudioUnlock()
    this.audio.stopAll({ clearState: true })
    this.engine.destroy()
    if (this.renderer) this.renderer.destroy()
    this.renderer = null
    if (this.debugPanel) this.debugPanel.destroy()
    this.target = null
  }
}

export default RuntimeManager
