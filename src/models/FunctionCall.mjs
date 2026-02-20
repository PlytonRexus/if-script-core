class FunctionCall {

  _class = 'FunctionCall'

  constructor (input, json) {
    if (!!json) {
      if (typeof json === 'string')
      json = JSON.parse(json)
      input = json
    }

    const { name, args } = input

    this.name = name // function name (string)
    this.args = args || [] // array of argument expressions
  }

  static fromJson (json) {
    return new FunctionCall({}, json)
  }

  get type () {
    return this._class
  }

  set type (_type) {
    this._class = _type
  }

}

export default FunctionCall
