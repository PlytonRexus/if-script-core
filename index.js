const { IF } = require('./src/interpreter/if_r-terp')

module.exports = {
    parser: require('./src/parser/if-parser'),
    interpreter: IF.methods,
    dom: IF.dom,
    grammar: IF.grammar,
    DEBUG: IF.DEBUG
}
