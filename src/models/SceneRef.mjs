class SceneRef {
  get type () {
    return this._class
  }

  set type (_type) {
    this._class = _type
  }

  constructor (value, kind, json) {
    this._class = 'SceneRef'
    if (json) {
      if (typeof json === 'string') json = JSON.parse(json)
      value = json.value
      kind = json.kind
    } else if (value && typeof value === 'object' && !(value instanceof SceneRef)) {
      kind = value.kind
      value = value.value
    }

    this.kind = kind || SceneRef.inferKind(value)
    this.value = value
  }

  static inferKind (value) {
    return typeof value === 'number' ? 'serial' : 'name'
  }

  static from (value) {
    if (value === null || value === undefined) return null
    if (value instanceof SceneRef) return value
    if (typeof value === 'object') {
      return SceneRef.fromJson(value)
    }
    return new SceneRef(value, SceneRef.inferKind(value))
  }

  static fromJson (json) {
    return new SceneRef(undefined, undefined, json)
  }
}

export default SceneRef
