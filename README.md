# IF-Script Runner and Parser

## HTML Setup

In the head tag:
```html
<link rel="stylesheet" href="downloadable/if_r.css">
```

At the bottom of the body tag:
```html
<!-- Handles interpretation of the story. A kind of run time for IF-Script. -->
<script src="if_r-terp.js"></script>

<!-- Is the parsing library -->
<script src="lib/nearley.js"></script>

<!-- The section grammar and class -->
<script src="parser/section.grammar.js"></script>

<!-- The Scene grammar and class -->
<script src="parser/scene.grammar.js"></script>

<!-- For markdown rendering -->
<script src="lib/showdown.min.js"></script>

<!-- We never import the parser file (if-parser.js) itself. Only interfaces to it. -->
```
The order of loading files is important.

---
## Eruda Integration

If you need a console on mobile screens use Eruda:
```html
<script>
    ;(function () {
	    var src = '//cdn.jsdelivr.net/npm/eruda';
	    if (!/eruda=true/.test(window.location) && localStorage.getItem('active-eruda') != 'true') return;
	    document.write('<scr' + 'ipt src="' + src + '"></scr' + 'ipt>');
	    document.write('<scr' + 'ipt>eruda.init();</scr' + 'ipt>');
	})();
</script>
```
This script will load Eruda if a query param `?eruda=true` is passed to the URL.

---

## Parsing and running a story
Load your own scripts as modules (this can only be done on servers and not on `file:///` URLs.)
```html
<script type="module" src="display.js"></script>
```
This must be done to allow ES6 imports.

In your file that will handle prase requests, import the parseText function:
```js
import { parseText } from "./parser/if-parser.js";
```

When you need to parse the story, invoke the function with a string of the story text.

```js
IF.story = parseText(storyText);
```
The return value of the function must be assigned to the `IF.story` object. The above line must be exactly followed.

Finally, to run the story, call:
```js
IF.methods.loadStory(IF.story);
```

Everything about the story will be handed autoamtically.
Just pass it the string of story text, and then feed the returned object to the loadStory method.

## Miscellaneous
If you cannot, for some reason, use ES6 imports, you can use the script tag to load the `parser/if-parser.js` file. This file contains the `parseText(storyText)` function. But, be aware that this may pollute your global namespace. The script tags then become:

```html
<script src="if_r-terp.js"></script>
<script type="text/javascript" src="js/if-parser.js"></script>
```

Make sure:
1. You have one empty div with the `id="if_r-output-area"`. This div will be used for showing output.
2.You don't use classes and `id`s that don't begin with `if_r-`.

You might want to:
1. Allow downloading of the Story.js file with a handler like this. It is upto you how you create that file with the `IF` object. 
```js
storyBtn.onclick = function () {
    if (!IF.story || Object.keys(IF.story).length <= 0)
        return console.log("Parse a story at least once.");
    let data = new Blob(
        [`const IF = ${JSON.stringify(IF)}`], {
            type: 'text/javascript'
        }
    );
    storyBtn.setAttribute('href', window.URL.createObjectURL(data));
}
```

This tutorial sorely lacks. I'll add more as soon as I can.