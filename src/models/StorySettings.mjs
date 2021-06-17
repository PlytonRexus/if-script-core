import Settings from './Settings.mjs'

class StorySettings extends Settings {
  /**
   * @param {{ referrable:boolean, startAt:number, fullTimer:{timer:number, target:number}, name:string }} input
   */
  constructor (input) {
    super(input)
    const { referrable, name } = this.input
    this.startAt = this.input.startAt || 0
    this.fullTimer = this.input.fullTimer || null
    this.referrable = referrable || false
    this.name = name
  }
}

export default StorySettings
