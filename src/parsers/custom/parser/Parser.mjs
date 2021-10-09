import ParserUtils from './ParserUtils.mjs'
import Section from '../../../models/Section.mjs'
import Scene from '../../../models/Scene.mjs'
import Story from '../../../models/Story.mjs'
import PRECEDENCE from '../../../constants/custom/operatorPrecedence.mjs'
import TTS from '../../../constants/custom/tokenTypes.mjs'
import KW from '../../../constants/custom/keywords.mjs'
import StorySettings from '../../../models/StorySettings.mjs'
import SectionSettings from '../../../models/SectionSettings.mjs'
import Punctuations from '../../../constants/custom/punctuations.mjs'
import Operators from '../../../constants/custom/operators.mjs'
import Choice from '../../../models/Choice.mjs'
import Action from '../../../models/Action.mjs'
import Property from '../../../models/Property.mjs'
import Token from '../../../models/Token.mjs'
import ConditionalBlock from '../../../models/ConditionalBlock.mjs'
import TokenStream from '../stream/TokenStream.mjs'
import InputStream from '../stream/InputStream.mjs'

// eslint-disable-next-line no-extend-native
Array.prototype.size = function () {
  return this.length
}

class Parser {
  /**
   * @param {TokenStream} input
   */
  constructor(input) {
    this.input = input
    this.utils = new ParserUtils()
    this.counts = { sectionNumber: 1, sceneNumber: 1, choiceNumber: 1, identifiers: {} }
  }

  static parseText(text) {
    return new Parser(new TokenStream(new InputStream(text)))
  }

  skipPunctuation(ch) {
    if (this.utils.isPunctuation(this.input.peek(), ch)) this.input.next()
    else this.except('Expecting punctuation: "' + ch + '"')
  }

  skipPropertyKeyword(kw) {
    if (this.utils.isPropertyKeyword(this.input.peek(), kw)) this.input.next()
    else this.except('Expecting property: "' + kw + '"')
  }

  skipOtherKeyword(kw) {
    if (this.utils.isOtherKeyword(this.input.peek(), kw)) this.input.next()
    else this.except('Expecting keyword: "' + kw + '"')
  }

  skipSectionStart() {
    if (this.utils.isSectionStart(this.input.peek())) return this.input.next()
    else this.except('Expecting section starter: ')
  }

  skipChoiceStart() {
    if (this.utils.isChoiceStart(this.input.peek())) this.input.next()
    else this.except('Expecting choice starter')
  }

  skipNewLine() {
    while (this.utils.isTokenFor(this.input.peek(), TTS.NEWLINE_CHAR))
      this.input.next()
    return true
  }

  skipOperator(op) {
    if (this.utils.isOperator(this.input.peek(), op)) this.input.next()
    else this.except('Expecting operator: "' + op + '"')
  }

  skipConditionalToken(kw) {
    if (this.utils.isConditionalKeyword(this.input.peek(), kw))
      this.input.next()
    else this.except('Expecting conditional keyword: "' + kw + '"')
  }

  unexpected() {
    this.except('Unexpected token: ' + JSON.stringify(this.input.peek()))
  }

  except(message) {
    return this.input.except(message)
  }

  parseExpression() {
    return this.maybeBinary(this.parseAtom(...arguments), 0)
  }

  maybeBinary(left, givenPrecedence) {
    const isTok = this.utils.isOperator(this.input.preview())
    if (isTok) {
      const tok = this.input.preview()
      const currentPrecedence = PRECEDENCE[tok.symbol]
      if (currentPrecedence > givenPrecedence) {
        this.input.next()
        this.input.next()
        const immediateRight = this.parseAtom()
        const action = new Action(
          tok.symbol === Operators.ASSIGNMENT ? 'assign' : 'binary',
          tok.symbol,
          left,
          this.maybeBinary(immediateRight, currentPrecedence)
        )
        return this.maybeBinary(action, givenPrecedence)
      }
    }
    return left
  }

