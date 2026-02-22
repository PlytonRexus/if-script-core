import fs from 'fs/promises'
import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outputDir = path.resolve(root, 'dist')

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
  await run(process.execPath, ['bin/index.mjs', 'check', '-i', 'test/fixtures/stories/thrones-main.if'])
  await run(process.execPath, ['test/harness/story-tools/validate-thrones-graph.mjs'])
  await run(process.execPath, ['node_modules/webpack/bin/webpack.js', '--config', 'config/webpack.pages.thrones.js'])
  await run(process.execPath, [
    'bin/index.mjs',
    'compile',
    '-i',
    'test/fixtures/stories/thrones-main.if',
    '-o',
    'dist/thrones.json'
  ])

  await fs.writeFile(path.resolve(outputDir, '.nojekyll'), '', 'utf-8')

  process.stdout.write('Built Thrones Pages artifacts in dist/\n')
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`)
  process.exit(1)
})
