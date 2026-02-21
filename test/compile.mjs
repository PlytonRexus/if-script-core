import InputStream from '../src/parsers/custom/stream/InputStream.mjs'
import TokenStream from '../src/parsers/custom/stream/TokenStream.mjs'
import Parser from '../src/parsers/custom/parser/Parser.mjs'
import index from './examples/index.mjs'

let story = {
	name: 'introduction',
	content: index.introduction,
	path: '/home/mihir/dev/IF/if-script-core/test/examples-if/introduction.if'
}

function useStory(storyName) {
	story.name = storyName
	story.content = index[storyName]

	if (!story.content) {
		story.name = 'introduction'
		story.content = index.introduction
	}

	if (typeof document !== 'undefined' && !!document)
	document.title = 'Testing ' + story.name.toUpperCase() + ' | IF Core'
}

if (typeof window !== 'undefined' && !!window && !!window.location) {
	let url = new URL(window.location.href)
	let storyName = url.searchParams.get("story")
	if (!!storyName) useStory(storyName)
}

// Use IFScript for proper module loader initialization
import IFScript from '../src/IFScript.mjs'
import versions from '../src/constants/versions.mjs'

let parsed

// Initialize IFScript with module loader support
const ifScript = new IFScript(versions.STREAM)
await ifScript.init()

// Parse the story (now async)
try {
	parsed = await ifScript.parse(story.content, story.path)
	console.log(JSON.stringify(parsed))
} catch (error) {
	console.error('Parse error:', error)
	throw error
}

export default parsed
