import InputStream from '../src/parsers/custom/stream/InputStream.mjs'
import TokenStream from '../src/parsers/custom/stream/TokenStream.mjs'
import Parser from '../src/parsers/custom/parser/Parser.mjs'
import index from './examples/index.mjs'

const ts = new TokenStream(new InputStream(index.introduction))

const parsed = new Parser(ts).parseStory()
console.log(JSON.stringify(parsed))

export default parsed