  parseConditionalBlock() {
    this.skipConditionalToken(KW.IF_BLOCK_START)
    const cond = this.parseExpression()
    if (!this.utils.isPunctuation(this.input.peek(), Punctuations.BRACE_OPEN)) {
      this.skipConditionalToken(KW.THEN)
      const then = this.parseExpression()
      const ret = new ConditionalBlock({ cond, then })
      this.skipNewLine()
      if (
        this.utils.isConditionalKeyword(this.input.peek(), KW.ELSE_BLOCK_START)
      ) {
        this.input.next()
        ret.else = this.parseExpression()
        // TODO: Check if 'if' block ends here
        // if (!this.utils.isPunctuation(this.input.peek(), Punctuations.BRACE_CLOSE)) {
        //   this.input.next()
        //   return ret
        // }
        this.input.next()
      }
      return ret
    } else if (this.utils.isPunctuation(this.input.peek(), Punctuations.BRACE_OPEN)) {
      const then = this.parseExpression()

      const ret = new ConditionalBlock({ cond, then })
      this.skipNewLine()

      if (
        this.utils.isConditionalKeyword(this.input.peek(), KW.ELSE_BLOCK_START)
      ) {
        this.input.next()
        ret.else = this.parseExpression()
        // TODO: Check if 'if' block ends here
        // if (!this.utils.isPunctuation(this.input.peek(), Punctuations.BRACE_CLOSE)) {
        //   this.input.next()
        //   return ret
        // }
        this.input.next()
      }
      return ret
    }
  }

  parseSection() {
    let tok = this.input.peek()
    const settings = new SectionSettings({ timer: 0, title: '' })
    const section = new Section([], [], this.counts.sectionNumber++, settings)
    tok = this.skipSectionStart()

    let choiceCounter = 1
    while (!this.utils.isSectionEnd(tok, tok.symbol)) {
      // parseSettings
      // concatenate strings and variables
      this.skipNewLine()
      tok = this.input.peek()
      if (this.utils.isSectionEnd(tok)) break
      const component = this.parseExpression(false)
      // Check what this component is
      // a setting or a choice or text, variable, or conditional block and then push
      if (component instanceof Choice) {
        component.owner = this.counts.sectionNumber - 1
        component.choiceI = choiceCounter++
        // section.choices.push(component)
        section.text.push(component)
        if (!component.target)
          this.except(
            'No target specified for choice number ' + choiceCounter - 1
          )
      } else if (component instanceof Property) {
        if (component.name === 'identifier' && this.counts.identifiers[component.value])
          this.except('Non-unique section identifier ' + component.value)
        else if (component.name === 'identifier') {
          this.counts.identifiers[component.value] = true
          section.identifier = component.value
        }
        section.settings[component.name] = component.value
        if (component.name === 'title') section.title = component.value
      } else if (
        component instanceof Token ||
        component instanceof ConditionalBlock ||
        component instanceof Action
      ) {
        section.text.push(component)
      }
      if (this.input.peek().type === TTS.SECTION_END) break
      tok = this.input.next()
    }

    return section
  }

  parseChoice() {
    this.skipChoiceStart()
    let tok = this.input.peek()
    const props = {
      variables: [],
      mode: 'basic',
      choiceI: null,
      condition: undefined,
      actions: [],
      input: null
    }
    const ownerTargetText = { owner: undefined, target: undefined, text: [] }

    const choice = new Choice(ownerTargetText, props)
    while (!this.utils.isTokenFor(tok, TTS.CHOICE_END)) {
      this.skipNewLine()
      tok = this.input.peek()
      if (this.utils.isTokenFor(tok, TTS.CHOICE_END)) break
      const component = this.parseExpression(true)
      // Check if component is a action, text, conditional block or a variable
      if (component instanceof Property) {
        if (component.name === 'action') choice.actions.push(component.value)
        else if (component.name === 'input') {
          choice.mode = 'input'
          choice.input = component.value
        } else if (component.name === 'target') choice.target = component.value
        else if (component.name === 'targetType')
          choice.targetType = component.value
        else if (component.name === 'identifier')
          choice.identifier = component.value
      } else if (
        component instanceof Token ||
        component instanceof ConditionalBlock ||
        component instanceof Action
      ) {
        choice.text.push(component)
      }
      if (this.input.peek().type === TTS.CHOICE_END) break
      if (!(component instanceof ConditionalBlock)) tok = this.input.next()
    }

    return choice
  }

