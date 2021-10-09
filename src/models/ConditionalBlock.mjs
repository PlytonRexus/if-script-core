import Action from './Action.mjs'
import Token from './Token.mjs'
import Choice from './Choice.mjs'

class ConditionalBlock {

  _class = 'ConditionalBlock'

  constructor (input, json) {
    if (!!json) {
      if (typeof json === 'string')
      json = JSON.parse(json)
      input = json
      if (input.cond._class === 'Action') {
        input.cond = Action.fromJson(input.cond)
      }

      if (!!input.then && input.then._class === 'Action') {
        input.then = Action.fromJson(input.then)
      } else if (!!input.then && input.then._class === 'ConditionalBlock') {
        input.then = ConditionalBlock.fromJson(input.then)
      } else if (!!input.then && input.then._class === 'Token') {
        input.then = Token.fromJson(input.then)
      } else if (!!input.then && input.then._class === 'Choice') {
        input.then = Choice.fromJson(input.then)
      }

      if (typeof input.else !== 'undefined'
        && !!input.else && input.else._class === 'Action') {
        input.else = Action.fromJson(input.else)
      } else if (typeof input.else !== 'undefined'
        && !!input.else && input.else._class === 'ConditionalBlock') {
        input.else = ConditionalBlock.fromJson(input.else)
      } else if (typeof input.else !== 'undefined'
        && !!input.else && input.else._class === 'Token') {
        input.else = Token.fromJson(input.else)
      } else if (typeof input.else !== 'undefined'
        && !!input.else && input.else._class === 'Choice') {
        input.else = Choice.fromJson(input.else)
      }
    }

    const { cond, then } = input

    this.cond = cond
    this.then = then
    this.else = input.else

  }

  static fromJson(json) {
    return new ConditionalBlock({}, json)
  }

  get type() {
    return this._class
  }

  set type(_type) {
    this._class = _type
  }

}

export default ConditionalBlock
