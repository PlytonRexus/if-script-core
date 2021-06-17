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
    Object.assign(this, ...arguments)
  }

  get type () {
    return 'Passage'
  }
}

export default Passage
