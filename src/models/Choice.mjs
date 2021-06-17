/**
 * @author Mihir Jichkar
 * @description A Choice has an owner where the choice resides and a target where it points.
 * @class Choice
 */
class Choice {
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
  constructor ({ owner, target, text }, { variables, mode, choiceI, condition, actions, input, targetType }) {
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
    // Object.assign(this, ...arguments)
  }

  get type () {
    return 'Choice'
  }
}

export default Choice
