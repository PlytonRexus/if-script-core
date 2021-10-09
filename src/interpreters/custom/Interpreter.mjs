import Run from './Run.mjs'
import DOM from '../../constants/custom/dom.mjs'
import Story from '../../models/Story.mjs'
import InterpreterException from '../../exceptions/InterpreterException.mjs'
import Choice from '../../models/Choice.mjs'
import Section from '../../models/Section.mjs'
import Token from '../../models/Token.mjs'
import TokenTypes from '../../constants/custom/tokenTypes.mjs'
import ConditionalBlock from '../../models/ConditionalBlock.mjs'
import Action from '../../models/Action.mjs'
import InterpreterUtils from './InterpreterUtils.mjs'

/* eslint-disable no-eval */
class Interpreter {
  /**
   * @param {Run} run
   */
  constructor (run) {
    this.debug = typeof process !== 'undefined' && process
      ? process.env.IF_DEBUG
      : !!localStorage.getItem('IF_DEBUG')
    this.run = run || null
    this.utils = new InterpreterUtils()
    if (this.run) import('../../themes/' + this.run.theme + '.css')
  }

  /**
   * @param {Story} story
   * @param {Run} run
   * @param {string} theme
   */
  loadStory (story, run, theme) {
    if ((!story && !run) || (!!story && !(story instanceof Story))) throw new InterpreterException('Invalid story supplied')
    this.run = run || new Run(story, null, theme)
    if (this.run) import('../../themes/' + this.run.theme + '.css')
    console.info('Story loading...')

    this.generateDisplay()

    /* Bring variables to original values. */
    // TODO: Don't need this. No global variables.
    if (!run)
    this.resetVariables()

    if (this.run.story.settings.fullTimer) {
      // Adjust for loaded games
      /* Set timer, if any. */
      const {
        timer,
        target
      } = this.run.story.settings.fullTimer
      if (timer !== 0) this.setTimer(timer, target)
    }

    /* Set initial state and initial variables */
    if (!this.run.state.section) {
      this.setState({
        section: this.run.story.settings.startAt,
        turn: 0
      })
    } else {
      // this.setState({
      //   section: this.run.state.section,
      //   turn: this.run.state.variables.turn
      // })
    }

    this.run.state.variables.turn = 0

    /* Load the section into the viewport */
    this.loadSection(null, this.run.state.section)

    /* Start the stats bar */
    this.showStats()

    /* Hide the undo button because the story's just
     * started and no turns have been played.
     */
    document.querySelector(DOM.undoButtonId).style.display = 'none'
    document.querySelector('#if_r-story-title-wrap').innerHTML = this.run.story.name
    /* Clear the console to make things clearer */
    if (!this.debug) console.clear()

    /* Good luck! */
    console.info('Load finished. Happy playing!')
  }

  generateDisplay () {
    console.info('Generating dislay...')
    let $main = document.querySelector(DOM.targetId)

    if (!$main) {
      const element = document.createElement('div')
      element.setAttribute('id', this.replaceHash(DOM.targetId))
      document.querySelector('body').appendChild(element)
      $main = document.querySelector(DOM.targetId)
    }

    $main.innerHTML = `
      <div id="if_r-story-title-wrap"></div>
      <div id="${this.replaceHash(DOM.statsDivId)}" class="${this.replaceDot(DOM.statsDivClass)}">
          <a href="javascript:void(0)" class="closebtn">&times;</a>
          <a href="#" id="${this.replaceHash(DOM.resetButtonId)}">Restart</a>
          <a href="#" id="${this.replaceHash(DOM.undoButtonId)}">Undo</a>
          <a href="#" id="${this.replaceHash(DOM.saveGameId)}" download="${this.run.story.name} - ${new Date()}.ifsave">Save game</a>
          <!-- <a href="#" id="">Stats</a> -->
          <div>
            <a href="#">Music</a>
            <audio controls id="if_r-audio-player">
              <source src="" type="audio/mp3" id="if_r-audio-source">
              Your browser does not support audio.
            </audio>
          </div>
          <div>
            <a href="#">Upload save file</a>
            <input type="file" id="${this.replaceHash(DOM.uploadSaveFileId)}" accept=".ifsave, .json" />
          </div>
      </div>
      <div id="if_r-status-bar">
      <div id="${this.replaceHash(DOM.alertAreaId)}">
      </div>
      <div id="${this.replaceHash(DOM.burgerId)}">
      <a href="#" id="if_r-burger-icon">&#9776;</a>
      </div>
      </div>
      <div id="${this.replaceHash(DOM.sectionDisplayId)}">
      </div>`

    const burger = document.querySelector(DOM.burgerId)

    burger.addEventListener('click', (e) => {
      e.preventDefault()
      this.showStatsDiv()
    })

    console.info('Display loaded.')
  }

