import { IF as terp } from './src/interpreters/regex-nearley/if_r-terp.mjs'
import parser from './src/parsers/nearley/if-parser.mjs'

import IFScript from './src/IFScript.mjs'

;(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory()
  } else {
    // Browser globals (root is window)
    root.IF = factory()
  }
})(typeof self !== 'undefined' ? self : this, async function () {
  return {
    IFScript,
    parser,
    interpreter: terp,
    ...terp
  }
})
