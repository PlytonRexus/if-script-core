import AllowedCharacters from '../../../constants/custom/allowedCharacters.mjs'
import Keywords from '../../../constants/custom/keywords.mjs'

class Validator {
  constructor () {
    this.isOperatorChar = this.isOperatorChar.bind(this)
    this.isPropNameStart = this.isPropNameStart.bind(this)
    this.isIdentifier = this.isIdentifier.bind(this)
    this.isWhiteSpace = this.isWhiteSpace.bind(this)
    this.isDigit = this.isDigit.bind(this)
    this.isPunctuation = this.isPunctuation.bind(this)
    this.isKeyword = this.isKeyword.bind(this)
    this.isSectionEnd = this.isSectionEnd.bind(this)
    this.isPropName = this.isPropName.bind(this)
  }

  isIdentifierStart (ch) {
    return AllowedCharacters.identifierStart.test(ch)
  }

  /**
   * @param {string} ch
   * @returns {boolean}
   */
  isIdentifier (ch) {
    return this.isIdentifierStart(ch) || AllowedCharacters.identifierBody.test(ch)
  }

  /**
   * @param {string} phrase
   * @returns {boolean}
   */
  isKeyword (phrase) {
    return Object.keys(Keywords).some(k => Keywords[k] === phrase)
  }

  isWhiteSpace (ch) {
    return /[ \t\r]/.test(ch)
  }

  isDigit (ch) {
    return /[0-9]/i.test(ch)
  }

  isOperatorChar (ch) {
    return '+-*/%=&|<>!'.indexOf(ch) >= 0
  }

  isPunctuation (ch) {
    return ';(){}[].,'.indexOf(ch) >= 0
  }

  isSectionEnd (phrase) {
    return phrase.indexOf(Keywords.SECTION_END) === 0
  }

  isPropNameStart (ch) {
    return AllowedCharacters.propStart.test(ch)
  }

  isPropName (ch) {
    return this.isPropNameStart(ch) || AllowedCharacters.propName.test(ch)
  }
}

export default Validator
