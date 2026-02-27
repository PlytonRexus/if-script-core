import path from 'path'
import fs from 'fs'
import IFScript from '../../index.mjs'
import compileKindle from './compile-kindle.mjs'
import {
  DEFAULT_PROFILE,
  KINDLE_ANY_PROFILE,
  KINDLE_PROFILES,
  isKindleProfile
} from './kindle-profile.mjs'

const TARGET_JSON = 'json'
const TARGET_KINDLE_HTML = 'kindle-html'
const SUPPORTED_TARGETS = [TARGET_JSON, TARGET_KINDLE_HTML]

async function compile (argv) {
  const cwd = process.cwd()
  const inputArg = argv.i || argv['input-file']
  const outputArg = argv.o || argv['output-file']
  const targetArg = String(argv.target || TARGET_JSON)
  let profileArg = String(argv.profile || DEFAULT_PROFILE)
  const outputDirArg = argv['output-dir']
  const reportFileArg = argv['report-file']

  const inputPath = path.resolve(cwd, inputArg)
  if (!SUPPORTED_TARGETS.includes(targetArg)) {
    throw new Error(`Unsupported compile target "${targetArg}". Supported targets: ${SUPPORTED_TARGETS.join(', ')}`)
  }

  if (targetArg === TARGET_JSON && profileArg !== DEFAULT_PROFILE) {
    throw new Error('Profile option is only supported when --target kindle-html is used.')
  }

  if (targetArg === TARGET_KINDLE_HTML) {
    if (profileArg === DEFAULT_PROFILE) profileArg = KINDLE_ANY_PROFILE
    if (!isKindleProfile(profileArg)) {
      throw new Error(`Unsupported Kindle profile "${profileArg}". Supported profiles: ${KINDLE_PROFILES.join(', ')}`)
    }
    if (!outputDirArg) {
      throw new Error('Kindle compile target requires --output-dir.')
    }
  }

  const content = await fs.promises.readFile(inputPath, 'utf-8')
  const ifscript = new IFScript('STREAM')
  await ifscript.init()
  const parsed = await ifscript.parse(content, inputPath)

  if (targetArg === TARGET_JSON) {
    const outputPath = outputArg
      ? path.resolve(cwd, outputArg)
      : path.resolve(cwd, './out.json')
    await fs.promises.writeFile(outputPath, JSON.stringify(parsed))
    console.log('Done.')
    console.log('Compiled to', outputPath)
    return
  }

  const outputDir = path.resolve(cwd, outputDirArg)
  const reportFile = reportFileArg
    ? path.resolve(cwd, reportFileArg)
    : path.resolve(outputDir, 'kindle-report.json')

  const result = await compileKindle({
    story: parsed,
    inputPath,
    outputDir,
    reportFile,
    profile: profileArg
  })

  console.log('Done.')
  console.log('Compiled Kindle HTML to', result.outputDir)
  console.log('Kindle report written to', result.reportFile)
}

export default compile
