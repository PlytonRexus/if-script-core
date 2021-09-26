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
      sections = json.sections
      first = json.first
      name = json.name
    }

    if (!(sections instanceof Array)) {
      throw new ParsingException('Unexpected argument supplied.' + sections + 'is not an array.')
    }

    this.sections = sections
    this.first = first || sections[0]
    this.last = sections ? sections[sections.length - 1] : null

    this.name = name || 'Untitled'
  }

  static fromJson(json) {
    return new Scene([], {}, json)
  }
}

export default Scene
