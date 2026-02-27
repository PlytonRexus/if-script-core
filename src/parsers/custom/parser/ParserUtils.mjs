import TTS from '../../../constants/custom/tokenTypes.mjs'
import Keywords from '../../../constants/custom/keywords.mjs'

class ParserUtils {
  isPunctuation (tok, ch) {
    return tok && tok.type === TTS.PUNCTUATION && (!ch || tok.symbol === ch) && tok
  }

  isString (tok) {
    return tok && tok.type === TTS.STRING
  }

  isBoolean (tok) {
    return tok && tok.type === TTS.BOOLEAN
  }

  isTrue (tok) {
    return this.isBoolean(tok) && tok.symbol === Keywords.TRUE
  }

  isFalse (tok) {
    return this.isBoolean(tok) && tok.symbol === Keywords.FALSE
  }

  isPropertyKeyword (tok, kw) {
    return tok && tok.type === TTS.PROPERTY_KW && (!kw || tok.symbol === kw) && tok
  }

  isOtherKeyword (tok, kw) {
    return tok && tok.type === TTS.OTHER_KW && (!kw || tok.symbol === kw) && tok
  }

  isSectionStart (tok) {
    return tok && tok.type === TTS.SECTION_START
  }

  isSectionEnd (tok) {
    return tok && tok.type === TTS.SECTION_END
  }

  isChoiceStart (tok) {
    return tok && tok.type === TTS.CHOICE_START
  }

  isChoiceEnd (tok, kw) {
    return tok && tok.type === TTS.CHOICE_END && (!kw || tok.symbol === kw) && tok
  }

  isConditionalKeyword (tok, kw) {
    return tok && tok.type === TTS.CONDITIONAL_KW && (!kw || tok.symbol === kw) && tok
  }

  isOperator (tok) {
    return tok && tok.type === TTS.OPERATOR
  }

  isTokenFor (tok, type, kw) {
    if (!tok) return false
    if (type) {
      return kw ? (tok.type === type && tok.symbol === kw) : (tok.type === type)
    } else {
      return kw ? tok.symbol === kw : null
    }
  }

  isKeyword (tok, kw) {
    return tok.type.includes('_KW') && (kw ? ((!kw || tok.symbol === kw) && tok) : true)
  }

  camelize (s) {
    return s.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase()
      .replace('-', '')
      .replace('_', ''))
  }

  getKeywordName (symbol) {
    return Object.keys(Keywords).find(v => Keywords[v].toLowerCase() === symbol.toLowerCase())
  }
}

export default ParserUtils