  resetVariables () {
    this.run.state.variables = {}
    Object.keys(this.run.story.persistent)
      .forEach(key => (this.run.state.variables[key] = this.run.story.persistent[key]))
  }

  generateSectionBySerial (serial) {
    let section
    if (serial instanceof Section) section = serial
    else section = this.run.story.findSection(serial)
    return this.generateHTMLForSection(section)
  }

  /**
   * @param {Section} section
   * @returns {*|string}
   */
  generateHTMLForSection (section) {
    let wrapper = ''
    if (!section || !(section instanceof Section)) {
      this.showAlert("Something's wrong!")
      return
    }
    let {
      title,
      choices,
      text,
      serial
    } = section

    // choices = []
    let titleText = this.resolveSyntaxTree(title, '', section)
    titleText = this.utils.formatText(titleText)
    let parasText = this.resolveSyntaxTree(text, '', section)
    parasText = this.utils.formatText(parasText)

    let exist = {}
    choices = choices.filter(c => {
      if (!exist[c.choiceI]) {
        exist[c.choiceI] = true
        return true
      } else return false
    })

    wrapper += `<div class="if_r-section" id="section-${serial}">`

    wrapper += `<span class="if_r-section-title">${titleText}</span>`

    wrapper += `<div class="if_r-paras">${parasText}</div>`

    wrapper += `<div class="if_r-section-choices-list" id="section-${serial}-choices">`

    wrapper = this.loadChoices(choices, wrapper, serial)

    wrapper += '</div>'

    return wrapper.replaceAll('<p></p>', '')
  }

  /**
   * @param {ConditionalBlock} block
   */
  resolveConditionalBlock (block, section) {
    let result = ''
    if (block instanceof ConditionalBlock) {
      if (this.resolveAction(block.cond, false, section))
        result = this.resolveAction(block.then, false, section)
      else if (block.else) result = this.resolveAction(block.else, false, section)
    }

    return result ?? ''
  }

  /**
   * @param {Array|string} tree
   * @param start
   */
  resolveSyntaxTree (tree, start = '', section) {
    if (typeof tree === 'string') { return tree }
    return tree.reduce((acc, v, idx) => {
      if (typeof start === 'string') {
        if (v instanceof Token) {
          const { VARIABLE, STRING, NUMBER } = TokenTypes
          if (v.type === VARIABLE) acc += this.run.state.variables[v.symbol]
          else if (v.type === STRING) acc += v.symbol
          else if (v.type === NUMBER) acc += v.symbol
          else acc += v.symbol
        } else if (v instanceof ConditionalBlock) {
          acc += this.resolveConditionalBlock(v, section)
        } else if (v instanceof Action) {
          acc += this.resolveAction(v, false, section)
        }
      }
      if (v instanceof Choice) {
        section.choices.push(v)
      }
      return acc
    }, start)
  }

  /**
   * @param {Action|Token} action
   * @param {boolean} returnName
   */
  resolveAction (action, returnName = false, section) {
    if (action instanceof Action) {
      if (action.type === 'assign') {
        (this.run.state.variables[this.resolveAction(action.left, true, section)]
          = this.resolveAction(action.right, false, section))
        return ''
      } else if (action.type === 'binary') {
        const left = this.resolveAction(action.left, false, section)
        const right = this.resolveAction(action.right, false, section)
        return this.utils.solveAction(action, left, right)
      }
    } else if (!returnName && action instanceof Token && action.type === TokenTypes.VARIABLE) {
      return this.run.state.variables[action.symbol]
    } else if (action instanceof Choice) {
      section.choices.push(action)
      return null
    } else return action.symbol
  }

