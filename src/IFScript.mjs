import versions from './constants/versions.mjs'
import { IF as terp } from './interpreters/regex-nearley/if_r-terp.mjs'
import regexParser from './parsers/regex/parser-regex.mjs'
import earlyParser from './parsers/nearley/if-parser.mjs'
import Parser from './parsers/custom/parser/Parser.mjs'
import Interpreter from './interpreters/custom/Interpreter.mjs'

class IFScript {
  /**
   * @param {string|{parser, interpreter}} opts
   */
  constructor (opts) {
    if (typeof opts === 'string') {
      this.version = opts || versions.EARLY
      this.start()
    } else {
      this.parser = opts.parser
      this.interpreter = opts.interpreter
    }
  }

  start () {
    if (this.version === versions.LEGACY) {
      this.generateDeliveryObject(regexParser, terp)
    } else if (this.version === versions.EARLY) {
      this.generateDeliveryObject(earlyParser, terp)
    } else if (this.version === versions.STREAM) {
      this.generateDeliveryObject(Parser, Interpreter)
    }
  }

  generateDeliveryObject (parser, terp) {
    this.parser = parser
    this.interpreter = terp
    this.methods = terp.methods
    this.story = terp.story
    this.grammar = terp.grammar
    this.state = terp.state
    this.DEBUG = terp.DEBUG
    this.dom = terp.dom
  }

  static versions() {
    return versions
  }

}

export default IFScript
