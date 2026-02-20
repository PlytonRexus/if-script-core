import Settings from './Settings.mjs'

class StorySettings extends Settings {

  _class = 'StorySettings'

  get type() {
    return this._class
  }

  set type(_type) {
    this._class = _type
  }

  /**
   * @param {{ referrable:boolean, startAt:number, fullTimer:{timer:number, target:number}, name:string }} input
   */
  constructor (input, json) {
    if (!!json) {
      if (typeof json === 'string')
      json = JSON.parse(json)
      input = json
    }

    super(input)
    const { referrable, name, maxIterations, maxCallDepth } = this.input
    this.startAt = this.input.startAt || 0
    this.fullTimer = this.input.fullTimer || null
    this.referrable = referrable || false
    this.name = name
    this.maxIterations = maxIterations || 10000
    this.maxCallDepth = maxCallDepth || 1000
  }

  static fromJson(json) {
    return new StorySettings({}, json)
  }
}

export default StorySettings
