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
  constructor () {
  }
}

export default State
