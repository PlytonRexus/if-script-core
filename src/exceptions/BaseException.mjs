class BaseException extends Error {
  constructor () {
    super()
    this.type = 'IFError'
  }
}

export default BaseException
