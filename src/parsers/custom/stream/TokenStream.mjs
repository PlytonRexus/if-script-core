import Stream from './Stream.mjs'
import Token from '../../../models/Token.mjs'
import Validator from './Validator.mjs'
import TokenTypes from '../../../constants/custom/tokenTypes.mjs'
import { grammar } from '../../../constants/regex/regexGrammar.mjs'
import Keywords from '../../../constants/custom/keywords.mjs'

class TokenStream extends Stream {
  /**
   * @param {InputStream} input
   */
  constructor (input) {
    super(input)
    this.removeComments()
    this.current = null
    this.validator = new Validator()
    this.id = 0
    this.lastToken = null
    this.nextToken = null
  }

  /**
   * @returns {Token}
   */
  peek () {
    return this.current // || (this.current = this.readNext())
  }

  /**
   * @returns {Token}
   */
  next () {
    // const tok = this.current
    // this.current = null
    // return tok || (this.readNext())
    this.current = this.nextToken || this.readNext()
    if (!this.eof()) this.nextToken = this.readNext()
    return this.current
  }

  /**
   * @returns {boolean|*}
   */
  eof () {
    return this.input.eof()
  }

  except (message) {
    return this.input.except(message)
  }

  /**
   * @returns {Token}
   */
  preview () {
    return this.nextToken
  }

  getTokenInstance (type, symbol) {
    this.lastToken = new Token({
      type,
      symbol,
      id: this.id++,
      line: this.input.line,
      col: this.input.col
    })
    return this.lastToken
  }

  removeComments () {
    const { comment } = grammar
    this.input.input = this.input.input.replace(comment, '').replace(/>>/g, '').replace(/<</g, '')
  }

  readString () {
    return this.getTokenInstance(TokenTypes.STRING, this.readEscaped('"'))
  }

  readNumber () {
    let hasDot = false
    const symbol = this.readWhile(function (ch) {
      if (ch === '.') {
        if (hasDot) return false
        hasDot = true
        return true
      }
      return this.validator.isDigit(ch)
    }.bind(this))

    return this.getTokenInstance(TokenTypes.NUMBER, Number(symbol))
  }

  /**
   *
   * @param {Function} fn
   * @returns {string}
   */
  readWhile (fn) {
    let s = ''
    while (!this.eof() && fn(this.input.peek())) { s += this.input.next() }
    return s
  }

  readEscaped (end) {
    let escaped = false
    let str = ''
    this.input.next()
    while (!this.input.eof()) {
      const ch = this.input.next()
      if (escaped) {
        str += ch
        escaped = false
      } else if (ch === '\\') {
        escaped = true
      } else if (typeof end === 'string' ? ch === end : end.call(this, ch)) {
        break
      } else {
        str += ch
      }
    }
    return str
  }

  getKeywordType (s) {
    const propName = Object.keys(Keywords).find(k => Keywords[k] === s)
    switch (Keywords[propName]) {
      case Keywords.SECTION_START:
        return TokenTypes.SECTION_START
      case Keywords.SECTION_END:
        return TokenTypes.SECTION_END
      case Keywords.CHOICE_START:
        return TokenTypes.CHOICE_START
      case Keywords.CHOICE_END:
        return TokenTypes.CHOICE_END
      case Keywords.TRUE:
        return TokenTypes.BOOLEAN
      case Keywords.FALSE:
        return TokenTypes.BOOLEAN
    }

    if (propName.includes('PROP')) { return TokenTypes.PROPERTY_KW }
    if (propName.includes('IF') || propName.includes('ELSE') || propName === 'THEN') { return TokenTypes.CONDITIONAL_KW }
    if (propName) { return TokenTypes.OTHER_KW }

    this.except('Undefined keyword')
  }

  readIdentifier () {
    const symbol = this.readWhile(this.validator.isIdentifier)
    return this.getTokenInstance(
      this.validator.isKeyword(symbol) ? this.getKeywordType(symbol) : TokenTypes.VARIABLE,
      symbol)
  }

  readProperty () {
    return this.getTokenInstance(TokenTypes.PROPERTY_KW, this.readWhile(this.validator.isPropName))
  }

  readNext () {
    this.readWhile(this.validator.isWhiteSpace)
    if (this.input.eof()) return null
    const ch = this.input.peek()
    if (ch === '"') return this.readString()
    if (ch === '\n') return this.getTokenInstance(TokenTypes.NEWLINE_CHAR, this.input.next())
    if (this.validator.isDigit(ch)) return this.readNumber()
    if (this.validator.isIdentifierStart(ch)) return this.readIdentifier()
    if (this.validator.isPropNameStart(ch)) return this.readProperty()
    if (this.validator.isPunctuation(ch)) return this.getTokenInstance(TokenTypes.PUNCTUATION, this.input.next())
    if (this.validator.isOperatorChar(ch)) {
      return this.getTokenInstance(TokenTypes.OPERATOR, this.readWhile(this.validator.isOperatorChar))
    }
    this.except('Character ' + ch + 'is unrecognised')
  }
}

export default TokenStream
