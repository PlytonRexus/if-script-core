class State {
  constructor () {
    /**
     * @type {object|{turn: number}}
     */
    this.variables = {
      turn: 0
    }
    /**
     * @type {Section}
     */
    this.section = null
    /**
     * @type {Section}
     */
    this.lastSection = null
    /**
     * @type {object}
     */
    this.oldValues = {}
    /**
     * Snapshot of consumed one-time choices for undo.
     * Key format: "<sectionSerial>:<choiceIndex>"
     * @type {object}
     */
    this.onceConsumed = {}
    /**
     * Previous onceConsumed snapshot for undo.
     * @type {object}
     */
    this.oldOnceConsumed = {}
    /**
     * @type {number}
     */
    this.currentTimeout = 0
    /**
     * @type {number}
     */
    this.turn = 0
    /**
     * @type {Scene}
     */
    this.scene = null
  }
}

export default State
