import './if-status-bar.mjs'
import './if-story-view.mjs'
import './if-menu-drawer.mjs'
import './if-save-panel.mjs'

const BaseHTMLElement = typeof HTMLElement === 'undefined' ? class {} : HTMLElement

class IFRuntimeShell extends BaseHTMLElement {
  constructor () {
    super()
    this.attachShadow({ mode: 'open' })
    this.model = {
      section: null,
      stats: [],
      mode: 'literary',
      themeId: 'literary-default',
      menuOpen: false,
      saveOpen: false,
      themes: [],
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

  setModel (model, handlers = {}) {
    this.model = { ...this.model, ...(model || {}) }
    this.handlers = handlers || this.handlers
    this.render()
  }

  render () {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          min-height: 100vh;
          background: var(--if-surface, #f4ead8);
          color: var(--if-text, #2b2118);
          padding: clamp(14px, 2vw, 24px);
          box-sizing: border-box;
        }
        .shell {
          max-width: 860px;
          margin: 0 auto;
          display: grid;
          gap: 14px;
        }
        .top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }
        .menu-toggle {
          border: 1px solid var(--if-menu-button-border, #b9a989);
          background: var(--if-menu-button-bg, #fffaf0);
          color: inherit;
          border-radius: 8px;
          padding: 6px 10px;
          cursor: pointer;
        }
      </style>
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
    status.setModel({ stats: this.model.stats || [] })

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
      handlers: {
        onUndo: this.handlers.onUndo,
        onRestart: this.handlers.onRestart,
        onThemeChange: this.handlers.onThemeChange,
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
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('if-runtime-shell')) {
  customElements.define('if-runtime-shell', IFRuntimeShell)
}

export default IFRuntimeShell