  loadChoices (choices, wrapper, serial) {
    choices = [...new Set(choices)]
    choices.forEach((choice, i) => {
      const { target, owner, mode } = choice
      const choiceText = this.utils.formatText(this.resolveSyntaxTree(choice.text, '')).trim()
        .replace(/^<p>/, '').replace(/<\/p>$/, '')
      i++
      if (choice.mode === 'input') wrapper += this.getChoiceWrapper(target, owner, serial, i, mode, `${choiceText} <input type="text" class="if_r-choice-input" id="if_r-choice-input-${i}" />`)
      else wrapper += this.getChoiceWrapper(target, owner, serial, i, mode, choiceText)
    })
    return wrapper
  }

  getChoiceWrapper (target, owner, serial, i, mode, choiceText) {
    return `<div class="if_r-section-choice-li"> <div class="if_r-section-choice" data-if_r-target="${target}"
data-if_r-owner="${owner}" id="if_r-${serial}-choice-${i}"
data-if_r-mode="${mode}" data-if_r-i="${i}">${choiceText}</div></div>`
  }

  isSatisfied (condition) {
    if (!condition) {
      return true
    }

    const {
      comparisons,
      glue,
      // eslint-disable-next-line no-unused-vars
      type
    } = condition
    // let operators = ["==", ">=", "<=", ">", "<"];

    if (glue) {
      if (glue.trim() === '&') {
        comparisons.forEach(comp => {
          const truth = this.doesMatch(comp)

          if (!truth) {
            return false
          }
        })
        return true
      } else if (glue.trim() === '|') {
        comparisons.forEach(comp => {
          const truth = this.doesMatch(comp)

          if (truth) {
            return true
          }
        })
        return false
      }
    } else {
      return this.doesMatch(comparisons[0])
    }
  }

  doesMatch (comp, type) {
    let truth
    if (type && type === 'vs') {
      const real = this.run.state.variables[comp.variable]
      const given = parseInt(comp.against) ? parseInt(comp.against) : comp.against.trim()

      // console.log("eval(`(parseInt(${real}) ? parseInt(${real}) : '${real}') ${comp.operator.trim()} (parseInt(${given}) ? parseInt(${given}) : '${given}') ? true : false`)");

      truth = eval(`(parseInt('${real}') ? parseInt('${real}') : '${real}') ${comp.operator.trim()} (parseInt('${given}') ? parseInt('${given}') : '${given}') ? true : false`)
    } else {
      const real = this.run.state.variables[comp.variable]
      const given = parseInt(comp.against) ? parseInt(comp.against) : this.run.state.variables[comp.against.trim()]

      // console.log(`(parseInt(${real}) ? parseInt(${real}) : '${real}') ${comp.operator.trim()} (parseInt(${given}) ? parseInt(${given}) : '${given}') ? true : false`);

      truth = eval(`(parseInt('${real}') ? parseInt('${real}') : '${real}') ${comp.operator.trim()} (parseInt('${given}') ? parseInt('${given}') : '${given}') ? true : false`)
    }

    return truth
  }

  replaceVars (str, variables) {
    Object.keys(variables)
      .forEach(v => (str = this.replaceOneVariable(str, v, variables[v])))
    return str
  }

  replaceOneVariable (str, name, value) {
    const then = Date.now()
    if (typeof str === 'string') {
      let j = 0
      while (j >= 0 && Date.now() - then < 10000) {
        j = str.indexOf('${' + name + '}', j > 0 ? j + 1 : 0)
        if (!(j === -1 || (j > 0 && str[j - 1] === '\\'))) {
          const first = str.substring(0, j)
          const last = str.substring(j + name.length + 3)
          str = first + value + last
        }
      }

      return str
    }
  }

  setupUndo () {
    this.setState({
      lastSection: this.run.state.section
    })
  }

  recordOldValues (vars) {
    this.run.state.oldValues = {}
    vars.forEach(variable => {
      this.run.state.oldValues[variable] = this.run.state.variables[variable]
    })
  }

  undoVars (vars) {
    Object.keys(vars).forEach(variable => {
      this.run.state.variables[variable] = vars[variable]
    })
  }

  undoTurn () {
    this.undoVars(this.run.state.oldValues)
    this.changeTurn(-1)
    this.switchSection(this.run.state.lastSection.serial, true)
    document.querySelector(DOM.undoButtonId).style.display = 'none'
  }

