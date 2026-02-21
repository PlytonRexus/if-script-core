/**
 * @author Mihir Jichkar
 * @description Represents a cached module with its parsed content and metadata
 * @class ModuleRecord
 */
class ModuleRecord {
  _class = 'ModuleRecord'

  /**
   * Creates an instance of ModuleRecord.
   * @param {Object} params - Module parameters
   * @param {string} params.path - Absolute path to the module file
   * @param {string} params.content - Raw file content
   * @param {Object} params.parsed - Parsed module content (sections, scenes, functions)
   * @param {Array<string>} params.dependencies - Array of import paths this module depends on
   * @param {number} params.timestamp - When the module was loaded
   * @memberof ModuleRecord
   */
  constructor (params, json) {
    if (json) {
      if (typeof json === 'string') json = JSON.parse(json)
      const { path, content, parsed, dependencies, timestamp, status, error } = json
      this.path = path
      this.content = content
      this.parsed = parsed
      this.dependencies = dependencies || []
      this.timestamp = timestamp
      this.status = status || 'loaded'
      this.error = error || null
    } else {
      const { path, content, parsed, dependencies, timestamp } = params
      this.path = path
      this.content = content
      this.parsed = parsed
      this.dependencies = dependencies || []
      this.timestamp = timestamp || Date.now()
      this.status = 'loaded'
      this.error = null
    }
  }

  static fromJson (json) {
    return new ModuleRecord({}, json)
  }

  get type () {
    return this._class
  }

  set type (_type) {
    this._class = _type
  }
}

export default ModuleRecord
