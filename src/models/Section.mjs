/**
 * @author Mihir Jichkar
 * @description Each section has choices and text.
 * @class Section
 */
class Section {
  /**
   * Creates an instance of Section.
   * @param {string|array<string|ConditionalBlock|Token>} text HTML formatted text content of the Section
   * @param {array<Choice>} choices Array of Choice Objects
   * @param {number} serial
   * @param {SectionSettings} settings
   * @memberof Section
   */
  constructor (text, choices, serial, settings) {
    this.text = typeof text === 'string' ? text.trim() : text
    this.title = settings.title
    this.choices = choices
    this.serial = serial
    this.settings = settings
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
    return this.constructor.name
  }
}

export default Section
