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
import Loop from '../../../models/Loop.mjs'
import ArrayLiteral from '../../../models/ArrayLiteral.mjs'
import ArrayAccess from '../../../models/ArrayAccess.mjs'
import MemberAccess from '../../../models/MemberAccess.mjs'
import FunctionDef from '../../../models/FunctionDef.mjs'
import FunctionCall from '../../../models/FunctionCall.mjs'
import ImportStatement from '../../../models/ImportStatement.mjs'
import ParsingException from '../../../exceptions/ParsingException.mjs'

// eslint-disable-next-line no-extend-native
Array.prototype.size = function () {
  return this.length
}

class Parser {
  /**
   * @param {TokenStream} input
   * @param {ModuleLoader} moduleLoader - Optional module loader for handling imports
   */
  constructor (input, moduleLoader = null) {
    this.input = input
    this.utils = new ParserUtils()
    this.counts = { sectionNumber: 1, sceneNumber: 1, choiceNumber: 1 }
    this.moduleLoader = moduleLoader
    this.currentFile = input.input?.currentFile || '<inline>'
    this.statusConfigTarget = null
  }

  static async parseText (text) {
    const parser = new Parser(new TokenStream(new InputStream(text)))
    return await parser.parseStory()
  }

  skipPunctuation (ch) {
    if (this.utils.isPunctuation(this.input.peek(), ch)) this.input.next()
    else this.except('Expecting punctuation: "' + ch + '"')
  }

  skipPropertyKeyword (kw) {
    if (this.utils.isPropertyKeyword(this.input.peek(), kw)) this.input.next()
    else this.except('Expecting property: "' + kw + '"')
  }

  skipOtherKeyword (kw) {
    if (this.utils.isOtherKeyword(this.input.peek(), kw)) this.input.next()
    else this.except('Expecting keyword: "' + kw + '"')
  }

  skipSectionStart () {
    if (this.utils.isSectionStart(this.input.peek())) return this.input.next()
    else this.except('Expecting section starter: ')
  }

  skipChoiceStart () {
    if (this.utils.isChoiceStart(this.input.peek())) this.input.next()
    else this.except('Expecting choice starter')
  }

  skipNewLine () {
    while (this.utils.isTokenFor(this.input.peek(), TTS.NEWLINE_CHAR)) { this.input.next() }
    return true
  }

  skipOperator (op) {
    if (this.utils.isOperator(this.input.peek(), op)) this.input.next()
    else this.except('Expecting operator: "' + op + '"')
  }

  skipConditionalToken (kw) {
    if (this.utils.isConditionalKeyword(this.input.peek(), kw)) { this.input.next() } else this.except('Expecting conditional keyword: "' + kw + '"')
  }

  unexpected () {
    this.except('Unexpected token: ' + JSON.stringify(this.input.peek()))
  }

  except (message) {
    return this.input.except(message)
  }

  _applyStatusBarSetting (target, config) {
    if (!target || typeof target !== 'object' || !config) return
    const { variable, show, label } = config
    if (typeof variable !== 'string' || variable.trim() === '') return

    const nextConfig = {
      ...(target[variable] || {}),
      showInStatusBar: show !== false
    }
    if (typeof label === 'string') {
      nextConfig.statusBarLabel = label
    }
    target[variable] = nextConfig
  }

  parseExpression () {
    return this.maybeBinary(this.parseAtom(...arguments), 0)
  }

