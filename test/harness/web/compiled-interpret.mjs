import Story from '../../../src/models/Story.mjs'
import IFScript from '../../../src/IFScript.mjs'

let runtime

;(async function () {
  const ifScript = new IFScript('STREAM')
  await ifScript.init()
  runtime = await ifScript.createRuntime({ debug: true })

  let theme = 'literary-default'

  function useTheme (storyName) {
    if (storyName === 'cinematic' || storyName === 'literary-default') {
      theme = storyName
    }
  }

  if (typeof window !== 'undefined' && !!window && !!window.location) {
    const url = new URL(window.location.href)
    const themeName = url.searchParams.get('theme')
    if (themeName) useTheme(themeName)
  }

  fetch('/test/fixtures/compiled/introduction.json')
    .then(res => res.json())
    .then(str => {
      try {
        runtime.mount('#if_r-output-area')
        const story = Story.fromJson(str)
        console.log(story)
        runtime.start(story, {
          theme,
          presentationMode: theme === 'cinematic' ? 'cinematic' : 'literary',
          resume: false
        })
      } catch (err) {
        console.error(err)
        const exceptionArea = document.querySelector('#if_r-exception-area')
        exceptionArea.innerHTML += '<br><code>' + err.toString() + '</code>'
      }
    })
})()

export default runtime