  switchSection (targetSec, isUndo) {
    const sectionHTML = this.generateSectionBySerial(targetSec)
    this.loadSection(sectionHTML)

    if (!isUndo) {
      this.setupUndo()
      document.querySelector(DOM.undoButtonId).style.display = 'block'
    }

    const section = this.run.story.findSection(targetSec)
    const {
      timer,
      target
    } = section.settings.timer
    if (this.run.state.currentTimeout) { clearTimeout(this.run.state.currentTimeout) }
    if (timer && target) {
      this.setTimer(timer, target)
    }

    if (!isUndo) this.changeTurn()

    this.setState({
      section: targetSec
    })

    this.showStats()
  }

  setState (opts) {
    Object.keys(opts).forEach(opt => {
      if (opt !== 'section') {
        this.run.state[opt] = opts[opt]
        // if (opt === "turn")
        //     this.changeTurn(null, opts[opt]);
      } else if (opt === 'section') {
        // if (this.debug) console.log(this.run.story.findSection(opts['section']));
        this.run.state.section = this.run.story.findSection(opts.section)
      }
    })
  }

  changeTurn (change, abs) {
    this.setState({
      turn: abs || (change ? (this.run.state.turn + change) : this.run.state.turn + 1)
    })

    this.run.state.variables.turn = abs || (change ? (this.run.state.turn + change) : this.run.state.turn + 1)
  }

  showStats () {
    const stats = Object.keys(this.run.state.variables)
    let statsHTML = `<pre> <b>Turn:</b> ${this.run.state.turn}   `

    stats.forEach(stat => {
      if (stat !== 'turn')statsHTML += `<b>${stat}:</b> ${this.run.state.variables[stat]}   `
    })

    statsHTML += '</pre>'

    document.querySelector(DOM.alertAreaId).innerHTML = statsHTML
  }

  loadSection (sectionHTML, serial) {
    if (!this.run.story.settings.referrable) {
      this.replaceSection(sectionHTML, serial)
    } else {
      this.appendSection(sectionHTML, serial)
    }
  }

  changeVariables (vars, to) {
    /* Precautionary saving of old values of variables. */
    this.recordOldValues(vars)

    vars.forEach(variable => {
      this.run.state.variables[variable instanceof Token ? variable.symbol : variable] = parseInt(to) ? parseInt(to) : to
    })
  }

  doActions (actions) {
    actions.forEach(act => {
      Object.assign(this.run.state.oldValues, this.run.state.variables)
      this.resolveAction(act)
    })
  }

  finishAction (subject, op, modifier) {
    if (op === '+') {
      this.run.state.variables[subject] += modifier
    } else if (op === '-') {
      this.run.state.variables[subject] -= modifier
    } else if (op === '*') {
      this.run.state.variables[subject] *= modifier
    } else if (op === '/') {
      this.run.state.variables[subject] /= modifier
    } else if (op === '=') {
      this.run.state.variables[subject] = modifier
    }
  }

  setTimer (timer, target) {
    return (this.run.state.currentTimeout = setTimeout(() => {
      this.switchSection(target)
    }, timer * 1000))
  }

  replaceSection (sectionHTML, serial) {
    if (serial) document.querySelector(DOM.sectionDisplayId).innerHTML = this.generateSectionBySerial(serial)
    else {
      document.querySelector(DOM.sectionDisplayId).innerHTML = sectionHTML
    }
    this.setListenersOnChoices()
  }

  appendSection (sectionHTML, serial) {
    if (serial) document.querySelector(DOM.sectionDisplayId).innerHTML = this.generateSectionBySerial(serial)
    else {
      document.querySelector(DOM.sectionDisplayId).innerHTML += sectionHTML
    }
    this.setListenersOnChoices()
  }

  showAlert (html) {
    document.querySelector(DOM.alertAreaId).innerHTML = html
    setTimeout(() => {
      document.querySelector(DOM.alertAreaId).innerHTML = ''
    }, 3000)
  }

