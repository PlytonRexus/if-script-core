import Interpreter from '../src/interpreters/custom/Interpreter.mjs'
import parsed from './parse.mjs'

const interpreter = new Interpreter(null)
interpreter.loadStory(parsed, null, 'bricks')

export default interpreter