  /**
   * @param {string} type
   * @returns {StorySettings|SectionSettings} settings instance
   */
  parseSettings(type) {
    let Entity = StorySettings
    let endKeyword = KW.SETTINGS_END

    const { isTokenFor } = this.utils

    if (type === KW.SECTION_SETTINGS_START) {
      Entity = SectionSettings
      endKeyword = KW.SECTION_SETTINGS_END
    }

    const settings = new Entity({ referrable: false, startAt: 0, fullTimer: 0 })

    this.skipOtherKeyword(KW.SETTINGS_START)
    while (!isTokenFor(this.input.peek(), TTS.OTHER_KW, endKeyword)) {
      this.skipNewLine()
      if (isTokenFor(this.input.peek(), TTS.OTHER_KW, endKeyword)) break
      if (isTokenFor(this.input.peek(), TTS.PROPERTY_KW)) {
        const prop = this.parseProperty()
        settings[prop.name] = prop.value
      } else this.unexpected()

      if (isTokenFor(this.input.peek(), TTS.OTHER_KW, endKeyword)) break
    }

    return settings
  }

  parseProperty() {
    let tok = this.input.peek()
    const propertyType = this.utils.getKeywordName(tok.symbol)
    let name =
      propertyType === this.utils.getKeywordName(KW.PROP_CHOICE_INPUT)
        ? 'input'
        : null
    let resultIsArray = true
    const result = []
    const { isTokenFor } = this.utils

    this.skipPropertyKeyword()
    tok = this.input.peek()

    const assignIfValid = (tok, type, predicate, useTok) => {
      let isValid
      if (typeof type === 'string') isValid = isTokenFor(tok, type)
      else if (type instanceof Array)
        isValid = type.some((v) => isTokenFor(tok, v))
      if (isValid) {
        try {
          if (!predicate || predicate(tok)) {
            result.push(useTok ? tok : tok.symbol)
          }
        } catch (err) {
          this.except(err.message)
        }
      } else this.unexpected()
    }

    const limitToOne = () => {
      if (result.size() > 0) this.unexpected()
      resultIsArray = false
    }

    const limitToN = (n) => {
      if (result.size() > n - 1) this.unexpected()
      resultIsArray = true
    }

    const parsers = {
      propIfTitle: () => {
        limitToOne()
        name = 'name'
        assignIfValid(tok, TTS.STRING)
      },
      propChoiceAction: () => {
        limitToOne()
        name = 'action'
        result.push(this.parseExpression())
      },
      propChoiceInput: () => {
        name = 'input'
        assignIfValid(tok, TTS.VARIABLE, null, true)
      },
      propChoiceRead: () => {
        // Any use of this?
      },
      propChoiceTargetType: () => {
        limitToOne()
        name = 'targetType'
        assignIfValid(tok, TTS.STRING)
      },
      propChoiceTarget: () => {
        limitToOne()
        name = 'target'
        assignIfValid(tok, [TTS.NUMBER, TTS.STRING])
      },
      propFullTimer: () => {
        limitToN(2)
        name = 'fullTimer'
        assignIfValid(tok, TTS.NUMBER)
      },
      propReferrable: () => {
        limitToOne()
        name = 'referrable'
        if (isTokenFor(tok, TTS.BOOLEAN)) {
          result.push(this.utils.isTrue(tok))
        } else this.unexpected()
      },
      propSceneFirst: () => {
        limitToOne()
        name = 'first'
        assignIfValid(tok, [TTS.NUMBER, TTS.STRING])
      },
      propSceneMusic: () => {
        limitToOne()
        name = 'music'
        assignIfValid(tok, TTS.STRING, (t) => new URL(t.symbol))
      },
      propSceneName: () => {
        limitToOne()
        name = 'name'
        assignIfValid(tok, TTS.STRING)
      },
      propSceneSections: () => {
        name = 'sections'
        assignIfValid(tok, [TTS.NUMBER, TTS.STRING])
      },
      propSectionTimer: () => {
        limitToOne()
        name = 'timer'
        assignIfValid(tok, TTS.NUMBER)
      },
      propSectionTitle: () => {
        limitToOne()
        name = 'title'
        assignIfValid(tok, TTS.STRING)
      },
      propIdentifier: () => {
        limitToOne()
        name = 'identifier'
        assignIfValid(tok, TTS.STRING)
      },
      propStartAt: () => {
        limitToOne()
        name = 'startAt'
        assignIfValid(tok, TTS.NUMBER)
      },
      propRequire: () => {
        limitToOne()
        name = 'require'
        assignIfValid(tok, TTS.STRING)
      }
    }

    while (!isTokenFor(tok, TTS.NEWLINE_CHAR)) {
      parsers[this.utils.camelize(propertyType.toLowerCase())]()
      tok = this.input.next()
    }

    // this.input.next()

    if (name === 'fullTimer') {
      return {
        name,
        value: {
          timer: result[0],
          target: result[1]
        }
      }
    }
    return new Property({
      name,
      value: result.size() > 0 ? (resultIsArray ? result : result[0]) : null
    })
  }

