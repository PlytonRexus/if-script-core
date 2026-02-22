class SectionRef {
  _class = 'SectionRef'

  get type () {
    return this._class
  }

  set type (_type) {
    this._class = _type
  }

  constructor (value, kind, json) {
    if (!!json) {
      if (typeof json === 'string') json = JSON.parse(json)
      value = json.value
      kind = json.kind
    } else if (value && typeof value === 'object' && !(value instanceof SectionRef)) {
      kind = value.kind
      value = value.value
    }

    this.kind = kind || SectionRef.inferKind(value)
    this.value = value
  }

  static inferKind (value) {
    return typeof value === 'number' ? 'serial' : 'title'
  }

  static from (value) {
    if (value === null || value === undefined) return null
    if (value instanceof SectionRef) return value
    if (typeof value === 'object') {
      return SectionRef.fromJson(value)
    }
    return new SectionRef(value, SectionRef.inferKind(value))
  }

  static fromJson (json) {
    return new SectionRef(undefined, undefined, json)
  }
}

export default SectionRef
