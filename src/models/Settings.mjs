class Settings {

  _class = 'Settings'

  get type() {
    return this._class
  }

  set type(_type) {
    this._class = _type
  }

  /**
   * @param {{ startAt:number, fullTimer:number }} input
   */
  constructor (input, json) {
    if (!!json) {
      if (typeof json === 'string')
      json = JSON.parse(json)
      this.input = json.input
    } else {
      this.input = input
    }
  }

  static fromJson(json) {
    return new Settings({}, json)
  }

}

export default Settings
