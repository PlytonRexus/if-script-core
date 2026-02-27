/**
 * @author Mihir Jichkar
 * @description A Passage is a Section without Choices
 * @class Passage
 * @extends {Section}
 */
class Passage {
  /**
   * Creates an instance of Passage.
   * @param {string} title Title of the Passage
   * @param {string} text HTML formatted text content of the Passage
   * @memberof Passage
   */
  constructor (title, text) {
    this._class = 'Passage'
    Object.assign(this, ...arguments)
  }

  get type () {
    return 'Passage'
  }

  set type (_type) {
    this._class = _type
  }
}

export default Passage
