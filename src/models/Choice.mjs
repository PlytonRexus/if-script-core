import Action from './Action.mjs'
import Token from './Token.mjs'
import ConditionalBlock from './ConditionalBlock.mjs'
import Loop from './Loop.mjs'
import ArrayLiteral from './ArrayLiteral.mjs'
import ArrayAccess from './ArrayAccess.mjs'
import MemberAccess from './MemberAccess.mjs'
import FunctionCall from './FunctionCall.mjs'

/**
 * @author Mihir Jichkar
 * @description A Choice has an owner where the choice resides and a target where it points.
 * @class Choice
 */
class Choice {

  _class = 'Choice'

  /**
   * Creates an instance of Choice.
   * @param {Section} owner Section.serial where this Choice resides
   * @param {Section} target Section.serial to which this choice points
   * @param {string|Array<string|>} text Human-readable description of the Choice
   * @param variables
   * @param mode
   * @param choiceI
   * @param condition
   * @param actions
   * @param {array<number>} input
   * @param targetType
   * @memberof Choice
   */
  constructor (primary, secondary, json) {
    const reviveNode = (node) => {
      if (!node || typeof node !== 'object') return node
      if (node._class === 'Token') return Token.fromJson(node)
      if (node._class === 'ConditionalBlock') return ConditionalBlock.fromJson(node)
      if (node._class === 'Action') return Action.fromJson(node)
      if (node._class === 'Loop') return Loop.fromJson(node)
      if (node._class === 'ArrayLiteral') return ArrayLiteral.fromJson(node)
      if (node._class === 'ArrayAccess') return ArrayAccess.fromJson(node)
      if (node._class === 'MemberAccess') return MemberAccess.fromJson(node)
      if (node._class === 'FunctionCall') return FunctionCall.fromJson(node)
      return node
    }

    if (!!json) {
      if (typeof json === 'string') json = JSON.parse(json)
      let {
        owner,
        target,
        text,
        variables,
        mode,
        choiceI,
        condition,
        actions,
        input,
        targetType,
        when,
        once,
        disabledText,
        choiceSfx,
        focusSfx,
        choiceStyle
      } = json
      this.mode = mode
      this.text = text
      this.owner = owner
      this.target = target
      this.variables = variables
      this.choiceI = choiceI
      this.condition = condition || null
      this.actions = actions
      this.input = this.mode === 'input' ? input : null
      this.targetType = targetType || 'section'
      this.when = when || null
      this.once = once === true
      this.disabledText = typeof disabledText === 'string' ? disabledText : null
      this.choiceSfx = typeof choiceSfx === 'string' ? choiceSfx : null
      this.focusSfx = typeof focusSfx === 'string' ? focusSfx : null
      this.choiceStyle = typeof choiceStyle === 'string' ? choiceStyle : 'default'

      this.actions = (this.actions || []).map(Action.fromJson)
      this.text = (this.text || []).map(reviveNode)
      this.when = reviveNode(this.when)
    } else {
      let { owner, target, text } = primary
      let { variables, mode, choiceI, condition, actions, input, targetType, when, once, disabledText, choiceSfx, focusSfx, choiceStyle } = secondary
      this.mode = mode
      this.text = text
      this.owner = owner
      this.target = target
      this.variables = variables
      this.choiceI = choiceI
      this.condition = condition || null
      this.actions = actions
      this.input = this.mode === 'input' ? input : null
      this.targetType = targetType || 'section'
      this.when = when || null
      this.once = once === true
      this.disabledText = typeof disabledText === 'string' ? disabledText : null
      this.choiceSfx = typeof choiceSfx === 'string' ? choiceSfx : null
      this.focusSfx = typeof focusSfx === 'string' ? focusSfx : null
      this.choiceStyle = typeof choiceStyle === 'string' ? choiceStyle : 'default'
    }
    // Object.assign(this, ...arguments)
  }

  static fromJson(json) {
    return new Choice({}, {}, json)
  }

  get type() {
    return this._class
  }

  set type(_type) {
    this._class = _type
  }

}

export default Choice
