import versions from './constants/versions.mjs'
import { IF as terp } from './interpreters/regex-nearley/if_r-terp.mjs'

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

  async start () {
    if (this.version === versions.LEGACY) {
      this.generateDeliveryObject(await import('./parsers/regex/parser-regex.mjs'), terp)
    } else if (this.version === versions.EARLY) {
      this.generateDeliveryObject(await import('./parsers/nearley/if-parser.mjs'), terp)
    } else if (this.version === versions.STREAM) {
      const Parser = await import('./parsers/custom/parser/Parser.mjs')
      const Interpreter = await import('./interpreters/custom/Interpreter.mjs')
      this.parser = { parseText: Parser.parseText }
      this.interpreter = new Interpreter()
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
}

export default IFScript
