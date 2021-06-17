import nearley from 'nearley'
import { grammar as sectionGrammar } from './section.grammar.mjs'
import { grammar as sceneGrammar } from './scene.grammar.mjs'
import Story from '../../models/Story.mjs'
import { grammar } from '../../constants/regex/regexGrammar.mjs'

const variableRegex = grammar.variable

/* Regexs */

/**
 * Parses raw text (in IF syntax) into a Story instance.
 *
 * @param {string} text whole text of story
 * @returns {Story} a Story object
 */
function parseText (text) {
  text = text.replace(grammar.comment, '').replace(/>>/g, '').replace(/<</g, '')

  let settings = text.match(grammar.settings)
  settings = settings ? settings[0] : ''
  const { referrable, startAt, fullTimer, globals } = parseSettings(settings)
  text = text.replace(grammar.settings, '')

  let serial = 0
  const sectioned = (text.match(grammar.section) || [])
    .map(section => {
      serial += 1
      return parseSection(section, serial)
    })
    // if (sectioned === [])
    // throw Error({ "message": "Atleast one section is required.", "code": "1" });

  text = text.replace(grammar.section, '')

  const scened = (text.match(grammar.scene) || [])
    .map((scene, i) => parseScene(scene, i + 1))

  const passaged = (text.match(grammar.passage) || [])
    .map(passage => parsePassage(passage))

  return new Story(Date.now().toString(), { sections: sectioned, passages: passaged, scenes: scened }, { referrable, startAt, fullTimer }, { globals })
}

function parseSection (string, serial) {
  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(sectionGrammar))
  parser.feed(string)
  const section = parser.results[0]
  section.serial = serial
  section.choices = section.choices.map(choice => {
    choice.owner = serial
    if (choice.mode === 'input') {
      choice.text += `<input type="text" class="if_r-choice-input" id="if_r-choice-input-${choice.choiceI}"/>`
    }
    return choice
  })
  return section
}

function parseScene (string, serial) {
  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(sceneGrammar))
  parser.feed(string)
  const scene = parser.results[0]
  scene.serial = serial
  return scene
}

/**
 * Parse text string into settings object
 *
 * @returns object { referrable, startAt }
 * @param string
 */
function parseSettings (string) {
  string = string.replace(/settings>/, '').replace(/<settings/, '')

  let referrable = string.match(grammar.referrable)
  referrable = referrable ? referrable[0].replace(/@referrable /, '') : ''
  referrable = referrable === 'true'
  string = string.replace(grammar.referrable, '').replace(/@referrable/, '')

  let startAt = string.match(grammar.startAt)
  startAt = startAt ? startAt[0].replace(/@startAt /, '') : ''
  startAt = parseInt(startAt) ? parseInt(startAt) : 1
  string = string.replace(grammar.startAt, '')

  let fullTimerString = string.match(grammar.fullTimer)
  fullTimerString = fullTimerString ? fullTimerString[0].replace(/@fullTimer /, '') : '0'

  const fullTimerNumbers = fullTimerString.match(/\d+/g)

  const fullTimer = {}
  if (fullTimerNumbers.length > 1) {
    fullTimer.timer = parseInt(fullTimerNumbers[0]) ? parseInt(fullTimerNumbers[0]) : 0
    fullTimer.target = parseInt(fullTimerNumbers[1]) ? parseInt(fullTimerNumbers[1]) : 1
  } else {
    fullTimer.timer = 0
    fullTimer.target = 1
  }
  string = string.replace(grammar.fullTimer, '')

  const globals = parseGlobals(string)

  return { referrable, startAt, fullTimer, globals }
}

function parseGlobals (string) {
  const globalArray = (string.match(grammar.variableAssignment) || [])
  const varObject = {}

  globalArray.forEach(variable => {
    variable = variable.replace(/\$\{/, '').replace(/\}/, '').trim()

    let varName = variable.match(/[A-Za-z0-9]+/) || []
    if (varName.length > 0) {
      varName = varName[0]
      variable = variable.replace(/\w+=/, '')
    } else {
      // throw Error ("Invalid variable object!");
      console.warn('Invalid variable ${}!')
      return {}
    }

    let varValue = variable.match(grammar.varValue) || []
    varValue = varValue.length > 0 ? varValue[0] : ''

    if (varValue === '') { console.warn("Variable value was read as ''. Are you sure the value should be empty?") }
    varObject[varName] = parseInt(varValue) ? parseInt(varValue) : varValue
  })

  return varObject
}

export default { Story, parseText, variableRegex }
export { Story, parseText, variableRegex }
