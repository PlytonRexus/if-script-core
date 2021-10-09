import State from './State.mjs'
import Story from '../../models/Story.mjs'

class Run {
  /**
   * @param {Story} story
   * @param {State} state
   * @param {string} theme
   */
  constructor (story, state = null, theme = 'default', json) {
    if (!!json) {
      if (typeof json === 'string')
        json = JSON.parse(json)
      this.story = Story.fromJson(json.story)
      this.state = !!json.state ? State.fromJson(json.state) : null
      this.variables = json.variables
      this.theme = json.theme
    } else {
      this.story = story
      this.state = state || new State()
      this.variables = {}
      this.theme = theme
    }
  }

  findSection (serial) {
    return this.story.findSection(serial)
  }

  findScene (serial) {
    return this.story.findScene(serial)
  }

  static fromJson(json) {
    return new Run(null, null, null, json)
  }

}

export default Run
