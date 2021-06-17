import ParsingException from '../exceptions/ParsingException.mjs'

class Scene {
  /**
   * @param {[number]} sections
   * @param {number} first
   * @param {string} name
   */
  constructor (sections, { first, name }) {
    if (!(sections instanceof Array)) {
      throw new ParsingException('Unexpected argument supplied.' + sections + 'is not an array.')
    }

    this.sections = sections
    this.first = first || sections[0]
    this.last = sections ? sections[sections.length - 1] : null

    this.name = name || 'Untitled'
  }
}

export default Scene
