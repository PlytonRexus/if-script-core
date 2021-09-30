import Action from './Action.mjs'
import Token from './Token.mjs'
import ConditionalBlock from './ConditionalBlock.mjs'

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
    if (!!json) {
      if (typeof json === 'string') json = JSON.parse(json)
      let { owner, target, text, variables,
        mode, choiceI, condition, actions,
        input, targetType } = json
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

      this.actions = (this.actions || []).map(Action.fromJson)
      this.text = (this.text || []).map(t => {
        if (t._class === 'Token') {
          return Token.fromJson(t)
        } else if (t._class === 'ConditionalBlock') {
          return ConditionalBlock.fromJson(t)
        } else if (t._class === 'Action') {
          return Action.fromJson(t)
        }
      })
    } else {
      let { owner, target, text } = primary
      let { variables, mode, choiceI, condition, actions, input, targetType } = secondary
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
