class MemberAccess {

  _class = 'MemberAccess'

  constructor (input, json) {
    if (!!json) {
      if (typeof json === 'string')
      json = JSON.parse(json)
      input = json
    }

    const { object, member, args } = input

    this.object = object // expression that evaluates to an object/array
    this.member = member // property or method name (string)
    this.args = args || null // array of arguments for method calls, null for properties
  }

  static fromJson (json) {
    return new MemberAccess({}, json)
  }

  get type () {
    return this._class
  }

  set type (_type) {
    this._class = _type
  }

}

export default MemberAccess
