import ParsingException from '../exceptions/ParsingException.mjs'

class Scene {

  _class = 'Scene'

  get type() {
    return this._class
  }

  set type(_type) {
    this._class = _type
  }

  /**
   * @param {[number]} sections
   * @param {number} first
   * @param {string} name
   */
  constructor (sections, { first, name }, json) {
    if (!!json) {
      if (typeof json === 'string')
        json = JSON.parse(json)
      Object.assign(this, json)
      this.sections = json.sections || []
      this.first = json.first || this.sections[0]
      this.last = this.sections ? this.sections[this.sections.length - 1] : null
      this.name = json.name || 'Untitled'
      this.music = json.music || null
      this.musicVolume = typeof json.musicVolume === 'number' ? json.musicVolume : 1
      this.musicLoop = json.musicLoop !== undefined ? json.musicLoop : true
      this.musicFadeInMs = typeof json.musicFadeInMs === 'number' ? json.musicFadeInMs : 0
      this.musicFadeOutMs = typeof json.musicFadeOutMs === 'number' ? json.musicFadeOutMs : 0
      this.sceneTransition = json.sceneTransition || 'cut'
      return
    }

    if (!(sections instanceof Array)) {
      throw new ParsingException('Unexpected argument supplied.' + sections + 'is not an array.')
    }

    this.sections = sections
    this.first = first || sections[0]
    this.last = sections ? sections[sections.length - 1] : null

    this.name = name || 'Untitled'
    this.music = null
    this.musicVolume = 1
    this.musicLoop = true
    this.musicFadeInMs = 0
    this.musicFadeOutMs = 0
    this.sceneTransition = 'cut'
  }

  static fromJson(json) {
    return new Scene([], {}, json)
  }
}

export default Scene
