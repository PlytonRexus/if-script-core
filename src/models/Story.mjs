import Section from './Section.mjs'
import Scene from './Scene.mjs'
import StorySettings from './StorySettings.mjs'
/**
 * @author Mihir Jichkar
 * @description Each story is composed of Sections and Passages
 * @class Story
 */
class Story {

  _class = 'Story'

  get type() {
    return this._class
  }

  set type(_type) {
    this._class = _type
  }

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
  constructor (name, { sections, passages, scenes }, settings, { globals, stats }, json) {
    if (!!json) {
      if (typeof json === 'string')
      json = JSON.parse(json)
      Object.assign(this, json)
      this.sections = this.sections.map(s => Section.fromJson(s))
      this.scenes = this.scenes.map(s => Scene.fromJson(s))
      this.settings = StorySettings.fromJson(this.settings)

    } else {
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
  }

  static fromJson(json) {
    return new Story({}, {}, {}, {}, json)
  }

  findSection (serial) {
    let index
    if (typeof serial === 'number') {
      index = this.sections.findIndex(section => section.serial === serial)
    } else if (typeof serial === 'string') {
      index = this.sections.findIndex(s =>
        s.identifier?.toLowerCase() === serial?.toLowerCase())
    }

    if (index === -1) {
      console.warn('No section ' + serial + ' found. Reverting to default section serial 1.')
      index = 0
    }
    return this.sections[index]
  }

  findScene (serial) {
    let index
    if (typeof serial === 'number') {
      index = this.scenes.findIndex(scene => scene.serial === serial)
    } else if (typeof serial === 'string') {
      index = this.scenes.findIndex(s =>
        s.identifier?.toLowerCase() === serial?.toLowerCase())
    }
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

}

export default Story
