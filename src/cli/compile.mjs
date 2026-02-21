import path from 'path'
import fs from 'fs'
import InputStream from '../parsers/custom/stream/InputStream.mjs'
import TokenStream from '../parsers/custom/stream/TokenStream.mjs'
import Parser from '../parsers/custom/parser/Parser.mjs'

async function compile (argv) {
  const cwd = process.cwd()
  let i = argv.i
  let o = argv.o

  i = path.resolve(cwd, i)

  if (o) o = path.resolve(cwd, o)
  else o = path.resolve(cwd, './out.json')

  const is = new InputStream(i)
  let parsed

  await is.init()

  const ts = new TokenStream(is)
  parsed = new Parser(ts).parseStory()

  // console.log(parsed)

  if (o) {
    await fs.promises.writeFile(o, JSON.stringify(parsed))
    console.log('Done.')
    console.log('Compiled to', o)
  }
}

export default compile
