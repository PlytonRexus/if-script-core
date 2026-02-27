import State from './State.mjs'

class Run {
  /**
   * @param {Story} story
   * @param {State} state
   * @param {string} theme
   * @param {{ saveKey?: string, resumePrompt?: boolean }} options
   */
  constructor (story, state = null, theme = null, options = null) {
    this.story = story
    this.state = state || new State()
    this.variables = {}
    this.theme = theme
    this.options = options || {}
  }

  findSection (serial) {
    return this.story.findSection(serial)
  }

  findScene (serial) {
    return this.story.findScene(serial)
  }
}

export default Run
