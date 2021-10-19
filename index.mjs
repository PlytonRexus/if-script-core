import IFScript from './src/IFScript.mjs'

/**
 * Adapted from [Universal Module Definition Patterns](https://github.com/umdjs/umd)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory()
  } else if (!!root) {
    // Browser globals (root is window)
    root.IF = factory()
  }
})(typeof self !== 'undefined' ? self : this, async function () {
  return IFScript
})

export default IFScript
