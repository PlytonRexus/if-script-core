import Settings from './Settings.mjs'

class SectionSettings extends Settings {

  _class = 'SectionSettings'

  get type() {
    return this._class
  }

  set type(_type) {
    this._class = _type
  }

  /**
   * @param { { timer:number, title:string|Array } } input
   */
  constructor (input, json) {
    if (!!json) {
      if (typeof json === 'string')
      json = JSON.parse(json)
      input = json
    }

    super(input)
    if (typeof input.timer === 'number') {
      this.timer = { timer: input.timer, target: null }
    } else if (input.timer && typeof input.timer === 'object') {
      this.timer = {
        timer: typeof input.timer.timer === 'number' ? input.timer.timer : 0,
        target: Object.prototype.hasOwnProperty.call(input.timer, 'target') ? input.timer.target : null
      }
    } else {
      this.timer = { timer: 0, target: null }
    }
    this.title = input.title || ''
    this.ambience = input.ambience || null
    this.ambienceVolume = typeof input.ambienceVolume === 'number' ? input.ambienceVolume : 1
    this.ambienceLoop = input.ambienceLoop !== undefined ? input.ambienceLoop : true
    this.ambienceFadeInMs = typeof input.ambienceFadeInMs === 'number' ? input.ambienceFadeInMs : 0
    this.ambienceFadeOutMs = typeof input.ambienceFadeOutMs === 'number' ? input.ambienceFadeOutMs : 0
    this.sfx = Array.isArray(input.sfx) ? input.sfx : []
    this.backdrop = input.backdrop || null
    this.shot = input.shot || 'medium'
    this.textPacing = input.textPacing || 'instant'
    this.variables = {}
  }

  static fromJson(json) {
    return new SectionSettings({}, json)
  }

}

export default SectionSettings
