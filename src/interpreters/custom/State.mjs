import Section from '../../models/Section.mjs'
import Scene from '../../models/Scene.mjs'

class State {
  /**
   * @type {object|{turn: number}}
   */
  variables = {
    turn: 0
  }

  /**
   * @type {Section}
   */
  section = null

  /**
   * @type {Section}
   */
  lastSection = null

  /**
   *
   * @type {object}
   */
  oldValues = {}

  /**
   * @type {number}
   */
  currentTimeout = 0

  /**
   * @type {number}
   */
  turn = 0

  /**
   * @type {Scene}
   */
  scene = null

  constructor (json) {
    if (!!json) {
      if (typeof json === 'string') json = JSON.parse(json)
      Object.assign(this, json)
      this.section = Section.fromJson(json.section)
      if (!!json.lastSection) this.lastSection = Section.fromJson(json.lastSection)
      this.scene = Scene.fromJson(json.scene)
    }

  }

  static fromJson (json) {
    return new State(json)
  }

}

export default State
