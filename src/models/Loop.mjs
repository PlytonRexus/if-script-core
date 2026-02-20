class Loop {

  _class = 'Loop'

  constructor (input, json) {
    if (!!json) {
      if (typeof json === 'string')
      json = JSON.parse(json)
      input = json
    }

    const { loopType, condition, body } = input

    this.loopType = loopType // 'while'
    this.condition = condition
    this.body = body // array of statements
  }

  static fromJson (json) {
    return new Loop({}, json)
  }

  get type () {
    return this._class
  }

  set type (_type) {
    this._class = _type
  }

}

export default Loop
