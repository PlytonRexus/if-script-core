import Interpreter from '../src/interpreters/custom/Interpreter.mjs'
import parsed from './parse.mjs'
import story from './previewer.mjs'

const interpreter = new Interpreter(null)

interpreter.loadStory(story, null, 'bricks')

export default interpreter
