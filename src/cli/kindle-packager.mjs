import fs from 'fs/promises'
import path from 'path'
import { createRequire } from 'module'
import { spawn } from 'child_process'
import { DEFAULT_CONVERTER_ORDER } from './kindle-config.mjs'

const require = createRequire(import.meta.url)
const SUPPORTED_CONVERTERS = ['auto', 'kindlepreviewer', 'calibre', 'html-to-mobi', 'mobi-zipper', 'none']

function probeCommand (command) {
  return new Promise((resolve) => {
    const lookup = process.platform === 'win32' ? 'where' : 'which'
    const child = spawn(lookup, [command], { stdio: 'ignore', shell: false })
    child.on('error', () => resolve(false))
    child.on('close', (code) => resolve(code === 0))
  })
}

function runCommand (command, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ['ignore', 'ignore', 'pipe'],
      shell: false
    })

    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf-8')
    })
    child.on('error', (error) => {
      resolve({ ok: false, stderr: error.message })
    })
    child.on('close', (code) => {
      resolve({ ok: code === 0, stderr })
    })
  })
}

function buildCandidates (requested, converterOrder = DEFAULT_CONVERTER_ORDER) {
  if (!SUPPORTED_CONVERTERS.includes(requested)) {
    throw new Error(`Unsupported Kindle converter "${requested}". Supported converters: ${SUPPORTED_CONVERTERS.join(', ')}`)
  }
  if (requested === 'none') return ['none']
  if (requested === 'auto') return [...converterOrder, 'none']
  return [requested]
}

async function probePackage (packageName) {
  try {
    require.resolve(packageName)
    return true
  } catch {
    return false
  }
}

async function runCalibreAdapter ({ opfPath, mobiOutputFile, outputDir }) {
  const available = await probeCommand('ebook-convert')
  if (!available) {
    return { available: false, errorCode: 'KINDLE_CONVERTER_UNAVAILABLE', detail: 'ebook-convert was not found on PATH.' }
  }
  const result = await runCommand('ebook-convert', [
    opfPath,
    mobiOutputFile,
    '--output-profile', 'kindle',
    '--mobi-file-type', 'both'
  ], outputDir)
  return result.ok
    ? { available: true, ok: true }
    : { available: true, ok: false, errorCode: 'KINDLE_CONVERTER_VALIDATION_FAILED', detail: result.stderr || 'ebook-convert failed.' }
}

async function runKindlePreviewerAdapter ({ opfPath, mobiOutputFile, outputDir }) {
  const command = process.env.KINDLE_PREVIEWER_CMD || 'kindlepreviewer'
  const available = process.env.KINDLE_PREVIEWER_CMD
    ? true
    : await probeCommand(command)
  if (!available) {
    return { available: false, errorCode: 'KINDLE_CONVERTER_UNAVAILABLE', detail: 'Kindle Previewer CLI was not found. Set KINDLE_PREVIEWER_CMD to override.' }
  }

  const args = process.env.KINDLE_PREVIEWER_ARGS
    ? process.env.KINDLE_PREVIEWER_ARGS
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => token
        .replaceAll('{opf}', opfPath)
        .replaceAll('{outputDir}', outputDir)
        .replaceAll('{mobi}', mobiOutputFile))
    : ['-convert', opfPath, '-output', outputDir]

  const result = await runCommand(command, args, outputDir)
  if (!result.ok) {
    return { available: true, ok: false, errorCode: 'KINDLE_CONVERTER_VALIDATION_FAILED', detail: result.stderr || 'Kindle Previewer conversion failed.' }
  }

  try {
    await fs.access(mobiOutputFile)
    return { available: true, ok: true }
  } catch {
    return { available: true, ok: false, errorCode: 'KINDLE_CONVERTER_VALIDATION_FAILED', detail: 'Kindle Previewer did not create the requested mobi output file.' }
  }
}

async function runPackageAdapter ({ packageName, opfPath, mobiOutputFile, outputDir, exportedNames }) {
  const available = await probePackage(packageName)
  if (!available) {
    return { available: false, errorCode: 'KINDLE_CONVERTER_UNAVAILABLE', detail: `Package "${packageName}" is not installed.` }
  }

  let moduleNamespace = null
  try {
    moduleNamespace = await import(packageName)
  } catch (error) {
    return { available: true, ok: false, errorCode: 'KINDLE_CONVERTER_VALIDATION_FAILED', detail: error.message }
  }

  const candidates = [
    moduleNamespace.default,
    ...exportedNames.map(name => moduleNamespace[name]).filter(Boolean)
  ]
  const fn = candidates.find(candidate => typeof candidate === 'function')
  if (!fn) {
    return { available: true, ok: false, errorCode: 'KINDLE_CONVERTER_VALIDATION_FAILED', detail: `Package "${packageName}" does not expose a supported conversion function.` }
  }

  try {
    await fn({
      input: opfPath,
      inputFile: opfPath,
      source: opfPath,
      output: mobiOutputFile,
      outputFile: mobiOutputFile,
      cwd: outputDir
    })
  } catch (error) {
    try {
      await fn(opfPath, mobiOutputFile, { cwd: outputDir })
    } catch (innerError) {
      return { available: true, ok: false, errorCode: 'KINDLE_CONVERTER_VALIDATION_FAILED', detail: innerError.message || error.message }
    }
  }

  try {
    await fs.access(mobiOutputFile)
    return { available: true, ok: true }
  } catch {
    return { available: true, ok: false, errorCode: 'KINDLE_CONVERTER_VALIDATION_FAILED', detail: `Package "${packageName}" did not create "${mobiOutputFile}".` }
  }
}

async function runAdapter (name, input) {
  if (name === 'none') return { available: true, ok: false, skipped: true }
  if (name === 'calibre') return runCalibreAdapter(input)
  if (name === 'kindlepreviewer') return runKindlePreviewerAdapter(input)
  if (name === 'html-to-mobi') {
    return runPackageAdapter({
      packageName: 'html-to-mobi',
      exportedNames: ['convert', 'htmlToMobi'],
      ...input
    })
  }
  if (name === 'mobi-zipper') {
    return runPackageAdapter({
      packageName: 'mobi-zipper',
      exportedNames: ['convert', 'zipToMobi', 'mobiZipper'],
      ...input
    })
  }
  return { available: false, errorCode: 'KINDLE_CONVERTER_UNAVAILABLE', detail: `Unsupported converter "${name}".` }
}

async function packageKindleBundle ({
  outputDir,
  opfPath,
  mobiOutputFile,
  converter = 'auto',
  converterOrder = DEFAULT_CONVERTER_ORDER
}) {
  const attempted = []
  const candidates = buildCandidates(converter, converterOrder)
  for (const candidate of candidates) {
    const result = await runAdapter(candidate, { outputDir, opfPath, mobiOutputFile })
    attempted.push({
      converter: candidate,
      available: result.available === true,
      ok: result.ok === true,
      skipped: result.skipped === true,
      errorCode: result.errorCode || null,
      detail: result.detail || null
    })

    if (result.skipped === true) {
      return {
        status: 'skipped',
        chosen: 'none',
        outputFile: null,
        attempted
      }
    }
    if (result.available === false) continue
    if (result.ok === true) {
      return {
        status: 'success',
        chosen: candidate,
        outputFile: mobiOutputFile,
        attempted
      }
    }
    return {
      status: 'failed',
      chosen: candidate,
      outputFile: null,
      attempted
    }
  }

  return {
    status: 'unavailable',
    chosen: null,
    outputFile: null,
    attempted
  }
}

export {
  SUPPORTED_CONVERTERS,
  buildCandidates,
  packageKindleBundle
}
