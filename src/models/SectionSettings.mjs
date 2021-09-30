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
    this.timer = input.timer
    this.title = input.title
    this.variables = {}
  }

  static fromJson(json) {
    return new SectionSettings({}, json)
  }

}

export default SectionSettings
