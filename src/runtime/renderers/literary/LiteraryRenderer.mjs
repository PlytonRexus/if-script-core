import RendererContract from '../base/RendererContract.mjs'
import '../../components/if-runtime-shell.mjs'

class LiteraryRenderer extends RendererContract {
  constructor () {
    super('literary')
    this.root = null
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
  }

  mount (target, handlers = {}) {
    super.mount(target, handlers)
    if (!target) return
    target.innerHTML = ''
    this.root = document.createElement('if-runtime-shell')
    this.root.setAttribute('data-if-renderer', 'literary')
    target.appendChild(this.root)
    this.root.setModel(this.model, this.handlers)
  }

  setTheme (themeId) {
    this.model.themeId = themeId
    if (this.root) this.root.setModel(this.model, this.handlers)
  }

  setThemes (themes) {
    this.model.themes = themes || []
    if (this.root) this.root.setModel(this.model, this.handlers)
  }

  setSaveState (saveState) {
    this.model.saveState = saveState || this.model.saveState
    if (this.root) this.root.setModel(this.model, this.handlers)
  }

  toggleMenu (open) {
    this.model.menuOpen = open
    if (this.root) this.root.setModel(this.model, this.handlers)
  }

  toggleSavePanel (open) {
    this.model.saveOpen = open
    if (this.root) this.root.setModel(this.model, this.handlers)
  }

  render (viewModel) {
    this.model = {
      ...this.model,
      section: viewModel ? viewModel.section : null,
      stats: viewModel ? viewModel.stats : []
    }
    if (this.root) this.root.setModel(this.model, this.handlers)
  }

  destroy () {
    if (this.target) this.target.innerHTML = ''
    this.root = null
  }
}

export default LiteraryRenderer
