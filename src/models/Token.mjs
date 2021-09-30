class Token {

  _class = 'Token'

  /**
   * @param {string} type
   * @param {string|number} symbol
   * @param {number} id
   * @param {number} line
   * @param {number} col
   */
  constructor (input, json) {
    if (!!json) {
      if (typeof json === 'string') json = JSON.parse(json)
      input = json
    }

    const { type, symbol, id, line, col } = input

    this.type = input.type
    this.symbol = input.symbol
    this.id = input.id
    this.line = input.line
    this.col = input.col

  }

  static fromJson(json) {
    return new Token(null, json)
  }

  // get type() {
  //   return this._class
  // }

  // set type(_type) {
  //   this._class = _type
  // }

}

export default Token
