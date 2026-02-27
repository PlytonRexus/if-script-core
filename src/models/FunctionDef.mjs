class FunctionDef {
  constructor (input, json) {
    this._class = 'FunctionDef'
    if (json) {
      if (typeof json === 'string') { json = JSON.parse(json) }
      input = json
    }

    const { name, params, body } = input

    this.name = name // function name (string)
    this.params = params || [] // array of parameter names (strings)
    this.body = body // array of statements
  }

  static fromJson (json) {
    return new FunctionDef({}, json)
  }

  get type () {
    return this._class
  }

  set type (_type) {
    this._class = _type
  }
}

export default FunctionDef
