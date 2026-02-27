class ConditionalBlock {
  constructor (input, json) {
    this._class = 'ConditionalBlock'
    if (json) {
      if (typeof json === 'string') { json = JSON.parse(json) }
      input = json
    }

    const { cond, then, ifBlock, elseBlock, elseStatement, else: elseExpression } = input

    this.cond = cond
    this.ifBlock = ifBlock || (then !== undefined ? [then] : [])
    this.elseBlock = elseBlock || (
      elseStatement !== undefined
        ? [elseStatement]
        : (elseExpression !== undefined ? [elseExpression] : null)
    )
    this.else = this.elseBlock ? this.elseBlock[0] : undefined
  }

  static fromJson (json) {
    return new ConditionalBlock({}, json)
  }

  get type () {
    return this._class
  }

  set type (_type) {
    this._class = _type
  }
}

export default ConditionalBlock
