import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import IFScript from '../../index.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.resolve(__dirname, '..')

async function preview (argv) {
  const inputFile = path.resolve(process.cwd(), argv.i)
  const port = argv.port || 3001
  const theme = argv.theme || 'bricks'
  const clients = new Set()

  async function parseStory () {
    const content = await fs.promises.readFile(inputFile, 'utf-8')
    const ifscript = new IFScript('STREAM')
    await ifscript.init()
    return await ifscript.parse(content, inputFile)
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

    // Serve src/** for native ES module imports
    if (url.pathname.startsWith('/src/')) {
      const filePath = path.join(srcDir, url.pathname.slice(5))
      try {
        const content = await fs.promises.readFile(filePath, 'utf-8')
        const ext = path.extname(filePath)
        const mime = ext === '.css' ? 'text/css' : 'text/javascript'
        res.writeHead(200, { 'Content-Type': mime })
        res.end(content)
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

  // Watch the story file for changes
  fs.watch(inputFile, { persistent: false }, async () => {
    try {
      const parsed = await parseStory()
      const payload = JSON.stringify(parsed)
      for (const client of clients) {
        client.write(`data: ${payload}\n\n`)
      }
    } catch (err) {
      for (const client of clients) {
        client.write(`event: error\ndata: ${JSON.stringify(err.message)}\n\n`)
      }
    }
  })

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
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${story.title || 'IF Preview'}</title>
  <link rel="stylesheet" href="/src/themes/${theme}.css">
</head>
<body>
  <div id="root">
    <div id="if_r-output-area"></div>
    <div id="if_r-exception-area"></div>
  </div>
  <script type="module">
    import Interpreter from '/src/interpreters/custom/Interpreter.mjs'

    const story = ${JSON.stringify(story)}
    const theme = ${JSON.stringify(theme)}
    const interpreter = new Interpreter(null)

    function render (s) {
      document.querySelector('#if_r-output-area').innerHTML = ''
      document.querySelector('#if_r-exception-area').innerHTML = ''
      try { interpreter.loadStory(s, null, theme) } catch (err) {
        document.querySelector('#if_r-exception-area').innerHTML =
          '<code>' + err.message + '</code>'
      }
    }

    render(story)

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
