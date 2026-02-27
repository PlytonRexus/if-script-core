import index from '../../fixtures/story-sources/index.mjs'
import { fileURLToPath } from 'url'
import path from 'path'
import IFScript from '../../../src/IFScript.mjs'
import versions from '../../../src/constants/versions.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const story = {
  name: 'introduction',
  content: index.introduction,
  path: path.resolve(__dirname, '../../fixtures/stories/introduction.if')
}

function useStory (storyName) {
  story.name = storyName
  story.content = index[storyName]

  if (!story.content) {
    story.name = 'introduction'
    story.content = index.introduction
  }

  if (typeof document !== 'undefined' && document) {
    document.title = 'Testing ' + story.name.toUpperCase() + ' | IF Core'
  }
}

if (typeof window !== 'undefined' && window && window.location) {
  const url = new URL(window.location.href)
  const storyName = url.searchParams.get('story')
  if (storyName) useStory(storyName)
}

const parsedPromise = (async () => {
  const ifScript = new IFScript(versions.STREAM)
  await ifScript.init()
  try {
    const parsed = await ifScript.parse(story.content, story.path)
    console.log(JSON.stringify(parsed))
    return parsed
  } catch (error) {
    console.error('Parse error:', error)
    throw error
  }
})()

export default parsedPromise