  parseScene() {
    this.skipOtherKeyword(KW.SCENE_START)

    const { isTokenFor } = this.utils
    const scene = new Scene([], { first: 0, name: '' })

    while (!isTokenFor(this.input.peek(), TTS.OTHER_KW, KW.SCENE_END)) {
      this.skipNewLine()
      if (isTokenFor(this.input.peek(), TTS.OTHER_KW, KW.SCENE_END)) break
      if (isTokenFor(this.input.peek(), TTS.PROPERTY_KW)) {
        const prop = this.parseProperty()
        scene[prop.name] = prop.value
      } else this.unexpected()
      if (isTokenFor(this.input.peek(), TTS.OTHER_KW, KW.SCENE_END)) break
    }
    return scene
  }

  parseAtom(insideChoice) {
    if (this.utils.isTokenFor(this.input.peek(), TTS.NEWLINE_CHAR))
      return this.skipNewLine()
    if (
      this.utils.isPunctuation(this.input.peek(), Punctuations.PARENTHESIS_OPEN)
    ) {
      this.input.next()
      const expr = this.parseExpression()
      if (
        this.utils.isPunctuation(
          this.input.preview(),
          Punctuations.PARENTHESIS_CLOSE
        )
      )
        this.input.next()
      this.skipPunctuation(Punctuations.PARENTHESIS_CLOSE)
      return expr
    }

    if (this.utils.isPunctuation(this.input.peek(), Punctuations.BRACE_OPEN)) {
      this.input.next()
      this.skipNewLine()
      const exp = this.parseExpression()
      this.skipNewLine()
      this.input.next()
      this.skipNewLine()
      this.skipPunctuation(Punctuations.BRACE_CLOSE)
      return exp
    }

    // Keep
    if (this.utils.isConditionalKeyword(this.input.peek(), KW.IF_BLOCK_START))
      return this.parseConditionalBlock()

    // Keep
    if (this.utils.isBoolean(this.input.peek())) {
      const tok = this.input.peek()
      tok.symbol = this.utils.isTrue(tok)
      return tok
    }

    // Keep for sections
    if (!insideChoice) {
      if (this.utils.isTokenFor(this.input.peek(), TTS.CHOICE_START)) {
        return this.parseChoice()
      }
    }

    if (this.utils.isPropertyKeyword(this.input.peek())) {
      return this.parseProperty()
    }

    const tok = this.input.peek()
    if (
      tok.type === TTS.VARIABLE ||
      tok.type === TTS.NUMBER ||
      tok.type === TTS.STRING
    ) {
      return tok
    }
    this.unexpected()
  }

  /**
   * @param {TokenStream} ts
   * @returns {Story}
   */
  parseStory(ts) {
    if (!this.input) {
      this.input = ts
      this.counts = { sectionNumber: 0, sceneNumber: 0, choiceNumber: 0 }
    }
    const components = {
      sections: [],
      scenes: [],
      passages: []
    }
    const story = new Story(
      '',
      components,
      new StorySettings({
        fullTimer: undefined,
        referrable: undefined,
        startAt: undefined,
        name: undefined
      }),
      { globals: {}, stats: {} }
    )
    this.story = story

    let tok = this.input.next() // .peek()
    while (!this.input.eof()) {
      this.skipNewLine()
      tok = this.input.peek()
      if (this.input.eof()) break

      const { isTokenFor } = this.utils
      if (isTokenFor(tok, TTS.SECTION_START)) {
        story.sections.push(this.parseSection())
      }
      if (isTokenFor(tok, TTS.OTHER_KW, KW.SCENE_START)) {
        story.scenes.push(this.parseScene())
      }
      if (isTokenFor(tok, TTS.OTHER_KW, KW.SETTINGS_START)) {
        story.settings = this.parseSettings(KW.SETTINGS_START)
      }
      tok = this.input.next()
    }

    if (story.settings.name) story.name = story.settings.name
    return story
  }
}

export default Parser
