import BaseException from './BaseException.mjs'

class InterpreterException extends BaseException {
  constructor (message) {
    super()
    this.message = message
    this.type = 'Interpreter exception'
  }

  log () {
    console.log(this.type + ': ' + this.message)
  }
}

export default InterpreterException
