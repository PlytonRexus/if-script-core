import State from './State.mjs'

class Run {
  /**
   * @param {Story} story
   * @param {State} state
   * @param {string} theme
   */
  constructor (story, state = null, theme = 'default') {
    this.story = story
    this.state = state || new State()
    this.variables = {}
    this.theme = theme
  }

  findSection (serial) {
    return this.story.findSection(serial)
  }

  findScene (serial) {
    return this.story.findScene(serial)
  }
}

export default Run
