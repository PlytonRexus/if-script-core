import PRECEDENCE from '../constants/custom/operatorPrecedence.mjs'

class Action {

  _class = 'Action'

  constructor (type, operator, left, right, json) {
    if (!!json) {
      if (typeof json === 'string')
      json = JSON.parse(json)
      Object.assign(this, json)
    } else {
      this.type = type
      this.operator = operator
      this.left = left
      this.right = right
    }
    this.precedence = PRECEDENCE[this.operator]
  }

  static fromJson(json) {
    return new Action(null, null, null, null, json)
  }

}

export default Action
