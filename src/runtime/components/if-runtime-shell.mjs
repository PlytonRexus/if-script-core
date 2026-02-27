import './if-status-bar.mjs'
import './if-story-view.mjs'
import './if-menu-drawer.mjs'
import './if-save-panel.mjs'

const BaseHTMLElement = typeof HTMLElement === 'undefined' ? class {} : HTMLElement

function clamp (value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function escapeHtml (value) {
  return String(value == null ? '' : value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

class IFRuntimeShell extends BaseHTMLElement {
  constructor () {
    super()
    this.attachShadow({ mode: 'open' })
    this.ribbonTicker = null
    this.model = {
      section: null,
      stats: [],
      timers: [],
      mode: 'literary',
      themeId: 'literary-default',
      menuOpen: false,
      saveOpen: false,
      themes: [],
      audio: {
        enabled: true,
        paused: false,
        hasLoadedAudio: false,
        playing: false
      },
      saveState: {
        autoSavedAt: null,
        slots: []
      }
    }
    this.handlers = {}
  }

  connectedCallback () {
    this.render()
  }

  disconnectedCallback () {
    this.clearRibbonTicker()
  }

  setModel (model, handlers = {}) {
    this.model = { ...this.model, ...(model || {}) }
    this.handlers = handlers || this.handlers
    this.render()
  }

  clearRibbonTicker () {
    if (!this.ribbonTicker) return
    clearInterval(this.ribbonTicker)
    this.ribbonTicker = null
  }

  getActiveTimers () {
    const now = Date.now()
    return (this.model.timers || []).filter(timer =>
      timer &&
      typeof timer.deadlineAt === 'number' &&
      timer.deadlineAt > now &&
      typeof timer.durationMs === 'number' &&
      timer.durationMs > 0
    )
  }

  syncRibbonTicker () {
    const hasActiveTimers = this.getActiveTimers().length > 0
    if (!hasActiveTimers) {
      this.clearRibbonTicker()
      return
    }
    if (this.ribbonTicker) return
    this.ribbonTicker = setInterval(() => {
      if (!this.isConnected) return
      this.updateTimerRibbon()
      if (this.getActiveTimers().length === 0) this.clearRibbonTicker()
    }, 120)
  }

  buildTimerRibbonMarkup () {
    const now = Date.now()
    const timers = this.getActiveTimers()
    if (timers.length === 0) return ''
    const lanes = timers.map(timer => {
      const elapsedMs = clamp(now - timer.startedAt, 0, timer.durationMs)
      const progress = clamp((elapsedMs / timer.durationMs) * 100, 0, 100)
      const remainingMs = Math.max(0, timer.deadlineAt - now)
      const remainingSeconds = Math.ceil(remainingMs / 1000)
      const timerTypeLabel = timer.timerType === 'full' ? 'Story timer' : 'Section timer'
      const outcomeText = typeof timer.outcomeText === 'string' && timer.outcomeText.trim() !== ''
        ? timer.outcomeText.trim()
        : ''
      const ariaLabel = outcomeText === ''
        ? `${timerTypeLabel}: ${remainingSeconds} seconds left.`
        : `${timerTypeLabel}: ${remainingSeconds} seconds left. ${outcomeText}`
      return `
        <div class="timer-ribbon-lane" role="progressbar" aria-label="${escapeHtml(ariaLabel)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress)}">
          <span class="timer-ribbon-fill" style="width:${progress}%"></span>
          <span class="timer-ribbon-cap" style="left:${progress}%"></span>
        </div>
      `
    }).join('')
    return `<div class="timer-ribbon" part="timer-ribbon">${lanes}</div>`
  }

  updateTimerRibbon () {
    if (!this.shadowRoot) return
    const mount = this.shadowRoot.querySelector('#timer-ribbon-mount')
    if (!mount) return
    mount.innerHTML = this.buildTimerRibbonMarkup()
  }

  render () {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          min-height: 100%;
          background: var(--if-surface, #f4ead8);
          color: var(--if-text, #2b2118);
          padding: clamp(10px, 2vw, 24px);
          box-sizing: border-box;
          container-type: inline-size;
        }
        .shell {
          width: 100%;
          max-width: 860px;
          margin: 0 auto;
          display: grid;
          gap: 14px;
        }
        .top {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          align-items: start;
          gap: 10px;
        }
        if-status-bar {
          min-width: 0;
        }
        .menu-toggle {
          border: 1px solid var(--if-menu-button-border, #b9a989);
          background: var(--if-menu-button-bg, #fffaf0);
          color: inherit;
          border-radius: 8px;
          padding: 6px 10px;
          cursor: pointer;
          min-height: 36px;
        }
        .timer-ribbon {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          display: grid;
          gap: 2px;
          padding-top: env(safe-area-inset-top, 0px);
          pointer-events: none;
        }
        .timer-ribbon-lane {
          position: relative;
          height: 4px;
          overflow: hidden;
          background: linear-gradient(90deg, rgba(26, 36, 56, 0.38), rgba(12, 16, 26, 0.7));
          box-shadow:
            inset 0 0 0 1px rgba(255, 255, 255, 0.18),
            0 0 14px rgba(18, 211, 255, 0.18);
        }
        .timer-ribbon-fill {
          position: absolute;
          inset: 0 auto 0 0;
          display: block;
          width: 0;
          background:
            linear-gradient(120deg, #38d9ff 0%, #3bf3a8 35%, #ffd166 65%, #ff6b6b 100%);
          background-size: 220% 100%;
          animation: ribbon-flow 2s linear infinite;
          box-shadow: 0 0 12px rgba(59, 243, 168, 0.42);
          transition: width 120ms linear;
        }
        .timer-ribbon-cap {
          position: absolute;
          top: 50%;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, rgba(255, 255, 255, 0.95) 0%, rgba(103, 245, 255, 0.85) 30%, rgba(103, 245, 255, 0) 74%);
          filter: blur(0.3px);
          opacity: 0.85;
          animation: ribbon-cap-pulse 0.8s ease-in-out infinite;
        }
        @keyframes ribbon-flow {
          0% { background-position: 0% 50%; }
          100% { background-position: 220% 50%; }
        }
        @keyframes ribbon-cap-pulse {
          0% { opacity: 0.45; }
          50% { opacity: 0.95; }
          100% { opacity: 0.45; }
        }
        @container (max-width: 720px) {
          .top {
            grid-template-columns: 1fr;
          }
          .menu-toggle {
            width: 100%;
          }
          .shell {
            gap: 10px;
          }
        }
        @container (max-width: 480px) {
          :host {
            padding: 8px;
          }
          .menu-toggle {
            padding: 8px 10px;
          }
        }
      </style>
      <div id="timer-ribbon-mount"></div>
      <div class="shell" part="runtime-shell">
        <div class="top">
          <button class="menu-toggle" id="menu-toggle" type="button" part="menu-toggle">Menu</button>
          <if-status-bar></if-status-bar>
        </div>
        <if-menu-drawer></if-menu-drawer>
        <if-save-panel></if-save-panel>
        <if-story-view></if-story-view>
      </div>
    `

    const status = this.shadowRoot.querySelector('if-status-bar')
    status.setModel({
      stats: this.model.stats || [],
      timers: this.model.timers || []
    })

    const story = this.shadowRoot.querySelector('if-story-view')
    story.setModel({
      section: this.model.section,
      onChoiceSelect: this.handlers.onChoiceSelect,
      onChoiceFocus: this.handlers.onChoiceFocus
    })

    const menu = this.shadowRoot.querySelector('if-menu-drawer')
    menu.setModel({
      open: !!this.model.menuOpen,
      themes: this.model.themes || [],
      activeTheme: this.model.themeId || 'literary-default',
      audio: this.model.audio || {},
      handlers: {
        onUndo: this.handlers.onUndo,
        onRestart: this.handlers.onRestart,
        onThemeChange: this.handlers.onThemeChange,
        onToggleAudioEnabled: this.handlers.onToggleAudioEnabled,
        onToggleAudioPaused: this.handlers.onToggleAudioPaused,
        onToggleSave: this.handlers.onToggleSavePanel
      }
    })

    const savePanel = this.shadowRoot.querySelector('if-save-panel')
    savePanel.setModel({
      open: !!this.model.saveOpen,
      autoSavedAt: this.model.saveState ? this.model.saveState.autoSavedAt : null,
      slots: this.model.saveState ? this.model.saveState.slots : [],
      handlers: {
        onSave: this.handlers.onSaveSlot,
        onLoad: this.handlers.onLoadSlot
      }
    })

    const toggle = this.shadowRoot.querySelector('#menu-toggle')
    toggle.onclick = () => {
      if (this.handlers.onToggleMenu) this.handlers.onToggleMenu()
    }

    this.updateTimerRibbon()
    this.syncRibbonTicker()
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('if-runtime-shell')) {
  customElements.define('if-runtime-shell', IFRuntimeShell)
}

export default IFRuntimeShell
