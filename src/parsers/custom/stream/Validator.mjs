import AllowedCharacters from '../../../constants/custom/allowedCharacters.mjs'
import Keywords from '../../../constants/custom/keywords.mjs'

class Validator {
  constructor () {
    this.isOperatorChar.bind(this)
    this.isPropNameStart.bind(this)
    this.isIdentifier.bind(this)
    this.isWhiteSpace.bind(this)
    this.isDigit.bind(this)
    this.isPunctuation.bind(this)
    this.isKeyword.bind(this)
    this.isSectionEnd.bind(this)
    this.isPropName.bind(this)
  }

  isIdentifierStart = ch => AllowedCharacters.identifierStart.test(ch)

  /**
   * @param {string} ch
   * @returns {boolean}
   */
  isIdentifier = ch => this.isIdentifierStart(ch) || AllowedCharacters.identifierBody.test(ch)

  /**
   * @param {string} phrase
   * @returns {boolean}
   */
  isKeyword = phrase => Object.keys(Keywords).some(k => Keywords[k] === phrase)

  isWhiteSpace = ch => /[ \t\r]/.test(ch)

  isDigit = ch => /[0-9]/i.test(ch)

  isOperatorChar = ch => '+-*/%=&|<>!'.indexOf(ch) >= 0

  isPunctuation = ch => ';(){}[]'.indexOf(ch) >= 0

  isSectionEnd = phrase => phrase.indexOf(Keywords.SECTION_END) === 0

  isPropNameStart = ch => AllowedCharacters.propStart.test(ch)

  isPropName = ch => this.isPropNameStart(ch) || AllowedCharacters.propName.test(ch)
}

export default Validator
