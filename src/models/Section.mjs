import Choice from './Choice.mjs'
import Token from './Token.mjs'
import ConditionalBlock from './ConditionalBlock.mjs'
import Action from './Action.mjs'
import SectionSettings from './SectionSettings.mjs'

/**
 * @author Mihir Jichkar
 * @description Each section has choices and text.
 * @class Section
 */
class Section {

  _class = 'Section'

  /**
   * Creates an instance of Section.
   * @param {string|array<string|ConditionalBlock|Token>} text HTML formatted text content of the Section
   * @param {array<Choice>} choices Array of Choice Objects
   * @param {number} serial
   * @param {SectionSettings} settings
   * @memberof Section
   */
  constructor (text, choices, serial, settings, json) {
    if (!!json) {
      if (typeof json === 'string')
      json = JSON.parse(json)
      Object.assign(this, json)
      this.choices = this.choices.map(c => Choice.fromJson(c))
      this.text = (this.text || []).map(t => {
        if (t._class === 'Token') {
          return Token.fromJson(t)
        } else if (t._class === 'ConditionalBlock') {
          return ConditionalBlock.fromJson(t)
        } else if (t._class === 'Action') {
          return Action.fromJson(t)
        } else if (t._class === 'Choice') {
          return Choice.fromJson(t)
        }
      })
      this.settings = SectionSettings.fromJson(this.settings)
    } else {
      this.text = typeof text === 'string' ? text.trim() : text
      this.title = settings.title
      this.choices = choices
      this.serial = serial
      this.settings = settings
    }
  }


  static fromJson(json) {
    return new Section({}, {}, {}, {}, json)
  }

  findChoice (serial) {
    serial = parseInt(serial)
    let index = this.choices.findIndex(choice => {
      return choice.choiceI === serial
    })

    if (index === -1) {
      index = 0
    }

    return this.choices[index]
  }

  get type () {
    return this._class
  }

  set type(_type) {
    this._class = _type
  }

}

export default Section
