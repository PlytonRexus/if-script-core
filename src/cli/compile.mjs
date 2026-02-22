import path from 'path'
import fs from 'fs'
import IFScript from '../../index.mjs'

async function compile (argv) {
  const cwd = process.cwd()
  const inputArg = argv.i || argv['input-file']
  const outputArg = argv.o || argv['output-file']

  const inputPath = path.resolve(cwd, inputArg)
  const outputPath = outputArg
    ? path.resolve(cwd, outputArg)
    : path.resolve(cwd, './out.json')

  const content = await fs.promises.readFile(inputPath, 'utf-8')
  const ifscript = new IFScript('STREAM')
  await ifscript.init()
  const parsed = await ifscript.parse(content, inputPath)

  await fs.promises.writeFile(outputPath, JSON.stringify(parsed))
  console.log('Done.')
  console.log('Compiled to', outputPath)
}

export default compile
