import Story from '../src/models/Story.mjs'
import Interpreter from '../src/interpreters/custom/Interpreter.mjs'

localStorage.setItem('IF_DEBUG', 'true')

const interpreter = new Interpreter(null)

let theme = {
	name: 'bricks'
}

function useTheme(storyName) {
	theme.name = storyName

	if (!theme.name) {
		theme.name = 'bricks'
	}
}

if (typeof window !== 'undefined' && !!window && !!window.location) {
	let url = new URL(window.location.href)
	let themeName = url.searchParams.get("theme")
	if (!!themeName) useTheme(themeName)
}

fetch('/test/compiled/introduction.json')
.then(res => res.json())
.then(str => {
	try {
		let story = new Story({}, {}, {}, {}, str)
		console.log(story)
		interpreter.loadStory(story, null, theme.name)
	} catch(err) {
		console.error(err)
		let exceptionArea = document.querySelector('#if_r-exception-area')
		exceptionArea.innerHTML += '<br><code>'+ err.toString() +'</code>'
	}
})

export default interpreter
