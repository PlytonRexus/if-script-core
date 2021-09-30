import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import compile from './compile.mjs'

const yargsc = yargs(hideBin(process.argv))

const usage = "\nUsage: ifs compile <entry_point> [-o <output_file>]"

const options = yargsc
  .usage(usage)
  .option("o", {
  	alias:"output-file",
  	describe: 'Optional. The name of the output file. Default is out.json',
  	type: 'path',
  	demandOption: false
  })
  .help(true)
  .argv

yargsc.version("1.0.1")

yargsc.command({
	command: "compile",
	describe: "Compile if script files",
	builder:
	{
		'input-file':
		{
			alias: 'i',
			describe: "The name of the input file. Default is out.json",
			type: "string",
			demandOption: true
		},
		'output-file':
		{
			alias: 'o',
			describe: "Optional. The name of the output file. Default is out.json",
			type: "string",
			demandOption: false
		}
	},
	handler: function(argv) {
		process.stdout.write('Compiling... ')
		compile(argv)
	}
})

export default yargsc
