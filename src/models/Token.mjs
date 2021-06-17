class Token {
  /**
   * @param {string} type
   * @param {string|number} symbol
   * @param {number} id
   * @param {number} line
   * @param {number} col
   */
  constructor ({ type, symbol, id, line, col }) {
    this.type = type
    this.symbol = symbol
    this.id = id
    this.line = line
    this.col = col
  }
}

export default Token
