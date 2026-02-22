import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import IFScript from '../../index.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.resolve(__dirname, '..')
const vendorDir = path.resolve(srcDir, '../node_modules')

async function preview (argv) {
  const inputFile = path.resolve(process.cwd(), argv.i)
  const port = argv.port || 3001
  const theme = argv.theme || 'literary-default'
  const clients = new Set()
  const fileWatchers = new Map()
  let reloadTimer = null
  const ifscript = new IFScript('STREAM')
  await ifscript.init()

  const normalizeWatchPath = (filePath) => {
    if (!filePath || typeof filePath !== 'string') return null
    let normalized = filePath
    if (/^\/[A-Za-z]:\//.test(normalized)) normalized = normalized.slice(1)
    return path.normalize(normalized)
  }

  const emitParsed = (parsed) => {
    const payload = JSON.stringify(parsed)
    for (const client of clients) {
      client.write(`data: ${payload}\n\n`)
    }
  }

  const emitError = (message) => {
    for (const client of clients) {
      client.write(`event: error\ndata: ${JSON.stringify(message)}\n\n`)
    }
  }

  const syncFileWatchers = () => {
    const watchedPaths = new Set([normalizeWatchPath(inputFile)])
    const deps = ifscript.moduleLoader ? ifscript.moduleLoader.getCacheStats().paths : []
    deps.forEach(dep => {
      const normalized = normalizeWatchPath(dep)
      if (normalized) watchedPaths.add(normalized)
    })

    for (const [watchedPath, watcher] of fileWatchers.entries()) {
      if (!watchedPaths.has(watchedPath)) {
        watcher.close()
        fileWatchers.delete(watchedPath)
      }
    }

    for (const watchedPath of watchedPaths.values()) {
      if (fileWatchers.has(watchedPath)) continue
      try {
        const watcher = fs.watch(watchedPath, { persistent: false }, () => scheduleReload())
        fileWatchers.set(watchedPath, watcher)
      } catch (err) {
        console.warn(`Preview watch error for ${watchedPath}: ${err.message}`)
      }
    }
  }

  async function parseStory () {
    const content = await fs.promises.readFile(inputFile, 'utf-8')
    if (ifscript.moduleLoader) ifscript.moduleLoader.clearCache()
    return await ifscript.parse(content, inputFile)
  }

  async function reloadAndBroadcast () {
    try {
      const parsed = await parseStory()
      syncFileWatchers()
      emitParsed(parsed)
    } catch (err) {
      emitError(err.message)
    }
  }

  function scheduleReload () {
    if (reloadTimer) clearTimeout(reloadTimer)
    reloadTimer = setTimeout(() => {
      reloadTimer = null
      reloadAndBroadcast()
    }, 50)
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`)

    // SSE endpoint
    if (url.pathname === '/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      })
      res.write(':\n\n')
      clients.add(res)
      req.on('close', () => clients.delete(res))
      return
    }

    // Serve showdown as a synthetic ES module wrapping the UMD build
    if (url.pathname === '/vendor/showdown.js') {
      const showdownPath = path.join(vendorDir, 'showdown/dist/showdown.js')
      try {
        const umd = await fs.promises.readFile(showdownPath, 'utf-8')
        const esm = `const __m = { exports: {} };\n(function (module, exports) {\n${umd}\n}(__m, __m.exports));\nexport default __m.exports;\n`
        res.writeHead(200, { 'Content-Type': 'text/javascript' })
        res.end(esm)
      } catch { res.writeHead(404); res.end() }
      return
    }

    // Serve src/** for native ES module imports
    if (url.pathname.startsWith('/src/')) {
      const filePath = path.join(srcDir, url.pathname.slice(5))
      try {
        const content = await fs.promises.readFile(filePath, 'utf-8')
        const ext = path.extname(filePath)
        if (ext === '.css') {
          // CSS requested as a module script (e.g. dynamic import() in Interpreter)
          // — serve a JS wrapper that injects the styles, otherwise serve plain CSS.
          if (req.headers['sec-fetch-dest'] === 'script') {
            const js = `const __s = document.createElement('style');\n__s.textContent = ${JSON.stringify(content)};\ndocument.head.appendChild(__s);\nexport default __s;\n`
            res.writeHead(200, { 'Content-Type': 'text/javascript' })
            res.end(js)
          } else {
            res.writeHead(200, { 'Content-Type': 'text/css' })
            res.end(content)
          }
        } else {
          res.writeHead(200, { 'Content-Type': 'text/javascript' })
          res.end(content)
        }
      } catch { res.writeHead(404); res.end() }
      return
    }

    // Main page
    let parsed
    try { parsed = await parseStory() } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/html' })
      res.end(`<pre>Parse error:\n${err.message}</pre>`)
      return
    }

    const html = buildHtml(parsed, theme, port)
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(html)
  })

  syncFileWatchers()

  server.listen(port, '127.0.0.1', () => {
    const serverUrl = `http://localhost:${port}`
    console.log(`\nIF-Script preview: ${serverUrl}`)
    console.log(`Watching: ${inputFile}\n`)
    import('child_process').then(({ exec }) =>
      exec(`xdg-open ${serverUrl} 2>/dev/null || open ${serverUrl} 2>/dev/null || start ${serverUrl}`)
    )
  })
}

function buildHtml (story, theme, port) {
  const runtimeTheme = (theme === 'cinematic' || theme === 'literary-default') ? theme : 'literary-default'
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${story.title || 'IF Preview'}</title>
  <script type="importmap">{"imports": {"showdown": "/vendor/showdown.js"}}</script>
</head>
<body>
  <div id="root">
    <div id="if_r-output-area"></div>
    <div id="if_r-exception-area"></div>
  </div>
  <script type="module">
    import IFScript from '/src/IFScript.mjs'
    import Story from '/src/models/Story.mjs'

    const storyJson = ${JSON.stringify(story)}
    const theme = ${JSON.stringify(runtimeTheme)}
    const ifScript = new IFScript('STREAM')
    await ifScript.init()
    const runtime = await ifScript.createRuntime({ debug: true })
    runtime.mount('#if_r-output-area')

    function render (json) {
      document.querySelector('#if_r-exception-area').innerHTML = ''
      try {
        runtime.start(Story.fromJson(json), { theme, presentationMode: theme === 'cinematic' ? 'cinematic' : 'literary' })
      } catch (err) {
        document.querySelector('#if_r-exception-area').innerHTML =
          '<code>' + err.message + '</code>'
      }
    }

    render(storyJson)

    const es = new EventSource('/events')
    es.addEventListener('message', (e) => render(JSON.parse(e.data)))
    es.addEventListener('error', (e) => {
      document.querySelector('#if_r-exception-area').innerHTML =
        '<code>Parse error: ' + JSON.parse(e.data) + '</code>'
    })
  </script>
</body>
</html>`
}

export default preview
