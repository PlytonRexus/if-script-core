import BaseException from './BaseException.mjs'

class InterpreterException extends BaseException {
  constructor (message, hint = null) {
    super()
    this.rawMessage = message
    this.hint = hint
    this.message = hint ? `${message}\nHint: ${hint}` : message
    this.type = 'Interpreter exception'
  }

  log () {
    console.log(this.type + ': ' + this.message)
  }
}

export default InterpreterException