  maybeBinary (left, givenPrecedence) {
    const isTok = this.utils.isOperator(this.input.preview())
    if (isTok) {
      const tok = this.input.preview()
      const currentPrecedence = PRECEDENCE[tok.symbol]
      if (currentPrecedence > givenPrecedence) {
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

    // Handle postfix operators
    // Array access: arr[index]
    if (this.utils.isPunctuation(this.input.preview(), Punctuations.BRACKET_OPEN)) {
      this.input.next()
      const index = this.parseExpression()
      this.skipPunctuation(Punctuations.BRACKET_CLOSE)
      return this.maybeBinary(new ArrayAccess({ array: left, index }), givenPrecedence)
    }

    // Member access: obj.member or obj.method(args)
    if (this.utils.isPunctuation(this.input.preview(), Punctuations.DOT)) {
      this.input.next()
      const memberTok = this.input.peek()
      if (memberTok.type !== TTS.VARIABLE) {
        this.except('Expected property or method name after .')
      }
      const member = memberTok.symbol
      this.input.next()

      // Check if this is a method call
      if (this.utils.isPunctuation(this.input.preview(), Punctuations.PARENTHESIS_OPEN)) {
        this.input.next()
        const args = []
        let first = true
        while (!this.utils.isPunctuation(this.input.peek(), Punctuations.PARENTHESIS_CLOSE)) {
          if (first) first = false
          else this.skipPunctuation(Punctuations.COMMA)
          if (this.utils.isPunctuation(this.input.peek(), Punctuations.PARENTHESIS_CLOSE)) break
          this.skipNewLine()
          args.push(this.parseExpression())
          this.skipNewLine()
        }
        this.skipPunctuation(Punctuations.PARENTHESIS_CLOSE)
        return this.maybeBinary(new MemberAccess({ object: left, member, args }), givenPrecedence)
      } else {
        // Property access
        return this.maybeBinary(new MemberAccess({ object: left, member, args: null }), givenPrecedence)
      }
    }

    // Function call: func(args)
    if (left.type === TTS.VARIABLE && this.utils.isPunctuation(this.input.preview(), Punctuations.PARENTHESIS_OPEN)) {
      this.input.next()
      const args = []
      let first = true
      while (!this.utils.isPunctuation(this.input.peek(), Punctuations.PARENTHESIS_CLOSE)) {
        if (first) first = false
        else this.skipPunctuation(Punctuations.COMMA)
        if (this.utils.isPunctuation(this.input.peek(), Punctuations.PARENTHESIS_CLOSE)) break
        this.skipNewLine()
        args.push(this.parseExpression())
        this.skipNewLine()
      }
      this.skipPunctuation(Punctuations.PARENTHESIS_CLOSE)
      return this.maybeBinary(new FunctionCall({ name: left, args }), givenPrecedence)
    }

    return left
  }

  parseConditionalBlock () {
    this.skipConditionalToken(KW.IF_BLOCK_START)
    const cond = this.parseExpression()
    if (!this.utils.isPunctuation(this.input.peek(), Punctuations.BRACE_OPEN)) {
      this.skipConditionalToken(KW.THEN)
      const then = this.parseExpression()
      const ret = new ConditionalBlock({ cond, then })
      if (this.input.preview().type === TTS.NEWLINE_CHAR) this.input.next()
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
      this.input.next()
      this.skipNewLine()
      const ifBlock = []
      while (!this.utils.isPunctuation(this.input.peek(), Punctuations.BRACE_CLOSE)) {
        this.skipNewLine()
        if (this.utils.isPunctuation(this.input.peek(), Punctuations.BRACE_CLOSE)) break
        ifBlock.push(this.parseExpression())
        if (this.utils.isTokenFor(this.input.peek(), TTS.CHOICE_END)) this.input.next()
        this.skipNewLine()
      }
      this.skipPunctuation(Punctuations.BRACE_CLOSE)
      const ret = new ConditionalBlock({ cond, ifBlock })
      this.skipNewLine()
      if (
        this.utils.isConditionalKeyword(this.input.peek(), KW.ELSE_BLOCK_START)
      ) {
        this.input.next()
        this.skipNewLine()
        if (this.utils.isPunctuation(this.input.peek(), Punctuations.BRACE_OPEN)) {
          this.input.next()
          this.skipNewLine()
          const elseBlock = []
          while (!this.utils.isPunctuation(this.input.peek(), Punctuations.BRACE_CLOSE)) {
            this.skipNewLine()
            if (this.utils.isPunctuation(this.input.peek(), Punctuations.BRACE_CLOSE)) break
            elseBlock.push(this.parseExpression())
            if (this.utils.isTokenFor(this.input.peek(), TTS.CHOICE_END)) this.input.next()
            this.skipNewLine()
          }
          this.skipPunctuation(Punctuations.BRACE_CLOSE)
          ret.elseBlock = elseBlock
        } else {
          const elseExpr = this.parseExpression()
          ret.elseBlock = [elseExpr]
        }
      }
      return ret
    }
  }

  parseSection () {
    let tok = this.input.peek()
    const settings = new SectionSettings({ timer: 0, title: '' })
    const section = new Section([], [], this.counts.sectionNumber++, settings)
    tok = this.skipSectionStart()

    let choiceCounter = 1
    while (tok && !this.utils.isSectionEnd(tok, tok.symbol)) {
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
        section.choices.push(component)
        section.text.push(component)
        if (!component.target) {
          this.except(
            'No target specified for choice number ' + choiceCounter - 1
          )
        }
      } else if (component instanceof Property) {
        if (component.name === 'statusBar') {
          this._applyStatusBarSetting(this.statusConfigTarget, component.value)
        } else {
          section.settings[component.name] = component.value
          if (component.name === 'title') section.title = component.value
        }
      } else if (
        component instanceof Token ||
        component instanceof ConditionalBlock ||
        component instanceof Action ||
        component instanceof Loop ||
        component instanceof FunctionDef ||
        component instanceof ArrayLiteral ||
        component instanceof ArrayAccess ||
        component instanceof MemberAccess ||
        component instanceof FunctionCall
      ) {
        section.text.push(component)
      }
      if (!this.input.peek() || this.input.peek().type === TTS.SECTION_END) break
      if (!(component instanceof ConditionalBlock)) tok = this.input.next()
    }

    return section
  }

  parseChoice () {
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
        else if (component.name === 'targetType') {
          choice.targetType = component.value
        } else if (component.name === 'statusBar') {
          this._applyStatusBarSetting(this.statusConfigTarget, component.value)
        }
      } else if (
        component instanceof Token ||
        component instanceof ConditionalBlock ||
        component instanceof Action ||
        component instanceof Loop ||
        component instanceof FunctionDef ||
        component instanceof ArrayLiteral ||
        component instanceof ArrayAccess ||
        component instanceof MemberAccess ||
        component instanceof FunctionCall
      ) {
        choice.text.push(component)
      }
      if (!this.input.peek() || this.input.peek().type === TTS.CHOICE_END) break
      if (!(component instanceof ConditionalBlock)) tok = this.input.next()
    }

