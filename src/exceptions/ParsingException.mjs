import BaseException from './BaseException.mjs'

class ParsingException extends BaseException {
  constructor (message = '', line, col, fileOrLog = null, hintOrLog = null, logToConsole = false) {
    super()
    let file = null
    let hint = null
    let shouldLog = logToConsole

    if (typeof fileOrLog === 'boolean') shouldLog = fileOrLog
    else file = fileOrLog

    if (typeof hintOrLog === 'boolean') shouldLog = hintOrLog
    else hint = hintOrLog

    this.rawMessage = message
    this.line = line
    this.col = col
    this.file = file
    this.hint = hint
    this.type = 'ParseError'
    this.message = this.formatMessage()
    if (shouldLog) this.log()
  }

  formatMessage () {
    const loc = (typeof this.line === 'number' && typeof this.col === 'number')
      ? `${this.line}:${this.col}`
      : null
    const filePart = this.file ? `File: ${this.file}` : null
    const locPart = loc ? `Line:Col ${loc}` : null
    const hintPart = this.hint ? `Hint: ${this.hint}` : null
    return [this.rawMessage, filePart, locPart, hintPart].filter(Boolean).join('\n')
  }

  log () {
    console.error(this.message)
  }
}

export default ParsingException
