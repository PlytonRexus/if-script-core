import { IF as terp } from './src/interpreter/if_r-terp'
import parser from './src/parser/if-parser'

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
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    parser,
    interpreter: terp,
    ...terp
  }
})
