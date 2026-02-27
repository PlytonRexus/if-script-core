import InputStream from '../../../src/parsers/custom/stream/InputStream.mjs'
import TokenStream from '../../../src/parsers/custom/stream/TokenStream.mjs'
import Parser from '../../../src/parsers/custom/parser/Parser.mjs'

const storyText = `section__
  numbers = [1, 2, 3]
__section`

;(async function runDebugArray () {
  console.log('Story text:')
  console.log(storyText)
  console.log('\n--- Parsing ---\n')

  const is = new InputStream(storyText)
  const ts = new TokenStream(is)

  // Inject debug logging
  const originalNext = ts.next.bind(ts)
  const originalPeek = ts.peek.bind(ts)

  let callCount = 0
  ts.next = function () {
    const tok = originalNext()
    console.log(`next() #${++callCount}:`, JSON.stringify({ type: tok?.type, symbol: tok?.symbol, line: tok?.line, col: tok?.col }))
    return tok
  }

  ts.peek = function () {
    const tok = originalPeek()
    console.log('peek():', JSON.stringify({ type: tok?.type, symbol: tok?.symbol, line: tok?.line, col: tok?.col }))
    return tok
  }

  try {
    const parser = new Parser(ts)
    const parsed = await parser.parseStory()
    console.log('\n✓ Parsed successfully!')
    console.log('Sections:', parsed.sections.length)
  } catch (error) {
    console.log('\n✗ Parse failed:', error.message)
    console.log('Stack:', error.stack.split('\n').slice(0, 10).join('\n'))
  }
})()
