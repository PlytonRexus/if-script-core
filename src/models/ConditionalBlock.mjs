class ConditionalBlock {

  _class = 'ConditionalBlock'

  constructor (input, json) {
    if (!!json) {
      if (typeof json === 'string')
      json = JSON.parse(json)
      input = json
    }

    const { cond, then, elseStatement } = input

    this.cond = cond
    this.then = then
    this.else = elseStatement

  }

  static fromJson(json) {
    return new ConditionalBlock({}, json)
  }

  get type() {
    return this._class
  }

  set type(_type) {
    this._class = _type
  }

}

export default ConditionalBlock
