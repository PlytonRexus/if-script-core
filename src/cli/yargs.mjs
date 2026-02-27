import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import compile from './compile.mjs'
import preview from './preview.mjs'
import check from './check.mjs'

const yargsc = yargs(hideBin(process.argv))

yargsc
  .usage('\nUsage: ifs compile <entry_point> [-o <output_file>]')
  .option('o', {
    alias: 'output-file',
    describe: 'Optional. The name of the output file. Default is out.json',
    type: 'path',
    demandOption: false
  })
  .help(true)

yargsc.version('1.0.1')

yargsc.command({
  command: 'compile',
  describe: 'Compile if script files',
  builder: {
    'input-file': {
      alias: 'i',
      describe: 'The name of the input file. Default is out.json',
      type: 'string',
      demandOption: true
    },
    'output-file': {
      alias: 'o',
      describe: 'Optional. The name of the output file. Default is out.json',
      type: 'string',
      demandOption: false
    },
    target: {
      describe: 'Compile output target',
      choices: ['json', 'kindle-html'],
      default: 'json'
    },
    profile: {
      describe: 'Compile profile (kindle-any, kindle-strict for kindle target)',
      choices: ['default', 'kindle-any', 'kindle-strict'],
      default: 'default'
    },
    'output-dir': {
      describe: 'Output directory (required for kindle-html target)',
      type: 'string',
      demandOption: false
    },
    'report-file': {
      describe: 'Optional report file path for kindle-html target',
      type: 'string',
      demandOption: false
    }
  },
  handler: function (argv) {
    process.stdout.write('Compiling... ')
    return compile(argv)
  }
})

yargsc.command({
  command: 'preview',
  describe: 'Preview an IF-Script story in the browser with hot reload',
  builder: {
    'input-file': { alias: 'i', describe: 'Path to .if story file', type: 'string', demandOption: true },
    theme: { alias: 't', describe: 'Theme name (default: literary-default)', type: 'string', default: 'literary-default' },
    port: { alias: 'p', describe: 'Server port (default: 3001)', type: 'number', default: 3001 }
  },
  handler: (argv) => preview(argv)
})

yargsc.command({
  command: 'check',
  describe: 'Run static diagnostics for an IF-Script story',
  builder: {
    'input-file': { alias: 'i', describe: 'Path to .if story file', type: 'string', demandOption: true },
    json: { describe: 'Emit diagnostics as JSON', type: 'boolean', default: false },
    profile: {
      describe: 'Diagnostics profile',
      choices: ['default', 'kindle-any', 'kindle-strict'],
      default: 'default'
    }
  },
  handler: (argv) => check(argv)
})

export default yargsc
