import PRECEDENCE from '../constants/custom/operatorPrecedence.mjs'
import Token from './Token.mjs'

class Action {

  _class = 'Action'

  constructor (type, operator, left, right, json) {
    if (!!json) {
      if (typeof json === 'string')
      json = JSON.parse(json)
      Object.assign(this, json)
      if (this.left._class === 'Action') {
        this.left = Action.fromJson(this.left)
      } else if (this.left._class === 'Token') {
        this.left = Token.fromJson(this.left)
      }
      if (this.right._class === 'Action') {
        this.right = Action.fromJson(this.right)
      } else if (this.right._class === 'Token') {
        this.right = Token.fromJson(this.right)
      }
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
