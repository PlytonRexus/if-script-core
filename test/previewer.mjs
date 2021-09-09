import { readFileSync } from 'fs'
import Story from '../src/models/Story.mjs'

const str = readFileSync('../examples/introduction.json')
const story = Story.fromJson(str.toString())

export default story
