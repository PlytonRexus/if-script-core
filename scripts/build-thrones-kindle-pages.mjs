import fs from 'fs/promises'
import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outputDir = path.resolve(root, 'dist/kindle')

function run (command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: 'inherit',
      shell: false
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) return resolve()
      reject(new Error(`Command failed (${code}): ${command} ${args.join(' ')}`))
    })
  })
}

async function main () {
  await run(process.execPath, ['bin/index.mjs', 'check', '-i', 'test/fixtures/stories/thrones-main.if', '--profile', 'kindle-any'])
  await run(process.execPath, ['test/harness/story-tools/validate-thrones-graph.mjs'])
  await fs.rm(outputDir, { recursive: true, force: true })
  await run(process.execPath, [
    'bin/index.mjs',
    'compile',
    '-i',
    'test/fixtures/stories/thrones-main.if',
    '--target',
    'kindle-html',
    '--profile',
    'kindle-any',
    '--output-dir',
    'dist/kindle'
  ])

  await fs.writeFile(path.resolve(outputDir, '.nojekyll'), '', 'utf-8')
  process.stdout.write('Built Thrones Kindle artifacts in dist/kindle/\n')
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`)
  process.exit(1)
})
