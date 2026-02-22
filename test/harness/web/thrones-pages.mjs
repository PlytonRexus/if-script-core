import Story from '../../../src/models/Story.mjs'
import IFScript from '../../../src/IFScript.mjs'

function resolveThemeFromUrl () {
  if (typeof window === 'undefined' || !window.location) return 'cinematic'
  const url = new URL(window.location.href)
  const theme = url.searchParams.get('theme')
  if (theme === 'cinematic' || theme === 'literary-default') return theme
  return 'cinematic'
}

function renderError (error) {
  const target = document.querySelector('#if_r-exception-area')
  if (!target) return
  const message = error && error.message ? error.message : String(error)
  target.innerHTML = `<code>${message}</code>`
}

;(async function runThronesPages () {
  try {
    const ifScript = new IFScript('STREAM')
    await ifScript.init()
    const runtime = await ifScript.createRuntime({ debug: false })
    runtime.mount('#if_r-output-area')

    const storyUrl = new URL('./thrones.json', document.baseURI).href
    const response = await fetch(storyUrl)
    if (!response.ok) {
      throw new Error(`Failed to load story JSON: HTTP ${response.status}`)
    }

    const payload = await response.json()
    const story = Story.fromJson(payload)
    const theme = resolveThemeFromUrl()

    runtime.start(story, {
      theme,
      presentationMode: theme === 'cinematic' ? 'cinematic' : 'literary',
      resume: false
    })
  } catch (error) {
    renderError(error)
    console.error(error)
  }
})()
