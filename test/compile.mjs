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

const is = new InputStream(story.path)
let parsed

is.init()
.then(() => {
	const ts = new TokenStream(is)
	parsed = new Parser(ts).parseStory()
	console.log(JSON.stringify(parsed))
})

export default parsed
