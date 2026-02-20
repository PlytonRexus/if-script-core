# IF-SCRIPT

### Find available issues [here](https://github.com/PlytonRexus/if-script/issues)

> The parser has been completely rewritten from scratch, replacing NearleyJS with a custom streaming parser.
> This brings improved performance, more features, and cleaner syntax. **The documentation below reflects the new syntax (v0.2.0+).**

An extremely simple syntax for writing interactive fiction that can be embedded in any website.

Make interactive fiction with variables, timers, conditions, music and statistics. The story is parsed into plain HTML, CSS and JavaScript.

[Try it!](https://plytonrexus.github.io/if-script/)

You can use Markdown to format your story. 
_[Markdown cheat-sheet](https://www.markdownguide.org/cheat-sheet/) for reference._

### Dependencies
[Showdown](https://github.com/showdownjs/showdown) for markdown rendering.

A Regular Expression based parser is on the [if-script-regex](https://github.com/PlytonRexus/if-script/tree/if-script-regex) branch.

### Current Syntax (v0.2.0+)

### [Embedding](#embedding)
Sure, you can use the parser on node, but the interpreter will need the DOM to work

1. Import the library
```js
import IFScript from 'if-script-core'
```
2. Initialize with STREAM parser (default)
```js
const ifScript = new IFScript('STREAM')
await ifScript.init()
```
3. Parse story text
```js
const myStoryText = '/* my story */'
const parsed = ifScript.parse(myStoryText)
```
4. Load into DOM with optional theme
```js
ifScript.interpreter.loadStory(parsed, null, 'default')
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
  @fullTimer 300 1
__settings
```

Available settings:
-   `@storyTitle` - The title of your story (string)
-   `@startAt` - The starting section number (number, default: 1)
-   `@referrable` - Whether older sections remain visible when moving to new sections (boolean, default: false)
-   `@fullTimer` - Time limit for completing the story in seconds, followed by the target section when time expires (two numbers, e.g., `300 1` means 300 seconds, then go to section 1)
-   `@maxIterations` - Maximum iterations allowed in while loops (number, default: 10000)
-   `@maxCallDepth` - Maximum function call depth for recursion (number, default: 1000)

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
-   `@first` - The first section in this scene (number, optional)
-   `@music` - URL to background music for this scene (string, optional)
-   `@sections` - Space-separated list of section numbers in this scene (numbers)
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
    @target 2
    "Bow respectfully"
  __choice

  choice__
    @target 3
    "Speak boldly"
  __choice
__section
```

Properties:
-   `@title` - The title of this section (string, optional)
-   `@timer` - Countdown timer in seconds, followed by the target section when time expires (two numbers, e.g., `30 5` means 30 seconds, then go to section 5)

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
  @target 5
  "Continue to section 5"
__choice
```

**Navigate to a scene** - Go to the first section of a scene:
```
choice__
  @targetType "scene"
  @target 2
  "Begin Chapter 2"
__choice
```

**Input choice** - Collect user input and store in a variable:
```
choice__
  @target 3
  @input playerName
  "Enter your name:"
__choice
```

**Action choice** - Perform an action when clicked:
```
choice__
  @target 4
  @action health = health + 10
  "Drink health potion (+10 HP)"
__choice
```

**Multiple actions** - Chain actions with semicolons:
```
choice__
  @target 6
  @action gold = gold - 50; hasSword = true
  "Buy sword (50 gold)"
__choice
```

**Conditional choices** - Only show if condition is met:
```
if__ (gold >= 50) {
  choice__
    @target 6
    "Buy sword (50 gold)"
  __choice
}
```

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
-   `@target` - The section number to navigate to (number)
-   `@targetType` - Set to `"scene"` to navigate to a scene instead of a section (string, optional)
-   `@input` - Variable name to store user input (identifier, optional)
-   `@action` - Expression to execute when chosen (expression, optional)
-   `@read` - Mark content as read (boolean, optional)

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
    @target 10
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

Split large stories across multiple files for better organization and maintainability.

```
import__"chapter2.partial.if"__import
```

-   Use relative paths from the current file
-   Imported files are processed during parsing
-   Useful for splitting chapters, scenes, or reusable content
-   Files typically use `.partial.if` extension to indicate they're part of a larger story

Example structure:
```
main.if
  ├── import__"intro.partial.if"__import
  ├── import__"chapter1.partial.if"__import
  └── import__"chapter2.partial.if"__import
```

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
    @target 2
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
      @target 3
      @action gold = gold - 5; hasMap = true
      "Buy a map (5 gold)"
    __choice
  }

  choice__
    @target 3
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
    @target 1
    "Return to the village"
  __choice
__section
```

This example shows:
-   Story settings with title and starting section
-   Variable declaration and modification
-   String interpolation in text
-   Input collection from the user
-   Conditional choices based on gold
-   Actions that modify variables
-   Conditional text blocks
-   Navigation between sections