    return choice
  }

  /**
   * @param {string} type
   * @returns {StorySettings|SectionSettings} settings instance
   */
  parseSettings (type, statusTarget = null) {
    let Entity = StorySettings
    let endKeyword = KW.SETTINGS_END

    const { isTokenFor } = this.utils

    if (type === KW.SECTION_SETTINGS_START) {
      Entity = SectionSettings
      endKeyword = KW.SECTION_SETTINGS_END
    }

    const settings = new Entity({ referrable: false, startAt: 0, fullTimer: 0 })

    this.skipOtherKeyword(type)
    while (!isTokenFor(this.input.peek(), TTS.OTHER_KW, endKeyword)) {
      this.skipNewLine()
      if (isTokenFor(this.input.peek(), TTS.OTHER_KW, endKeyword)) break
      if (isTokenFor(this.input.peek(), TTS.PROPERTY_KW)) {
        const prop = this.parseProperty()
        if (prop.name === 'statusBar' && type === KW.SETTINGS_START) {
          this._applyStatusBarSetting(statusTarget, prop.value)
        } else {
          settings[prop.name] = prop.value
        }
      } else this.unexpected()

      if (isTokenFor(this.input.peek(), TTS.OTHER_KW, endKeyword)) break
    }

    return settings
  }

  parseProperty () {
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
      else if (type instanceof Array) { isValid = type.some((v) => isTokenFor(tok, v)) }
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
        if (result.size() === 0) assignIfValid(tok, TTS.NUMBER)
        else assignIfValid(tok, [TTS.NUMBER, TTS.STRING])
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
        assignIfValid(tok, TTS.STRING, (t) => {
          if (typeof t.symbol !== 'string' || t.symbol.trim() === '') {
            throw new Error('Scene music path cannot be empty')
          }
          return true
        })
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
        limitToN(2)
        name = 'timer'
        if (result.size() === 0) assignIfValid(tok, TTS.NUMBER)
        else assignIfValid(tok, [TTS.NUMBER, TTS.STRING])
      },
      propSectionTitle: () => {
        limitToOne()
        name = 'title'
        assignIfValid(tok, TTS.STRING)
      },
      propStartAt: () => {
        limitToOne()
        name = 'startAt'
        assignIfValid(tok, [TTS.NUMBER, TTS.STRING])
      },
      propRequire: () => {
        limitToOne()
        name = 'require'
        assignIfValid(tok, TTS.STRING)
      },
      propMaxIterations: () => {
        limitToOne()
        name = 'maxIterations'
        assignIfValid(tok, TTS.NUMBER)
      },
      propMaxCallDepth: () => {
        limitToOne()
        name = 'maxCallDepth'
        assignIfValid(tok, TTS.NUMBER)
      },
      propStatusBar: () => {
        limitToN(3)
        name = 'statusBar'
        if (result.size() === 0) {
          assignIfValid(tok, TTS.VARIABLE)
        } else if (result.size() === 1) {
          if (isTokenFor(tok, TTS.BOOLEAN)) {
            result.push(this.utils.isTrue(tok))
          } else if (isTokenFor(tok, TTS.STRING)) {
            result.push(true)
            result.push(tok.symbol)
          } else this.unexpected()
        } else if (result.size() === 2 && typeof result[1] === 'boolean') {
          assignIfValid(tok, TTS.STRING)
        } else this.unexpected()
      }
    }

    while (!isTokenFor(tok, TTS.NEWLINE_CHAR)) {
      parsers[this.utils.camelize(propertyType.toLowerCase())]()
      if (isTokenFor(this.input.peek(), TTS.NEWLINE_CHAR)) break
      this.input.next()
      tok = this.input.peek()
    }

    // this.input.next()

    if (name === 'fullTimer') {
      return new Property({
        name,
        value: {
          timer: result[0],
          target: result[1]
        }
      })
    }
    if (name === 'timer') {
      return new Property({
        name,
        value: {
          timer: result[0],
          target: result.size() > 1 ? result[1] : null
        }
      })
    }
    if (name === 'statusBar') {
      return new Property({
        name,
        value: {
          variable: result[0],
          show: result.size() > 1 ? result[1] : true,
          label: result.size() > 2 ? result[2] : undefined
        }
      })
    }
    return new Property({
      name,
      value: result.size() > 0 ? (resultIsArray ? result : result[0]) : null
    })
  }

  parseScene () {
    this.skipOtherKeyword(KW.SCENE_START)

    const { isTokenFor } = this.utils
    const scene = new Scene([], { first: 0, name: '' })
    scene.serial = this.counts.sceneNumber++

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

  parseAtom (insideChoice) {
    if (this.utils.isTokenFor(this.input.peek(), TTS.NEWLINE_CHAR)) { return this.skipNewLine() }
    if (
      this.utils.isPunctuation(this.input.peek(), Punctuations.PARENTHESIS_OPEN)
    ) {
      this.input.next()
      const expr = this.parseExpression()
      this.skipPunctuation(Punctuations.PARENTHESIS_CLOSE)
      return expr
    }

    if (this.utils.isPunctuation(this.input.peek(), Punctuations.BRACE_OPEN)) {
      this.input.next()
      this.skipNewLine()
      const exp = this.parseExpression()
      this.skipNewLine()
      this.skipPunctuation(Punctuations.BRACE_CLOSE)
      return exp
    }

    // Unary operators (- and !)
    if (this.utils.isOperator(this.input.peek())) {
      const sym = this.input.peek().symbol
      if (sym === '-' || sym === '!') {
        this.input.next()
        const operand = this.parseAtom()
        return new Action('unary', sym, operand, null)
      }
    }

    // Array literals
    if (this.utils.isPunctuation(this.input.peek(), Punctuations.BRACKET_OPEN)) {
      return this.parseArrayLiteral()
    }

    // Keep
    if (this.utils.isConditionalKeyword(this.input.peek(), KW.IF_BLOCK_START)) { return this.parseConditionalBlock() }

    // While loops
    if (this.utils.isTokenFor(this.input.peek(), TTS.LOOP_KW, KW.WHILE_START)) { return this.parseWhileLoop() }

    // Functions
    if (this.utils.isTokenFor(this.input.peek(), TTS.FUNCTION_KW, KW.FUNCTION_START)) { return this.parseFunctionDef() }

    // Break statement
    if (this.utils.isTokenFor(this.input.peek(), TTS.BREAK_KW)) { return this.parseBreakStatement() }

    // Continue statement
    if (this.utils.isTokenFor(this.input.peek(), TTS.CONTINUE_KW)) { return this.parseContinueStatement() }

    // Return statement
    if (this.utils.isTokenFor(this.input.peek(), TTS.RETURN_KW)) { return this.parseReturnStatement() }

    // Keep
    if (this.utils.isBoolean(this.input.peek())) {
      const tok = this.input.peek()
      tok.symbol = this.utils.isTrue(tok)
      this.input.next()
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
      this.input.next()
      return tok
    }
    this.unexpected()
  }

  parseArrayLiteral () {
    const elements = []
    this.skipPunctuation(Punctuations.BRACKET_OPEN)
    this.skipNewLine()

    let first = true
    while (!this.utils.isPunctuation(this.input.peek(), Punctuations.BRACKET_CLOSE)) {
      if (first) first = false
      else this.skipPunctuation(Punctuations.COMMA)
      if (this.utils.isPunctuation(this.input.peek(), Punctuations.BRACKET_CLOSE)) break
      this.skipNewLine()
      elements.push(this.parseExpression())
      this.skipNewLine()
    }
    this.skipPunctuation(Punctuations.BRACKET_CLOSE)
    return new ArrayLiteral({ elements })
  }

  parseWhileLoop () {
    this.input.next()
    this.skipPunctuation(Punctuations.PARENTHESIS_OPEN)
    const condition = this.parseExpression()
    this.skipPunctuation(Punctuations.PARENTHESIS_CLOSE)
    this.skipNewLine()
    this.skipPunctuation(Punctuations.BRACE_OPEN)
    this.skipNewLine()

    const body = []
    while (!this.utils.isPunctuation(this.input.peek(), Punctuations.BRACE_CLOSE)) {
      this.skipNewLine()
      if (this.utils.isPunctuation(this.input.peek(), Punctuations.BRACE_CLOSE)) break
      body.push(this.parseExpression())
      this.skipNewLine()
    }
    this.skipPunctuation(Punctuations.BRACE_CLOSE)
    return new Loop({ loopType: 'while', condition, body })
  }

  parseFunctionDef () {
    this.input.next()
    const nameTok = this.input.peek()
    if (nameTok.type !== TTS.VARIABLE) {
      this.except('Expected function name')
    }
    const name = nameTok.symbol
    this.input.next()

    this.skipPunctuation(Punctuations.PARENTHESIS_OPEN)
    const params = []
    let first = true
    while (!this.utils.isPunctuation(this.input.peek(), Punctuations.PARENTHESIS_CLOSE)) {
      if (first) first = false
      else this.skipPunctuation(Punctuations.COMMA)
      if (this.utils.isPunctuation(this.input.peek(), Punctuations.PARENTHESIS_CLOSE)) break
      this.skipNewLine()
      const paramTok = this.input.peek()
      if (paramTok.type !== TTS.VARIABLE) {
        this.except('Expected parameter name')
      }
      params.push(paramTok.symbol)
      this.input.next()
      this.skipNewLine()
    }
    this.skipPunctuation(Punctuations.PARENTHESIS_CLOSE)
    this.skipNewLine()
    this.skipPunctuation(Punctuations.BRACE_OPEN)
    this.skipNewLine()

    const body = []
    while (!this.utils.isPunctuation(this.input.peek(), Punctuations.BRACE_CLOSE)) {
      this.skipNewLine()
      if (this.utils.isPunctuation(this.input.peek(), Punctuations.BRACE_CLOSE)) break
      body.push(this.parseExpression())
      this.skipNewLine()
    }
    this.skipPunctuation(Punctuations.BRACE_CLOSE)
    return new FunctionDef({ name, params, body })
  }

  parseBreakStatement () {
    const tok = this.input.peek()
    this.input.next()
    return new Token({ type: 'break', symbol: 'break__', id: tok.id, line: tok.line, col: tok.col })
  }

  parseContinueStatement () {
    const tok = this.input.peek()
    this.input.next()
    return new Token({ type: 'continue', symbol: 'continue__', id: tok.id, line: tok.line, col: tok.col })
  }

  parseReturnStatement () {
    this.input.next()
    this.skipNewLine()
    let value = null
    if (!this.utils.isPunctuation(this.input.peek(), Punctuations.BRACE_CLOSE) &&
        this.input.peek().type !== TTS.NEWLINE_CHAR) {
      value = this.parseExpression()
    }
    return new Action('return', null, value, null)
  }

  /**
   * Parses an import statement and loads the referenced module
   * @returns {Promise<ImportStatement>} Import statement with loaded module
   */
  async parseImport () {
    const startToken = this.input.peek()
    this.skipOtherKeyword(KW.IMPORT_START) // import__

    // Expect string with file path
    const pathToken = this.input.peek()
    if (pathToken.type !== TTS.STRING) {
      throw new ParsingException(
        'Expected string path after import__',
        startToken.line,
        startToken.col,
        true
      )
    }
    const importPath = pathToken.symbol
    this.input.next()

    this.skipOtherKeyword(KW.IMPORT_END) // __import

    // Create ImportStatement
    const importStmt = new ImportStatement({
      path: importPath,
      resolvedPath: null,
      line: startToken.line,
      col: startToken.col,
      id: startToken.id
    })

    // Load module if moduleLoader is available
    if (!this.moduleLoader) {
      throw new ParsingException(
        'Module loader not initialized - imports are not supported in this context',
        startToken.line,
        startToken.col,
        true
      )
    }

    const moduleRecord = await this.moduleLoader.loadModule(
      importPath,
      this.currentFile,
      { line: startToken.line, col: startToken.col }
    )

    importStmt.resolvedPath = moduleRecord.path
    importStmt.module = moduleRecord.parsed

    return importStmt
  }

  /**
   * Parses a module file (sections, scenes, and functions only - not a full story)
   * @returns {Promise<Object>} Object with sections, scenes, and functions
   */
  async parseModule () {
    const components = {
      sections: [],
      scenes: [],
      functions: {},
      initVars: {}, // top-level literal variable assignments (merged into story.persistent)
      stats: {}
    }
    this.statusConfigTarget = components.stats

    let tok
    while (!this.input.eof()) {
      this.skipNewLine()
      tok = this.input.peek()
      if (this.input.eof()) break

      const { isTokenFor } = this.utils

      // Handle nested imports
      if (isTokenFor(tok, TTS.OTHER_KW, KW.IMPORT_START)) {
        const importStmt = await this.parseImport()
        if (importStmt.module) {
          components.sections.push(...importStmt.module.sections)
          components.scenes.push(...importStmt.module.scenes)
          Object.assign(components.functions, importStmt.module.functions)
          Object.assign(components.initVars, importStmt.module.initVars || {})
          Object.assign(components.stats, importStmt.module.stats || {})
        }
        continue
      }

      if (isTokenFor(tok, TTS.SECTION_START)) {
        components.sections.push(this.parseSection())
      } else if (isTokenFor(tok, TTS.OTHER_KW, KW.SCENE_START)) {
        components.scenes.push(this.parseScene())
      } else if (isTokenFor(tok, TTS.OTHER_KW, KW.SETTINGS_START)) {
        // Parse module settings for metadata, but don't apply global behavior.
        this.parseSettings(KW.SETTINGS_START, components.stats)
      } else if (isTokenFor(tok, TTS.FUNCTION_KW, KW.FUNCTION_START)) {
        const funcDef = this.parseFunctionDef()
        components.functions[funcDef.name] = funcDef
      } else if (isTokenFor(tok, TTS.VARIABLE)) {
        // Top-level variable assignment — evaluate simple literals at parse time
        const expr = this.parseExpression(false)
        this._tryStoreInitVar(expr, components.initVars)
        continue // parseExpression consumed the tokens; skip the trailing this.input.next()
      } else if (isTokenFor(tok, TTS.PROPERTY_KW)) {
        const prop = this.parseProperty()
        if (prop.name === 'statusBar') {
          this._applyStatusBarSetting(components.stats, prop.value)
        }
      }

      tok = this.input.next()
    }

    this.statusConfigTarget = null
    return components
  }

  /**
   * If expr is a simple literal assignment (name = literal), store it in the target map.
   * @param {*} expr - parsed expression
   * @param {Object} target - initVars map to populate
   */
  _tryStoreInitVar (expr, target) {
    if (!(expr instanceof Action) || expr.type !== 'assign') return
    if (!(expr.left instanceof Token) || expr.left.type !== TTS.VARIABLE) return
    const varName = expr.left.symbol
    const rhs = expr.right
    if (rhs instanceof Token) {
      target[varName] = rhs.symbol
    } else if (rhs instanceof ArrayLiteral && rhs.elements.length === 0) {
      target[varName] = []
    }
  }

  /**
   * @param {TokenStream} ts
   * @returns {Story}
   */
  async parseStory (ts) {
    if (ts && !this.input) this.input = ts
    // Main story sections/scenes start at 0 so they don't collide with
    // imported module sections/scenes, which use a fresh parser whose
    // constructor initialises its own counter starting at 1.
    this.counts = { sectionNumber: 0, sceneNumber: 0, choiceNumber: 0 }
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
    this.statusConfigTarget = story.stats

    // Initialize functions storage
    if (!story.persistent.functions) {
      story.persistent.functions = {}
    }

    let tok
    while (!this.input.eof()) {
      this.skipNewLine()
      tok = this.input.peek()
      if (this.input.eof()) break

      const { isTokenFor } = this.utils

      // Handle imports
      if (isTokenFor(tok, TTS.OTHER_KW, KW.IMPORT_START)) {
        const importStmt = await this.parseImport()
        // Merge imported content into story
        if (importStmt.module) {
          story.sections.push(...importStmt.module.sections)
          story.scenes.push(...importStmt.module.scenes)
          Object.assign(story.persistent.functions, importStmt.module.functions)
          // Merge top-level variable initialisers from the module
          Object.assign(story.persistent, importStmt.module.initVars || {})
          Object.assign(story.stats, importStmt.module.stats || {})
        }
        continue // Skip to next iteration
      }

      if (isTokenFor(tok, TTS.SECTION_START)) {
        story.sections.push(this.parseSection())
      } else if (isTokenFor(tok, TTS.OTHER_KW, KW.SCENE_START)) {
        story.scenes.push(this.parseScene())
      } else if (isTokenFor(tok, TTS.OTHER_KW, KW.SETTINGS_START)) {
        story.settings = this.parseSettings(KW.SETTINGS_START, story.stats)
      } else if (isTokenFor(tok, TTS.FUNCTION_KW, KW.FUNCTION_START)) {
        const funcDef = this.parseFunctionDef()
        story.persistent.functions[funcDef.name] = funcDef
        story.functions.push(funcDef)
      } else if (isTokenFor(tok, TTS.VARIABLE)) {
        // Top-level variable assignment in the main story file
        const expr = this.parseExpression(false)
        this._tryStoreInitVar(expr, story.persistent)
        continue
      } else if (isTokenFor(tok, TTS.PROPERTY_KW)) {
        const prop = this.parseProperty()
        if (prop.name === 'statusBar') {
          this._applyStatusBarSetting(story.stats, prop.value)
        }
      }
      tok = this.input.next()
    }

    this.statusConfigTarget = null
    if (story.settings.name) story.name = story.settings.name
    return story
  }
}

export default Parser
