class RendererContract {
  constructor (name = 'renderer') {
    this.name = name
    this.target = null
    this.handlers = {}
  }

  mount (target, handlers = {}) {
    this.target = target
    this.handlers = handlers
  }

  render () {}

  destroy () {}
}

export default RendererContract
