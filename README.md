# IF-SCRIPT

### Find available issues [here](https://github.com/PlytonRexus/if-script/issues)

An extremely simple syntax for writing interactive fiction that can be embedded in any website.

Make interactive fiction with variables, timers, conditions, music and statistics. The story is parsed into plain HTML, CSS and JavaScript.

[Try it!](https://plytonrexus.github.io/if-script/)

You can use Markdown to format your story.
_[Markdown cheat-sheet](https://www.markdownguide.org/cheat-sheet/) for reference._

### Dependencies
[Showdown](https://github.com/showdownjs/showdown) for markdown rendering.

---

## Author Workflow

This section covers the end-to-end workflow for writing and previewing IF-Script stories using the CLI.

### Installation

```bash
npm install -g if-script-core
```

### Writing a story

Create a file with the `.if` extension and write your story using the IF-Script syntax documented below. Large stories can be split across multiple `.partial.if` files using [imports](#imports).

### Previewing

```bash
ifs preview -i my-story.if
```

This starts a local HTTP server and opens the story in your browser. The browser automatically reloads whenever you save changes to the file — no manual refresh needed.

**Options:**

| Flag | Alias | Default | Description |
|------|-------|---------|-------------|
| `--input-file` | `-i` | *(required)* | Path to `.if` story file |
| `--theme` | `-t` | `parchment` | Theme name (`default`, `bricks`, `terminal`, `neon`, `parchment`, `contrast`, `dark`, `minimal`, `glass`) |
| `--port` | `-p` | `3001` | Local server port |

**Example:**
```bash
ifs preview -i my-story.if -t default -p 8080
```

Parse errors are displayed directly in the browser so you can fix them without leaving your editor.

### Compiling

Once your story is ready, compile it to JSON for distribution or embedding:

```bash
ifs compile -i my-story.if -o story.json
```

**Options:**

| Flag | Alias | Default | Description |
|------|-------|---------|-------------|
| `--input-file` | `-i` | *(required)* | Path to `.if` story file |
| `--output-file` | `-o` | `out.json` | Path for the compiled JSON output |

### Checking (Static Diagnostics)

Run static checks before preview/compile:

```bash
ifs check -i my-story.if
```

Use JSON output for CI and tooling:

```bash
ifs check -i my-story.if --json
```

---

### Current Syntax (v0.5.8+)

Jump to: [Quick Reference](#quick-reference) · [Writer Mode](#writer-mode-minimal-v1) · [Story Settings](#story-settings) · [Sections](#section-syntax) · [Choices](#choices) · [Conditionals](#conditionals) · [Arrays](#arrays) · [While Loops](#loops) · [Functions](#functions) · [Built-in Functions](#built-in-functions) · [Imports](#imports) · [Author Pitfalls](#author-pitfalls) · [Troubleshooting](#troubleshooting)

### [Quick Reference](#quick-reference)

**Block keywords**

| Block | Open | Close |
|------|------|------|
| Settings | `settings__` | `__settings` |
| Scene | `scene__` | `__scene` |
| Section | `section__` | `__section` |
| Choice | `choice__` | `__choice` |
| If block | `if__ (cond) { ... }` | `}` |
| While loop | `while__ (cond) { ... }` | `}` |
| Function | `function__ name(args) { ... }` | `}` |
| Import | `import__"file.partial.if"__import` | n/a |
| Writer section (alias) | `section "Title"` | `end` |
| Writer choice (alias) | `-> "Text" => "Target"` | n/a |

**Core properties**

| Context | Properties |
|------|------|
| Story settings | `@storyTitle`, `@startAt`, `@referrable`, `@fullTimer`, `@maxIterations`, `@maxCallDepth`, `@statusBar`, `@theme`, `@allowUndo`, `@showTurn`, `@animations`, `@autoSave` |
| Scene | `@name`, `@first`, `@music`, `@sections` |
| Section | `@title`, `@timer` |
| Choice | `@target`, `@targetType`, `@input`, `@action`, `@when`, `@once`, `@disabledText` |

**Control flow + expressions**
- Conditionals: `if__ (cond) { ... } else__ { ... }`
- Inline conditional assignment: `if__ (cond) then__ a = 1 else__ a = 2`
- Loop control: `break__`, `continue__`
- Function return: `return__ value`
- Operators: `+ - * / % == != < > <= >= && ||`

**Arrays + calls**
- Array literal: `inventory = []`, `nums = [1, 2, 3]`
- Access: `first = nums[0]`
- Mutation: `nums[1] = 10`, `nums.push(4)`, `item = nums.pop()`
- Calls: `result = myFunc(1, 2)`, `len = nums.length`

### [Writer Mode Syntax](#writer-mode-minimal-v1)

Writer Mode is always enabled and can be mixed with other syntax in the same file.

```if
section "Village Square"
  "You are in the square."
  -> "Go to Market" => "Market"
  -> "Skip to Chapter" => scene "Chapter One"
end
```

Equivalent syntax:
```if
section__
  @title "Village Square"
  "You are in the square."
  choice__
    @target "Market"
    "Go to Market"
  __choice
  choice__
    @targetType "scene"
    @target "Chapter One"
    "Skip to Chapter"
  __choice
__section
```

### [Embedding](#embedding)
You can parse in Node.js, but the interpreter requires a DOM.

1. Import the library
```js
import IFScript from 'if-script-core'
```
2. Initialize
```js
const ifScript = new IFScript()
await ifScript.init()
```
3. Parse story text (async)
```js
const myStoryText = '/* my story */'
const parsed = await ifScript.parse(myStoryText, '/stories/my-story.if')
```
Pass a stable `filePath` whenever you use `import__...__import` so relative imports resolve correctly.

4. Load into DOM with optional theme
```js
ifScript.interpreter.loadStory(parsed, null, 'parchment')
```

*The indentation does not matter.*

### [Comments](#comments)

A comment is a text block that is not integrated into the final model of the story. Comments exist to help write cleaner stories. For example, by pointing out purposes of certain portions of the story.
```
/* A
 multi-line
 comment */
 ```

### [Variables](#variables)

Variables truly create dynamic stories. You can use variables to store character names, inventory items, visited scenes, statistics and more. Variables are declared with simple assignment:

```
playerName = "Felicity"
health = 100
hasKey = true
gold = 0
```

Display variable values anywhere in your story text using string interpolation:
```
"Your name is ${playerName}. You have ${gold} gold pieces."
```

Variables can be used in conditional logic to determine which choices and text blocks are shown. Variables declared in sections persist throughout the story and can be used in later sections.

### [Story Settings](#story-settings)

Story settings allow you to customize the overall experience of the story. All settings are optional.

```
settings__
  @storyTitle "My Story"
  @startAt 1
  @referrable false
  @theme "minimal"
  @allowUndo false
  @showTurn false
  @animations false
  @autoSave true
  @fullTimer 300 1
  @statusBar health
  @statusBar stamina "Stamina"
  @statusBar gold false
  @statusBar hp true "Health"
__settings
```

Available settings:
-   `@storyTitle` - The title of your story (string)
-   `@startAt` - The starting section ref (serial number or section title string, default: 0). Set this explicitly in real stories.
-   `@referrable` - Whether older sections remain visible when moving to new sections (boolean, default: false)
-   `@fullTimer` - Time limit for completing the story in seconds, followed by a target section ref (serial or title, e.g., `300 1` or `300 "Game Over"`)
-   `@maxIterations` - Maximum iterations allowed in while loops (number, default: 10000)
-   `@maxCallDepth` - Maximum function call depth for recursion (number, default: 1000)
-   `@theme` - Preferred runtime theme when host/CLI does not override it (string)
-   `@allowUndo` - Enable/disable undo interaction in runtime UI (boolean, default: true)
-   `@showTurn` - Show/hide turn counter in status area (boolean, default: true)
-   `@animations` - Enable/disable runtime animations (boolean, default: true)
-   `@autoSave` - Reserved for save-system integrations; parsed and preserved in story JSON (boolean)
-   `@statusBar` - Configure status-bar visibility and display label for a variable. Supported forms:
    `@statusBar hp`
    `@statusBar hp false`
    `@statusBar hp "Health"`
    `@statusBar hp true "Health"`
    If any variable is explicitly marked `true`, only `true` variables are shown. When a label is provided, it is shown instead of the variable name.

Settings precedence:
- Host/CLI overrides > story settings > runtime defaults.

### [Scenes](#scenes)

Scenes are collections of sections that can be used to organize your story into chapters or acts.

```
scene__
  @name "Chapter One"
  @first 1
  @music "https://example.com/music.mp3"
  @sections 1 2 3 4 5
__scene
```

Properties:
-   `@name` - Display name for the scene (string)
-   `@first` - The first section ref in this scene (serial or title, optional)
-   `@music` - URL to background music for this scene (string, optional)
-   `@sections` - Space-separated list of section refs in this scene (serials and/or titles)

Use scene names in choices when possible:
```
choice__
  @targetType "scene"
  @target "Chapter One"
  "Start Chapter One"
__choice
```

### [Sections](#section-syntax)

Sections are independent locations/situations in a story. These can be reached through choices. Each section can have its own settings including timers that redirect to another section if the reader doesn't choose within the specified time.

```
section__
  @title "The Throne Room"
  @timer 30 5

  mood = "tense"

  "You stand before the king. The atmosphere is ${mood}."
  "What will you do?"

  choice__
    @target "Royal Audience"
    "Bow respectfully"
  __choice

  choice__
    @target "Defiant Speech"
    "Speak boldly"
  __choice
__section
```

Properties:
-   `@title` - The title of this section (string, optional)
-   `@timer` - Countdown timer in seconds, followed by a target section ref (serial or title, e.g., `30 5` or `30 "Timeout"`)

Sections can contain:
-   Variable assignments
-   Text content (supports Markdown and variable interpolation)
-   Choices
-   Conditional blocks
### [Choices](#choices)

Choices are the primary method to navigate through your story by reaching sections or scenes.

**Basic choice** - Navigate to a section:
```
choice__
  @target "Market Square"
  "Continue to the market"
__choice
```

**Navigate to a scene** - Go to the first section of a scene:
```
choice__
  @targetType "scene"
  @target "Chapter Two"
  "Begin Chapter Two"
__choice
```

**Input choice** - Collect user input and store in a variable:
```
choice__
  @target "After Name Entry"
  @input playerName
  "Enter your name:"
__choice
```

**Action choice** - Perform an action when clicked:
```
choice__
  @target "After Potion"
  @action health = health + 10
  "Drink health potion (+10 HP)"
__choice
```

**Multiple actions** - Add multiple `@action` lines:
```
choice__
  @target "Armory"
  @action gold = gold - 50
  @action hasSword = true
  "Buy sword (50 gold)"
__choice
```

**Conditional choices** - Only show if condition is met:
```
if__ (gold >= 50) {
  choice__
    @target "Armory"
    "Buy sword (50 gold)"
  __choice
}
```

**Conditional visibility on choice itself** - Hide or disable by property:
```
choice__
  @target "Armory"
  @when gold >= 50
  @disabledText "Need 50 gold"
  "Buy sword"
__choice
```

When `@when` is false:
- If `@disabledText` is not set, the choice is hidden.
- If `@disabledText` is set, a disabled row is shown with that text.

**One-time choice** - Consume after first click:
```
choice__
  @target "Vault"
  @once true
  "Open the vault"
__choice
```

`@once` state is undo-aware: undo restores one-time availability.

**Available operators:**

Comparison:
-   `==` - Equal to
-   `!=` - Not equal to
-   `<` - Less than
-   `>` - Greater than
-   `<=` - Less than or equal to
-   `>=` - Greater than or equal to

Logical:
-   `&&` - And
-   `||` - Or

Arithmetic (in actions):
-   `+` - Addition
-   `-` - Subtraction
-   `*` - Multiplication
-   `/` - Division
-   `%` - Modulo

Choice properties:
-   `@target` - Where to navigate: section title/serial by default, or scene name/serial when `@targetType "scene"` is set (number or string)
-   `@targetType` - Set to `"scene"` to navigate to a scene instead of a section (string, optional, default: `"section"`)
-   `@input` - Variable name to store user input (identifier, optional)
-   `@action` - Expression to execute when chosen. Add multiple lines for multiple actions. (expression, optional)
-   `@when` - Expression gate for choice visibility/availability (expression, optional)
-   `@once` - Consume the choice after it is selected once (boolean, optional, default: false)
-   `@disabledText` - Disabled label shown when `@when` is false (string, optional)

Targeting tips:
-   Prefer string targets for readability and to avoid renumbering issues (`@target "Section Title"` or scene `@target "Scene Name"` with `@targetType "scene"`).
-   String targets match section `@title` / scene `@name` exactly, so keep those values unique.
-   Numeric targets are still useful for deliberate serial jumps; string refs are useful for readability and stability.

Example when numeric targeting is intentional:
```
choice__
  @target 42
  "Jump to fallback section serial 42"
__choice
```

### [Conditional Blocks](#conditionals)

Control story flow with if-else statements. Use conditionals to show different text or choices based on variables.

**Block syntax** - Show different content based on conditions:
```
if__ (health < 20) {
  "You're badly wounded and need healing!"
} else__ {
  "You feel fine."
}
```

**Nested conditions:**
```
if__ (hasKey == true) {
  "You unlock the door."
  choice__
    @target "Treasure Room"
    "Enter the room"
  __choice
} else__ {
  "The door is locked. You need a key."
}
```

**Inline syntax** - For simple variable assignments:
```
if__ (gold >= 100) then__ canBuyHorse = true else__ canBuyHorse = false
```

Conditions use the same operators as choice conditions (see above).

### [Arrays](#arrays)

Arrays allow you to store and manipulate collections of values. Arrays provide unbounded memory for complex data structures and algorithms.

**Creating arrays:**
```
inventory = []
numbers = [1, 2, 3, 4, 5]
nested = [[1, 2], [3, 4]]
```

**Accessing elements:**
```
first = numbers[0]
second = numbers[1]
innerValue = nested[0][1]
```

**Modifying elements:**
```
numbers[0] = 99
inventory[2] = "sword"
```

**Array methods:**
```
inventory.push("potion")    // Add to end
item = inventory.pop()       // Remove from end
size = inventory.length      // Get length
```

**Arrays in loops:**
```
primes = []
i = 2
while__ (i < 20) {
  if__ (isPrime(i)) {
    primes.push(i)
  }
  i = i + 1
}
"Primes: ${primes}"
```

### [While Loops](#loops)

While loops enable unbounded iteration, allowing you to repeat code blocks while a condition is true.

**Basic while loop:**
```
counter = 0
sum = 0
while__ (counter < 10) {
  sum = sum + counter
  counter = counter + 1
}
"Sum: ${sum}"
```

**Break statement** - Exit the loop early:
```
i = 0
while__ (i < 100) {
  if__ (i == 10) {
    break__
  }
  i = i + 1
}
"Stopped at: ${i}"
```

**Continue statement** - Skip to next iteration:
```
i = 0
evenSum = 0
while__ (i < 10) {
  i = i + 1
  if__ (i % 2 == 1) {
    continue__
  }
  evenSum = evenSum + i
}
"Sum of even numbers: ${evenSum}"
```

**Nested loops:**
```
outer = 0
while__ (outer < 3) {
  inner = 0
  while__ (inner < 2) {
    "outer: ${outer}, inner: ${inner}"
    inner = inner + 1
  }
  outer = outer + 1
}
```

### [Functions](#functions)

Functions enable code reuse and recursion. Functions have local scope for parameters and support return values.

**Defining functions:**
```
function__ add(a, b) {
  return__ a + b
}

function__ greet(name) {
  return__ "Hello, ${name}!"
}
```

**Calling functions:**
```
sum = add(5, 3)
message = greet("Alice")
```

**Recursive functions:**
```
function__ factorial(n) {
  if__ (n <= 1) {
    return__ 1
  }
  return__ n * factorial(n - 1)
}

result = factorial(5)  // 120
```

**Functions with arrays:**
```
function__ makeRange(start, end) {
  result = []
  i = start
  while__ (i <= end) {
    result.push(i)
    i = i + 1
  }
  return__ result
}

numbers = makeRange(1, 10)
```

**Function scope:**
- Parameters are local to the function
- Variables assigned inside functions become global if not parameters
- Values are restored after function returns (local scope)

**Complex example - Fibonacci:**
```
function__ fibonacci(n) {
  if__ (n <= 1) {
    return__ n
  }
  return__ fibonacci(n - 1) + fibonacci(n - 2)
}

fib10 = fibonacci(10)
"Fibonacci(10) = ${fib10}"
```

### [Built-in Functions](#built-in-functions)

IF-Script includes builtin helper functions you can call like normal functions:
```
roll = randomInt(1, 6)
today = formatDate(now())
count = len(inventory)
```

Full reference (signatures, return types, examples, edge behavior):
- [`docs/builtins.md`](docs/builtins.md)

Name-resolution note:
- Builtin names are resolved before user-defined functions.
- Avoid naming custom functions like `len`, `range`, `randomInt`, etc. unless you intend to call the builtin.

### [Safety Limits](#safety-limits)

To prevent infinite loops and excessive recursion from freezing the browser, IF-Script includes configurable safety limits.

**Default limits:**
- Maximum iterations per loop: 10,000
- Maximum function call depth: 1,000

**Configuring limits in settings:**
```
settings__
  @storyTitle "My Story"
  @startAt 1
  @maxIterations 50000
  @maxCallDepth 2000
__settings
```

When a limit is exceeded, an error is thrown with a clear message:
- `"Maximum iterations (N) exceeded"`
- `"Maximum call depth (N) exceeded"`

These limits ensure your story remains responsive while still allowing complex algorithms to execute.

### Classic algorithm examples:

**Sieve of Eratosthenes (finding primes):**
```
function__ sieveOfEratosthenes(max) {
  primes = []
  i = 0
  while__ (i < max) {
    primes.push(true)
    i = i + 1
  }

  primes[0] = false
  primes[1] = false

  p = 2
  while__ (p * p < max) {
    if__ (primes[p] == true) {
      i = p * p
      while__ (i < max) {
        primes[i] = false
        i = i + p
      }
    }
    p = p + 1
  }

  result = []
  i = 2
  while__ (i < max) {
    if__ (primes[i] == true) {
      result.push(i)
    }
    i = i + 1
  }

  return__ result
}

primes = sieveOfEratosthenes(100)
```

**Greatest Common Divisor (Euclidean algorithm):**
```
function__ gcd(a, b) {
  while__ (b != 0) {
    temp = b
    b = a % b
    a = temp
  }
  return__ a
}

result = gcd(48, 18)  // 6
```

These capabilities make IF-Script suitable for implementing complex game logic, puzzles, and computational challenges within your interactive fiction.

### [Imports](#imports)

Split large stories across multiple files for better organization and maintainability. IF-Script supports a powerful import system that works in both Node.js and browsers, with features like circular dependency detection, caching, and path aliases.

#### Basic Syntax

```
import__"chapter2.partial.if"__import
```

#### Path Types

**1. Relative Paths** - Relative to the current file
```
import__"./chapter2.partial.if"__import
import__"../shared/intro.partial.if"__import
```

**2. Absolute Paths** - From the project root
```
import__"/lib/combat-system.partial.if"__import
```

**3. Path Aliases** - Configured shortcuts (see Configuration below)
```
import__"@lib/common.partial.if"__import
import__"@components/inventory.partial.if"__import
```

#### Serial Counters Across Imports

Each imported module is parsed with its own section/scene serial counters. Nested imported modules do the same. The main story file uses a separate counter space.

In practice:
- Use string targets (`@target "Section Title"` or scene `@target "Scene Name"`) for cross-module navigation.
- Use numeric targets when you explicitly want a serial jump; timers (`@timer`, `@fullTimer`) support both serial and title refs.

#### Imported Module Behavior (Important)

When a file is brought in via `import__"..."__import`, IF-Script merges:
- Sections
- Scenes
- Functions
- Top-level variable initializers (limited; see below)
- Status-bar config (`@statusBar`)

Global story behavior settings from imported module `settings__` blocks are **not** applied to the main story run:
- `@startAt` from imported modules is ignored for startup
- `@fullTimer` from imported modules is ignored for global timer behavior
- `@storyTitle` from imported modules does not replace the main story title
- `@maxIterations` / `@maxCallDepth` from imported modules are not used as global runtime limits

Top-level variable initializer capture from imported modules is intentionally narrow:
- Supported: simple single-token RHS values (numbers, strings, booleans) and empty arrays (`[]`)
- Not evaluated at import time: expression-based initializers like `x = a + 1`, function calls, non-empty array expressions

For predictable cross-file behavior, prefer:
- Defining global runtime settings in the main root `.if` file
- Initializing complex imported state inside sections/functions (not via top-level computed assignments)

#### Configuration

Configure the import system when creating an `IFScript` instance:

```javascript
import IFScript from 'if-script-core'

const ifScript = new IFScript({
  // Path configuration
  paths: {
    aliases: {
      '@lib': '/story-lib',
      '@components': '/components'
    },
    extensions: ['.if', '.partial.if']  // Auto-try these extensions
  },

  // Browser-specific configuration
  browser: {
    baseUrl: 'https://example.com/stories/',  // Base URL for fetching
    allowFetch: true,  // Enable dynamic fetching
    preloadedFiles: {  // Pre-bundle files for offline use
      '/lib/file.if': '/* file content */'
    }
  },

  // Module loader configuration
  loader: {
    maxImportDepth: 50,        // Max nesting depth
    enableCache: true,         // Cache loaded modules
    circularDetection: true    // Detect circular imports
  }
})

await ifScript.init()
const story = await ifScript.parse(storyText, filePath)
```

#### Features

✅ **Circular Dependency Detection** - Prevents infinite import loops
```
// a.if imports b.if, b.if imports a.if
// Error: Circular import detected: a.if → b.if → a.if
```

✅ **Import Caching** - Files are loaded and parsed only once
```
// Both imports use the cached version
import__"common.partial.if"__import
import__"common.partial.if"__import
```

✅ **Nested Imports** - Imported files can import other files
```
// main.if
import__"chapter1.partial.if"__import

// chapter1.partial.if
import__"scenes/intro.partial.if"__import
```

✅ **Browser Support** - Works in both Node.js and browsers
```javascript
// Option 1: Dynamic fetch (requires server)
const ifScript = new IFScript({
  browser: { baseUrl: 'https://example.com/stories/' }
})

// Option 2: Pre-bundled files (works offline)
const ifScript = new IFScript({
  browser: {
    preloadedFiles: {
      '/lib/file.if': '/* content here */'
    },
    allowFetch: false  // Disable dynamic fetching
  }
})
```

✅ **Clear Error Messages** - Detailed errors with file paths and line numbers
```
Import Error at 5:1
  Import: "missing.if"
  File not found: /path/to/missing.if (tried extensions: .if, .partial.if)
```

#### Example Structure

```
story/
├── main.if
│   ├── import__"@lib/intro.partial.if"__import
│   ├── import__"chapter1.partial.if"__import
│   └── import__"chapter2.partial.if"__import
├── chapter1.partial.if
│   └── import__"scenes/battle.partial.if"__import
├── chapter2.partial.if
└── lib/
    └── intro.partial.if
```

#### File Extensions

-   `.if` - Main story files
-   `.partial.if` - Importable modules (convention, not required)

Both extensions work the same way; the `.partial.if` convention just indicates the file is designed to be imported rather than used standalone.

### [Author Pitfalls](#author-pitfalls)

- Duplicate section titles / scene names make string targets ambiguous.
Tip: Keep every `@title` and `@name` unique when using string refs.

- Numeric targets across imports can be confusing because each module has its own serial counters.
Tip: Prefer string refs (`@target "Section Title"` / scene `@target "Scene Name"`) for cross-file navigation.

- User-defined function names that match builtins can shadow your intent.
Tip: Avoid naming your own functions after builtin helpers (`len`, `range`, `randomInt`, etc.).

- `break__`, `continue__`, and `return__` only make sense in specific contexts.
Tip: Use `break__`/`continue__` inside loops and `return__` inside functions to avoid hard-to-debug flow behavior.

- Imported module settings do not replace main-story runtime settings.
Tip: Keep global runtime controls (`@startAt`, `@fullTimer`, `@maxIterations`, `@maxCallDepth`) in the root file.

### [Troubleshooting](#troubleshooting)

Tip: run `ifs check -i my-story.if` for static diagnostics before preview/compile.

| Error message (or pattern) | Likely cause | Fix |
|------|------|------|
| `Undefined function: X` | Called a function that was never defined/imported, or name mismatch/case mismatch | Define/import the function before use, and verify exact spelling |
| `Maximum iterations (N) exceeded` | Loop condition never becomes false (or needs higher cap) | Fix loop termination logic, or increase `@maxIterations` if intentional |
| `Maximum call depth (N) exceeded` | Recursion without a solid base case (or deep recursion by design) | Add/verify base case, or increase `@maxCallDepth` if safe |
| `Circular import detected: ...` | Files import each other in a cycle | Break the cycle by extracting shared code into a one-way dependency |
| `File not found: ...` (import) | Wrong relative path/alias/base path or missing extension resolution | Check import path from current file location, aliases, and extensions config |
| `Expecting punctuation: ...` / `Expecting keyword: ...` / `Unexpected token: ...` | Syntax structure is incomplete or malformed | Check nearby block delimiters and keyword pairs (`section__`/`__section`, `choice__`/`__choice`, braces/parentheses) |
| `Cannot index non-array value` | Used `value[index]` on a non-array | Ensure the variable is an array before indexing |
| `X is not a method` | Called `.method()` on a value that does not support that method | Verify value type and method name (`push`, `pop`, `length`, etc.) |

### [Complete Example](#example)

Here's a complete mini-story demonstrating key features:

```
settings__
  @storyTitle "The Adventure Begins"
  @startAt 1
  @referrable false
__settings

/* Section 1: Start */
section__
  @title "The Village"

  playerName = "Adventurer"
  gold = 10
  hasMap = false

  "Welcome to **${playerName}**'s adventure!"
  "You have ${gold} gold pieces."

  choice__
    @target "Market Square"
    @input playerName
    "Enter your name:"
  __choice
__section

/* Section 2: The Market */
section__
  @title "Market Square"

  "Welcome, ${playerName}! The market is bustling with activity."

  if__ (gold >= 5) {
    choice__
      @target "The Crossroads"
      @action gold = gold - 5
      @action hasMap = true
      "Buy a map (5 gold)"
    __choice
  }

  choice__
    @target "The Crossroads"
    "Continue your journey"
  __choice
__section

/* Section 3: The Crossroads */
section__
  @title "The Crossroads"

  if__ (hasMap == true) {
    "Your map shows two paths ahead."
  } else__ {
    "You stand at a crossroads, unsure which way to go."
  }

  "You have ${gold} gold remaining."

  choice__
    @target "The Village"
    "Return to the village"
  __choice
__section
```
