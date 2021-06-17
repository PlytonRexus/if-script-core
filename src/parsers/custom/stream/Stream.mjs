import ParsingException from '../../../exceptions/ParsingException.mjs'

class Stream {
  constructor (input) {
    this.input = input
    this.peek.bind(this)
    this.next.bind(this)
    this.eof.bind(this)
    this.except.bind(this)
  }

  next () {}

  peek () {}

  eof () {}

  except (message) {
    throw new ParsingException(message)
  }

  [Symbol.iterator] () {
    return {
      next: () => {
        const value = this.next()
        return ({ value, done: !value })
      }
    }
  }
}

export default Stream
