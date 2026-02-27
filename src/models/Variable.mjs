class Variable {
  constructor () {
    this._class = 'Variable'
  }

  get type () {
    return this._class
  }

  set type (_type) {
    this._class = _type
  }
}

export default Variable
