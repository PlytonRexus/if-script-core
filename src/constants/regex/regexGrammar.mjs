/* Grammar */
const grammar = {
  section: /ss>[a-zA-Z0-9`@"'-_:;\/\s!\*#\$\{\}]+?<ss/g,
  comment: /\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, // /\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*/ /\/\*(\*(?!\/)|[^*])*\*\//g
  passage: /pp>[a-zA-Z0-9"'-_:,\/\s!\*#;]+?<pp/g,
  title: /tt>[A-Za-z0-9 '\$\{\}]+?<tt/g,
  para: />>[a-zA-Z0-9"'-_:;\/\s!\*#\.\[\]\$\{\}]+?<</g, // One paragraph of text.
  choice: /ch>[a-zA-Z0-9"'-_:;\/\s!\*#\.\[\]\$\{\}]+?<ch/g, // One choice.
  choiceTarget: /\[\[[0-9]+\]\]/g,
  settings: /settings>[a-zA-Z0-9"'-_:;\/\s!\*#\.\$\{\}]+?<settings/,
  referrable: /@referrable (true)|(false)/,
  startAt: /@startAt [0-9]+/,
  fullTimer: /@fullTimer [0-9]+ \[\[\d+\]\]/,
  sectionSettings: /secset>[a-zA-Z0-9"'-_:;\/\s!\*#\.]+?<secset/,
  variable: /\$\{[a-zA-Z0-9=]+?\}/g,
  input: /__input/,
  secTimer: /@timer [0-9]+ \[\[\d+\]\]/,
  variableAssignment: /\$\{[a-zA-Z0-9]+?=[a-zA-Z0-9_ "'\(\)]+?\}/g,
  varValue: /[a-zA-Z0-9_ "\(\)]+/,
  setVarAsTarget: /\$\{__[a-zA-Z0-9_=]+?\}/g,
  html: /<\s*\w+[^>]*>(.*?)(<\s*\/\s*\w+>)|/g,
  scene: /scene>[a-zA-Z0-9"'-_:;@\/\s!\*#\$\{\}]+?<scene/gm
}

export default grammar
export { grammar }
