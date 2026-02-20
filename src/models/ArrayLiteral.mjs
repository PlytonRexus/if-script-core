class ArrayLiteral {

  _class = 'ArrayLiteral'

  constructor (input, json) {
    if (!!json) {
      if (typeof json === 'string')
      json = JSON.parse(json)
      input = json
    }

    const { elements } = input

    this.elements = elements || [] // array of expressions
  }

  static fromJson (json) {
    return new ArrayLiteral({}, json)
  }

  get type () {
    return this._class
  }

  set type (_type) {
    this._class = _type
  }

}

export default ArrayLiteral
