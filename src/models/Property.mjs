class Property {
  /**
   * @param {string} name
   * @param {Array|string} value
   * @param {string} type
   */
  constructor (input, type = 'property', json) {
    this._class = 'Property'
    if (json) {
      if (typeof json === 'string') { json = JSON.parse(json) }
      input = json
      type = json.type
    }
    this.name = input.name
    this.value = input.value
    this.type = type
  }

  static fromJson (json) {
    return new Property({}, null, json)
  }

  // get type() {
  //   return this._class
  // }

  // set type(_type) {
  //   this._class = _type
  // }
}

export default Property
