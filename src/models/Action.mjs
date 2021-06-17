import PRECEDENCE from '../constants/custom/operatorPrecedence.mjs'

class Action {
  constructor (type, operator, left, right) {
    this.type = type
    this.operator = operator
    this.left = left
    this.right = right
    this.precedence = PRECEDENCE[this.operator]
  }
}

export default Action
