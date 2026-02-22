import LiteraryRenderer from '../literary/LiteraryRenderer.mjs'

class CinematicRenderer extends LiteraryRenderer {
  constructor () {
    super()
    this.name = 'cinematic'
    this.model.mode = 'cinematic'
    this.model.themeId = 'cinematic'
  }

  mount (target, handlers = {}) {
    super.mount(target, handlers)
    if (this.root) {
      this.root.setAttribute('data-if-renderer', 'cinematic')
      this.root.setAttribute('data-if-mode', 'cinematic')
    }
  }
}

export default CinematicRenderer
