/**
 * @deprecated This file is deprecated and will be removed in v0.4.0.
 * Use the new ModuleLoader system instead.
 * See: src/parsers/custom/loader/ModuleLoader.mjs
 *
 * This legacy assembler performed text substitution for imports before parsing,
 * which only worked in Node.js and bypassed the parser/AST. The new system
 * integrates imports as first-class parser features with proper error handling,
 * circular dependency detection, caching, and browser support.
 */

if (typeof module === 'object' && module.exports) {
  const path = require('path')
  const File = require('./File')

  Array.prototype.empty = function () {
    return this.length == 0
  }

  Array.prototype.back = function () {
    return this[this.length - 1]
  }

  Array.prototype.front = function () {
    return this[0]
  }

  class Assembler {
    constructor (completePath) {
      this.completePath = completePath
      this.mainFile = new File(completePath, '')
    }

    async assemble () {
      const assembled = await (this.mainFile.assemble(this.mainFile.path))
      // console.log(assembled)
      return assembled
    }
  }

  module.exports = { Assembler }
} else {
  module.exports = { Assembler: class Assembler {} }
}
