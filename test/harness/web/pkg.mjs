import IFScript from '../../../index.mjs'
import index from '../../fixtures/story-sources/index.mjs'

let runtime

;(async function () {
  const ifscript = new IFScript('STREAM')
  await ifscript.init()
  runtime = await ifscript.createRuntime({ debug: true })

  const story = {
    name: 'introduction',
    content: index.introduction,
    path: '/test/fixtures/stories/introduction.if'
  }

  function useStory (storyName) {
    story.name = storyName
    story.content = index[storyName]

    if (!story.content) {
      story.name = 'introduction'
      story.content = index.introduction
    }

    if (typeof document !== 'undefined' && !!document) { document.title = 'Testing ' + story.name.toUpperCase() + ' | IF Core' }
  }

  if (typeof window !== 'undefined' && !!window && !!window.location) {
    const url = new URL(window.location.href)
    const storyName = url.searchParams.get('story')
    if (storyName) useStory(storyName)

    localStorage.setItem('IF_DEBUG', 'true')
  }

  const parsed = await ifscript.parse(story.content, story.path)

  let theme = 'literary-default'

  let exceptionArea
  if (typeof window !== 'undefined' && !!window && !!window.location) {
    const url = new URL(window.location.href)
    const themeName = url.searchParams.get('theme')
    if (themeName === 'cinematic' || themeName === 'literary-default') theme = themeName
    exceptionArea = document.querySelector('#if_r-exception-area')
  }

  console.log(parsed)
  try {
    runtime.mount('#if_r-output-area')
    runtime.start(parsed, {
      theme,
      presentationMode: theme === 'cinematic' ? 'cinematic' : 'literary',
      resume: false
    })
  } catch (err) {
    if (typeof document !== 'undefined' && !!document) { exceptionArea.innerHTML += '<br><code>' + JSON.stringify(err) + '</code>' }
  }
})()

export default runtime
