import Operators from '../../constants/custom/operators.mjs'
import showdown from 'showdown'

class InterpreterUtils {
  /**
   * @param {Action} action
   * @param {string|number} left
   * @param {string|number} right
   *
   * @returns {boolean|number|string}
   */
  solveAction (action, left, right) {
    let result
    switch (action.operator) {
      case Operators.ADDITION:
        result = left + right
        break
      case Operators.SUBTRACTION:
        result = left - right
        break
      case Operators.MULTIPLICATION:
        result = left * right
        break
      case Operators.DIVISION:
        result = left / right
        break
      case Operators.MODULO:
        result = left % right
        break
      case Operators.EQUAL:
        result = left === right
        break
      case Operators.NOT_EQUAL:
        result = left !== right
        break
      case Operators.GREATER:
        result = left > right
        break
      case Operators.LESS:
        result = left < right
        break
      case Operators.GEQUAL:
        result = left >= right
        break
      case Operators.LEQUAL:
        result = left <= right
        break
      case Operators.LOGICAL_OR:
        result = left || right
        break
      case Operators.LOGICAL_AND:
        result = left && right
        break
    }

    return result
  }

  /**
   * @param {string} text
   * @return {string}
   */
  formatText (text) {
    if (!showdown) return text
    const converter = new showdown.Converter()
    return converter.makeHtml(text)
  }
}

export default InterpreterUtils
