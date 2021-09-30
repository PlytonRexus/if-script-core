import Interpreter from '../src/interpreters/custom/Interpreter.mjs'
import parsed from './parse.mjs'

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

try {
	interpreter.loadStory(parsed, null, theme.name)
} catch(err) {
	let exceptionArea = document.querySelector('#if_r-exception-area')
	exceptionArea.innerHTML += '<br><code>'+ JSON.stringify(err) +'</code>'
}

export default interpreter
