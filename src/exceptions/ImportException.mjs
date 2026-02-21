import BaseException from './BaseException.mjs'

/**
 * Exception thrown during module import operations
 * @class ImportException
 * @extends BaseException
 */
class ImportException extends BaseException {
  /**
   * Creates an instance of ImportException.
   * @param {string} message - Error message
   * @param {number} line - Line number where import statement appears
   * @param {number} col - Column number where import statement appears
   * @param {string} importPath - The import path that failed
   * @param {Error} cause - Optional underlying error that caused this exception
   * @param {boolean} logToConsole - Whether to log immediately
   * @memberof ImportException
   */
  constructor (message = '', line, col, importPath, cause = null, logToConsole = false) {
    super()
    this.message = message
    this.line = line
    this.col = col
    this.importPath = importPath
    this.cause = cause
    this.type = 'ImportError'
    if (logToConsole) this.log()
  }

  log () {
    console.error(`Import Error at ${this.line}:${this.col}`)
    console.error(`  Import: "${this.importPath}"`)
    console.error(`  ${this.message}`)
    if (this.cause) {
      console.error(`  Caused by: ${this.cause.message}`)
    }
  }
}

export default ImportException
