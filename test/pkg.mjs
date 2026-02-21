import IFScript from '../index.mjs'
import index from './examples/index.mjs'

let interpreter

;(async function () {
  const ifscript = new IFScript('STREAM')
  await ifscript.init()
  interpreter = ifscript.interpreter

  const story = {
    name: 'introduction',
    content: index.introduction,
    path: '/test/examples-if/introduction.if'
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

  const theme = {
    name: 'bricks'
  }

  function useTheme (storyName) {
    theme.name = storyName

    if (!theme.name) {
      theme.name = 'bricks'
    }
  }

  let exceptionArea
  if (typeof window !== 'undefined' && !!window && !!window.location) {
    const url = new URL(window.location.href)
    const themeName = url.searchParams.get('theme')
    if (themeName) useTheme(themeName)
    exceptionArea = document.querySelector('#if_r-exception-area')
  }

  console.log(parsed)
  try {
    interpreter.loadStory(parsed, null, theme.name)
  } catch (err) {
    if (typeof document !== 'undefined' && !!document) { exceptionArea.innerHTML += '<br><code>' + JSON.stringify(err) + '</code>' }
  }
})()

export default interpreter
