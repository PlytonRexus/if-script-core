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
   * Snapshot of consumed one-time choices for undo.
   * Key format: "<sectionSerial>:<choiceIndex>"
   * @type {object}
   */
  onceConsumed = {}

  /**
   * Previous onceConsumed snapshot for undo.
   * @type {object}
   */
  oldOnceConsumed = {}

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
