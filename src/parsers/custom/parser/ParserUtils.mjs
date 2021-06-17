import TTS from '../../../constants/custom/tokenTypes.mjs'
import Keywords from '../../../constants/custom/keywords.mjs'

class ParserUtils {
  isPunctuation = (tok, ch) => tok && tok.type === TTS.PUNCTUATION && (!ch || tok.symbol === ch) && tok

  isString = (tok) => tok && tok.type === TTS.STRING

  isBoolean = tok => tok && tok.type === TTS.BOOLEAN

  isTrue = tok => this.isBoolean(tok) && tok.symbol === Keywords.TRUE

  isFalse = tok => this.isBoolean(tok) && tok.symbol === Keywords.FALSE

  isPropertyKeyword = (tok, kw) => tok && tok.type === TTS.PROPERTY_KW && (!kw || tok.symbol === kw) && tok

  isOtherKeyword = (tok, kw) => tok && tok.type === TTS.OTHER_KW && (!kw || tok.symbol === kw) && tok

  isSectionStart = (tok) => tok && tok.type === TTS.SECTION_START

  isSectionEnd = (tok) => tok && tok.type === TTS.SECTION_END

  isChoiceStart = (tok) => tok && tok.type === TTS.CHOICE_START

  isChoiceEnd = (tok, kw) => tok && tok.type === TTS.CHOICE_END && (!kw || tok.symbol === kw) && tok

  isConditionalKeyword = (tok, kw) => tok && tok.type === TTS.CONDITIONAL_KW && (!kw || tok.symbol === kw) && tok

  isOperator = (tok) => tok && tok.type === TTS.OPERATOR

  isTokenFor = (tok, type, kw) => {
    if (!!type)
      return !!kw ? (tok.type === type && tok.symbol === kw) : (tok.type === type)
    else
      return !!kw ? tok.symbol === kw : null
  }

  isKeyword = (tok, kw) => tok.type.includes('_KW') && (!!kw ? ((!kw || tok.symbol === kw) && tok) : true)

  camelize = (s) =>  s.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase()
      .replace('-', '')
      .replace('_', ''))

  getKeywordName = (symbol) => Object.keys(Keywords).find(v => Keywords[v].toLowerCase() === symbol.toLowerCase())
}

export default ParserUtils
