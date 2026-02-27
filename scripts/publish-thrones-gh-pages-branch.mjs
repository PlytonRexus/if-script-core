import fs from 'fs/promises'
import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const distDir = path.resolve(root, 'dist')
const remoteName = process.env.PAGES_REMOTE || 'origin'
const branchName = process.env.PAGES_BRANCH || 'gh-pages'

function run (command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const stdio = options.captureStdout
      ? ['ignore', 'pipe', 'inherit']
      : (options.stdio || 'inherit')
    const child = spawn(command, args, {
      cwd: options.cwd || root,
      stdio,
      shell: false
    })

    let stdout = ''
    if (options.captureStdout && child.stdout) {
      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString('utf-8')
      })
    }

    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Command failed (${code}): ${command} ${args.join(' ')}`))
      }
      resolve(stdout.trim())
    })
  })
}

async function main () {
  await run(process.execPath, ['scripts/build-thrones-pages.mjs'])
  await fs.access(path.resolve(distDir, 'index.html'))
  await fs.access(path.resolve(distDir, 'thrones.json'))

  const remoteUrl = await run('git', ['config', '--get', `remote.${remoteName}.url`], { captureStdout: true })
  if (!remoteUrl) throw new Error(`Remote "${remoteName}" is not configured`)

  await fs.rm(path.resolve(distDir, '.git'), { recursive: true, force: true })
  await run('git', ['init'], { cwd: distDir })
  await run('git', ['checkout', '-B', branchName], { cwd: distDir })
  await run('git', ['add', '--all'], { cwd: distDir })

  const changes = await run('git', ['status', '--porcelain'], { cwd: distDir, captureStdout: true })
  if (!changes) {
    process.stdout.write('No publishable changes detected in dist/.\n')
    return
  }

  await run('git', [
    '-c',
    'user.name=if-script-pages-bot',
    '-c',
    'user.email=if-script-pages@example.invalid',
    'commit',
    '-m',
    `Publish Thrones ${new Date().toISOString()}`
  ], { cwd: distDir })

  const existingRemotesRaw = await run('git', ['remote'], { cwd: distDir, captureStdout: true })
  const existingRemotes = existingRemotesRaw
    .split('\n')
    .map(name => name.trim())
    .filter(Boolean)

  if (existingRemotes.includes(remoteName)) {
    await run('git', ['remote', 'remove', remoteName], { cwd: distDir })
  }

  await run('git', ['remote', 'add', remoteName, remoteUrl], { cwd: distDir })
  await run('git', ['push', '--force', remoteName, `${branchName}:${branchName}`], { cwd: distDir })

  process.stdout.write(`Published dist/ as branch-root content to ${remoteName}/${branchName}\n`)
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`)
  process.exit(1)
})