  setListenersOnChoices () {
    document.querySelectorAll('.if_r-section-choice').forEach(choice => {
      choice.onclick = (e) => {
        e.preventDefault()
        const choiceI = choice.getAttribute('data-if_r-i')
        let { actions, targetType, mode, variables: vars, target: tar, input } = this.run.state.section.findChoice(choiceI)

        // if (this.debug) console.log("owner:", owner);

        if (targetType === 'scene') {
          const scene = this.run.story.findScene(tar)
          if (this.debug === true) console.log('Going to scene ' + tar)
          tar = scene.first
          if (this.debug === true) console.log('Starting section ' + tar)
          this.doSceneActions(scene)
        }

        if (mode === 'input') {
          const inputValue = document.querySelector(`#if_r-choice-input-${choiceI}`).value
          if (inputValue === '') {
            // if (this.debug === true) this.showAlert("Empty input not allowed!");
          } else {
            choice.onclick = ''
            this.changeVariables(vars, inputValue)
            this.changeVariables(input, inputValue)
            if (actions) this.doActions(actions)
            this.switchSection(tar)
          }
        } else {
          choice.onclick = ''
          this.changeVariables(vars, choice.innerHTML)
          if (actions) this.doActions(actions)
          this.switchSection(tar)
        }
      }
    })
  }

  doSceneActions (scene) {
    if (this.debug) console.log('Doing relevant scene actions...')

    this.run.state.scene = scene

    const { music } = this.run.state.scene

    if (music) {
      try {
        // eslint-disable-next-line no-unused-vars
        const url = new URL(music)
        document.querySelector('#if_r-audio-source').src = url.href
        const player = document.querySelector('#if_r-audio-player')
        player.load()
        player.play()
        // .then(d => console.log("Playing audio now."))
        // .catch(e => console.log(e));
      } catch (e) {
        if (this.debug) console.log('Invalid URL.')
      }
    }
  }

  resetStory () {
    if (window.confirm('Restart the story? this is a beta feature.')) {
      this.loadStory(this.run.story, null, this.run.theme)
    }
  }

  showStatsDiv () {
    const statsDiv = document.querySelector(DOM.statsDivClass)
    statsDiv.style.display = 'block'
    statsDiv.style.width = '100%'

    this.sidebarListeners('set')
  }

  sidebarListeners (setting) {
    if (setting === 'set') {
      document.querySelector(`${DOM.statsDivId} .closebtn`).onclick = this.hideStatsDiv
      document.querySelector(DOM.undoButtonId).onclick = this.undoTurn
      document.querySelector(DOM.resetButtonId).onclick = this.resetStory.bind(this)
      document.querySelector(DOM.saveGameId).onclick = this.saveGame.bind(this)
      document.querySelector(DOM.uploadSaveFileId).onchange = this.uploadSaveFile.bind(this)
    } else if (setting === 'unset') {
      document.querySelector(`${DOM.statsDivClass} .closebtn`).onclick = ''
      document.querySelector(DOM.undoButtonId).onclick = ''
      document.querySelector(DOM.resetButtonId).onclick = ''
      document.querySelector(DOM.saveGameId).onclick = ''
    }
  }

  uploadSaveFile (e) {
    let file = e.target.files[0]
    const reader = new FileReader()
    reader.addEventListener('load', (event) => {
      // file.src = event.target.result
      const result = event.target.result
      const json = JSON.parse(result)
      this.run = Run.fromJson(json)
      this.loadStory(this.run.story, this.run, this.run.theme)
    })
    reader.readAsText(file)
  }

  saveGame (e) {
    if (!!this.run) {
      let saveJson = JSON.stringify(this.run)
      console.log(saveJson)
      const data = new Blob([saveJson], { type: 'application/json' })
      e.target.setAttribute('href', window.URL.createObjectURL(data))
    }
  }

  hideStatsDiv = () => {
    const statsDiv = document.querySelector(DOM.statsDivClass)
    statsDiv.style.display = 'none'
    statsDiv.style.width = '0'

    this.sidebarListeners('unset')
  }

  replaceHash (str, to) {
    return str.replace('#', to || '')
  }

  replaceDot (str, to) {
    return str.replace('.', to || '')
  }

  // unused
  generateHTML (story) {
    const {
      name,
      sections,
      // eslint-disable-next-line no-unused-vars
      passages
    } = story
    let wrapper = ''
    wrapper += `<h2>${name} - New Story</h2>`

    document.title = `${name} | IF`

    sections.forEach(section => {
      wrapper += this.generateHTMLForSection(section)
    })
    return wrapper
  }

  executeJs (text) {
    // eslint-disable-next-line no-eval
    return eval(text)
  }

  generateStatsHtml () {
    // Should generate html for stats section of the sidebar.
  }

  setStats (html) {
    document.querySelector(DOM.statsDivId).innerHTML = html
  }
}

/* eslint-enable no-eval */

export default Interpreter
