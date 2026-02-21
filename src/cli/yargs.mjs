import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import compile from './compile.mjs'
import preview from './preview.mjs'

const yargsc = yargs(hideBin(process.argv))

const usage = '\nUsage: ifs compile <entry_point> [-o <output_file>]'

const options = yargsc
  .usage(usage)
  .option('o', {
  	alias: 'output-file',
  	describe: 'Optional. The name of the output file. Default is out.json',
  	type: 'path',
  	demandOption: false
  })
  .help(true)
  .argv

yargsc.version('1.0.1')

yargsc.command({
  command: 'compile',
  describe: 'Compile if script files',
  builder:
	{
	  'input-file':
		{
		  alias: 'i',
		  describe: 'The name of the input file. Default is out.json',
		  type: 'string',
		  demandOption: true
		},
	  'output-file':
		{
		  alias: 'o',
		  describe: 'Optional. The name of the output file. Default is out.json',
		  type: 'string',
		  demandOption: false
		}
	},
  handler: function (argv) {
    process.stdout.write('Compiling... ')
    compile(argv)
  }
})

yargsc.command({
  command: 'preview',
  describe: 'Preview an IF-Script story in the browser with hot reload',
  builder: {
    'input-file': { alias: 'i', describe: 'Path to .if story file', type: 'string', demandOption: true },
    theme: { alias: 't', describe: 'Theme name (default: bricks)', type: 'string', default: 'bricks' },
    port: { alias: 'p', describe: 'Server port (default: 3001)', type: 'number', default: 3001 }
  },
  handler: (argv) => preview(argv)
})

export default yargsc
