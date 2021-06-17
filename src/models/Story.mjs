/**
 * @author Mihir Jichkar
 * @description Each story is composed of Sections and Passages
 * @class Story
 */
class Story {
  /**
   * Creates an instance of Story.
   *
   * @param {string} name Name of the Story
   * @param {[Section]} sections Array of sections
   * @param {[Passage]} passages Array of passages
   * @param {[Scene]} scenes Array of scenes
   * @param {StorySettings} settings
   * @param {object} globals
   * @param {object} stats
   *
   * @returns {Story} story instance
   */
  constructor (name, { sections, passages, scenes }, settings, { globals, stats }) {
    this.name = name.trim()
    this.sections = sections || []
    this.passages = passages || []
    this.scenes = scenes || []
    this.settings = settings
    this.variables = {}
    if (globals) {
      Object.keys(globals).forEach(v => {
        this.variables[v] = globals[v]
      })
    }
    this.persistent = this.variables
    this.stats = stats
  }

  findSection (serial) {
    let index = this.sections.findIndex(section => section.serial === serial)

    if (index === -1) {
      console.warn('No section ' + serial + ' found. Reverting to default section serial 1.')
      index = 0
    }
    return this.sections[index]
  }

  findScene (serial) {
    let index = this.scenes.findIndex(scene => scene.serial === serial)

    if (index === -1) {
      console.warn('No scene ' + serial + ' found. Reverting to default scene serial 1.')
      index = 0
    }
    return this.scenes[index]
  }

  findPassage (serial) {
    let index = this.passages.findIndex(passage => passage.serial === serial)

    if (index === -1) {
      console.warn('No passage ' + serial + ' found. Reverting to default passage serial 1.')
      index = 0
    }

    return this.passages[index]
  }

  get type () {
    return 'Story'
  }
}

export default Story
