const BaseHTMLElement = typeof HTMLElement === 'undefined' ? class {} : HTMLElement

class IFMenuDrawer extends BaseHTMLElement {
  constructor () {
    super()
    this.attachShadow({ mode: 'open' })
    this.model = {
      open: false,
      themes: [],
      activeTheme: 'literary-default',
      audio: {
        enabled: true,
        paused: false,
        hasLoadedAudio: false
      }
    }
    this.handlers = {}
  }

  connectedCallback () {
    this.render()
  }

  setModel ({ open = false, themes = [], activeTheme = 'literary-default', audio = {}, handlers = {} }) {
    this.model = { open, themes, activeTheme, audio: audio || {} }
    this.handlers = handlers
    this.render()
  }

  render () {
    if (!this.shadowRoot) return
    const options = this.model.themes.map(theme => `<option value="${theme.id}" ${theme.id === this.model.activeTheme ? 'selected' : ''}>${theme.name}</option>`).join('')
    const audio = this.model.audio || {}
    const isAudioEnabled = audio.enabled !== false
    const isAudioPaused = audio.paused === true
    const hasLoadedAudio = audio.hasLoadedAudio === true
    const muteLabel = isAudioEnabled ? 'Mute' : 'Unmute'
    const playbackLabel = isAudioPaused ? 'Play' : 'Pause'
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .drawer {
          border: 1px solid var(--if-menu-border, #c7b79a);
          border-radius: 12px;
          padding: 12px;
          background: var(--if-menu-bg, #f6efe0);
          color: var(--if-menu-text, #2f2417);
          display: ${this.model.open ? 'grid' : 'none'};
          gap: 10px;
        }
        .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        button, select {
          border: 1px solid var(--if-menu-button-border, #b9a989);
          background: var(--if-menu-button-bg, #fffaf0);
          color: inherit;
          border-radius: 8px;
          padding: 6px 10px;
          cursor: pointer;
        }
      </style>
      <div class="drawer" part="menu-drawer">
        <div class="row" part="menu-actions">
          <button id="undo" type="button">Undo</button>
          <button id="restart" type="button">Restart</button>
          <button id="save-toggle" type="button">Save/Load</button>
        </div>
        <div class="row" part="menu-audio">
          <label>Audio</label>
          <button id="audio-toggle" type="button">${muteLabel}</button>
          <button id="audio-playback-toggle" type="button" ${hasLoadedAudio ? '' : 'disabled'}>${playbackLabel}</button>
        </div>
        <div class="row" part="menu-theme">
          <label for="theme">Theme</label>
          <select id="theme">${options}</select>
        </div>
      </div>
    `

    const undo = this.shadowRoot.querySelector('#undo')
    const restart = this.shadowRoot.querySelector('#restart')
    const saveToggle = this.shadowRoot.querySelector('#save-toggle')
    const audioToggle = this.shadowRoot.querySelector('#audio-toggle')
    const audioPlaybackToggle = this.shadowRoot.querySelector('#audio-playback-toggle')
    const theme = this.shadowRoot.querySelector('#theme')

    undo.onclick = () => this.handlers.onUndo && this.handlers.onUndo()
    restart.onclick = () => this.handlers.onRestart && this.handlers.onRestart()
    saveToggle.onclick = () => this.handlers.onToggleSave && this.handlers.onToggleSave()
    audioToggle.onclick = () => this.handlers.onToggleAudioEnabled && this.handlers.onToggleAudioEnabled()
    audioPlaybackToggle.onclick = () => this.handlers.onToggleAudioPaused && this.handlers.onToggleAudioPaused()
    theme.onchange = (e) => this.handlers.onThemeChange && this.handlers.onThemeChange(e.target.value)
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('if-menu-drawer')) {
  customElements.define('if-menu-drawer', IFMenuDrawer)
}

export default IFMenuDrawer
