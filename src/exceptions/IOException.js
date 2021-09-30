// import BaseException from './BaseException.mjs'

class IOException extends Error {
  constructor (message = '', line, col, logToConsole) {
    super()
    this.message = message
    this.line = this.message
    this.col = col
    if (logToConsole) this.log()
  }

  log () {
    console.log('Error ' + this.line && this.col ? 'at: ' + this.line + ':' + this.col : '')
  }
}

module.exports = IOException
