import Settings from './Settings.mjs'

class SectionSettings extends Settings {
  /**
   * @param { { timer:number, title:string|Array } } input
   */
  constructor (input) {
    super(input)
    this.timer = input.timer
    this.title = input.title
    this.variables = {}
  }
}

export default SectionSettings
