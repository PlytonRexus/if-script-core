/**
 * @author Mihir Jichkar
 * @description Represents an import statement in the story that loads external modules
 * @class ImportStatement
 */
class ImportStatement {
  /**
   * Creates an instance of ImportStatement.
   * @param {Object} params - Import parameters
   * @param {string} params.path - Original import path as written in source
   * @param {string} params.resolvedPath - Absolute resolved path to the module
   * @param {number} params.line - Line number where import appears
   * @param {number} params.col - Column number where import appears
   * @param {string} params.id - Unique identifier for this import
   * @memberof ImportStatement
   */
  constructor (params, json) {
    this._class = 'ImportStatement'
    if (json) {
      if (typeof json === 'string') json = JSON.parse(json)
      const { path, resolvedPath, line, col, id, module } = json
      this.path = path
      this.resolvedPath = resolvedPath
      this.module = module || null
      this.line = line
      this.col = col
      this.id = id
    } else {
      const { path, resolvedPath, line, col, id } = params
      this.path = path
      this.resolvedPath = resolvedPath || null
      this.module = null
      this.line = line
      this.col = col
      this.id = id
    }
  }

  static fromJson (json) {
    return new ImportStatement({}, json)
  }

  get type () {
    return this._class
  }

  set type (_type) {
    this._class = _type
  }
}

export default ImportStatement
