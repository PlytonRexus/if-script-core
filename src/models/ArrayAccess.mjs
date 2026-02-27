class ArrayAccess {
  constructor (input, json) {
    this._class = 'ArrayAccess'
    if (json) {
      if (typeof json === 'string') { json = JSON.parse(json) }
      input = json
    }

    const { array, index } = input

    this.array = array // expression that evaluates to an array
    this.index = index // expression that evaluates to a number
  }

  static fromJson (json) {
    return new ArrayAccess({}, json)
  }

  get type () {
    return this._class
  }

  set type (_type) {
    this._class = _type
  }
}

export default ArrayAccess
