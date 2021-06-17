import ParsingException from '../../../exceptions/ParsingException.mjs'
import Stream from './Stream.mjs'

class InputStream extends Stream {
  /**
   * @param {string} input
   */
  constructor (input) {
    super(input)
    this.pos = 0
    this.line = 1
    this.col = 0
    this.index = 0
  }

  /**
   * @returns {string}
   */
  next () {
    ++this.index
    const ch = this.input.charAt(this.pos++)
    if (ch === '\n') {
      this.line++
      this.col = 0
    } else this.col++
    return ch
  }

  /**
   * @returns {string}
   */
  peek () {
    return this.input.charAt(this.pos)
  }

  /**
   * @returns {boolean}
   */
  eof () {
    return this.pos === this.input.length
    // return this.peek() === ''
  }

  /**
   * @param {...IArguments} message
   */
  except (message) {
    throw new ParsingException(message, this.line, this.col, true)
  }

  /**
   * @param {number} numberOfChars
   */
  preview (numberOfChars) {
    return this.input.substr(this.index, numberOfChars)
  }
}

export default InputStream
