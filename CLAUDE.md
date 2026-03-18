# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IF-Script is an interactive fiction framework that parses a custom `.if` syntax into HTML/CSS/JavaScript. The custom STREAM parser (on the `custom-parser` branch) has replaced the legacy NearleyJS implementation. Story files use `.if` extension; importable partials use `.partial.if` by convention.

## Development Commands

### Testing
```bash
npm test                         # Run ALL test suites (core, cli, runtime, integration)
npm run test:core:turing         # Arrays, loops, functions
npm run test:core:safety         # MAX_ITERATIONS / MAX_CALL_DEPTH enforcement
npm run test:core:regression     # Backward compatibility
npm run test:core:builtins       # Built-in functions
npm run test:core:edge           # Boundary conditions
npm run test:core:performance    # Parsing/runtime benchmarks
npm run test:core:errors         # Error message quality
npm run test:cli:check           # CLI check command
npm run test:cli:compile         # CLI compile command
npm run test:runtime:v2          # Runtime v2 system
npm run test:runtime:save        # Save/resume persistence
npm run test:runtime:audio       # Audio adapter
npm run test:integration:import  # Module import system
```

Run a single test file directly:
```bash
node test/suites/core/turing.test.mjs
```

### Linting (StandardJS)
```bash
npm run lint                     # Check code style
npm run fix                      # Auto-fix lint issues
```

### Building
```bash
npm run build                    # Production webpack build
npm start                        # Dev server with hot reload
npm run test:pkg                 # Test package build
```

### CLI
```bash
ifs compile -i story.if -o out.json                       # Compile to JSON
ifs compile -i story.if --target kindle-html --output-dir dist/kindle  # Kindle HTML
ifs preview -i story.if [-t literary-default] [-p 3001]   # Local preview server
ifs check -i story.if [--profile kindle-any] [--json]     # Static diagnostics
```

### Test Harnesses (manual / visual testing)
```bash
npm run test:parse               # Parse a story, output JSON
npm run test:compile             # Compile from .if file
npm run test:interpret           # Interpret a parsed story in the DOM
```

## Architecture

### Pipeline Overview

```
.if text -> InputStream -> TokenStream -> Parser -> AST (Story model) -> EngineRuntime -> Renderer -> DOM
```

### Entry Point

`index.mjs` uses UMD pattern: exports `IFScript` for Node.js (CommonJS) and exposes global `IF` object in browsers.

`src/IFScript.mjs` is the main class. It accepts a config object (paths, browser settings, loader config), has async `init()` for dynamic imports, `parse(text, filePath)` for parsing, and `createRuntime(options)` for creating a `RuntimeManager`.

### Parser (`src/parsers/custom/`)

Stream-based recursive descent parser:
- `stream/InputStream.mjs`: Character-level stream with position/line/col tracking
- `stream/TokenStream.mjs`: Tokenizer with lookahead buffering (`peekAhead(offset)`), handles strings, numbers, identifiers, properties (`@keyword`), operators, comments
- `stream/Validator.mjs`: Character classification utilities
- `parser/Parser.mjs`: Recursive descent parser (~1500 lines). Entry: `parseStory()`. Parses sections, scenes, choices, conditionals, loops, functions, imports, expressions with operator precedence
- `parser/ParserUtils.mjs`: Token-checking helpers (punctuation, keyword matching, section/choice detection)
- `parser/PropertyParser.mjs`: Specialized property keyword parser

### Module Loader (`src/parsers/custom/loader/`)

Handles `import__"file.partial.if"__import` statements:
- `ModuleLoader.mjs`: Caching, circular dependency detection, configurable `maxImportDepth` (default 50)
- `PathResolver.mjs`: Resolves relative/absolute/aliased import paths
- `NodeFileAdapter.mjs` / `BrowserFileAdapter.mjs`: Environment-specific file reading (swapped via package.json `browser` field)

### Models (`src/models/`)

AST node classes representing the parsed story structure. Key files:
- `Story.mjs`: Top-level container with sections, scenes, functions, variables, settings, stats. Has `findSection()`, `findScene()` lookups
- `Section.mjs`, `Scene.mjs`, `Choice.mjs`, `Passage.mjs`: Core story structure nodes
- `ConditionalBlock.mjs`, `Loop.mjs`, `FunctionDef.mjs`, `FunctionCall.mjs`: Control flow nodes
- `Action.mjs`, `Variable.mjs`, `ArrayLiteral.mjs`, `ArrayAccess.mjs`, `MemberAccess.mjs`: Expression nodes

All models have static `fromJson()` for deserialization.

### Runtime (`src/runtime/`)

**Engine** (`engine/`):
- `EngineRuntime.mjs`: Core interpreter that executes the AST. Manages call stack, loop control, function returns. Enforces `MAX_CALL_DEPTH` (1000) and `MAX_ITERATIONS` (10000)
- `EngineState.mjs`: Runtime state snapshot (theme, timers, choice lookup, story fingerprint, undo/save/animation flags)
- `EngineEventBus.mjs`: Pub/sub event system (`on`, `off`, `emit`)
- `EngineSerializer.mjs`: Save/load state serialization

**Session** (`session/`):
- `RuntimeManager.mjs`: Main orchestrator. Creates EngineRuntime, StorageAdapter, AudioAdapter, ThemeRegistry. Manages renderer lifecycle and forwards engine events
- `StorageAdapter.mjs`: Persistence abstraction (localStorage)
- `AudioAdapter.mjs`: Four-channel audio (ambience, sceneMusic, storyAmbience, sfx)
- `ThemeRegistry.mjs`: Theme management

**Renderers** (`renderers/`): `RendererContract.mjs` (abstract interface), `LiteraryRenderer.mjs` (default, integrates with `if-runtime-shell` web component), `CinematicRenderer.mjs` (visual/cinematic mode)

**Web Components** (`components/`): `if-runtime-shell`, `if-story-view`, `if-section-view`, `if-choice-list`, `if-status-bar`, `if-menu-drawer`, `if-save-panel`

**Debug** (`debug/`): `EventTimeline.mjs`, `StateInspector.mjs`, `DebugPanel.mjs`

### Interpreter Support (`src/interpreters/custom/`)

- `State.mjs`: Execution state (variables, current/last section, scene, `onceConsumed` tracking for one-time choices)
- `Run.mjs`: Session wrapper around Story model and State
- `Builtins.mjs`: Built-in functions (math, random, string, array operations). See `docs/builtins.md` for full reference
- `InterpreterUtils.mjs`: HTML escaping, markdown conversion

### Constants (`src/constants/custom/`)

`tokenTypes.mjs`, `keywords.mjs`, `operators.mjs`, `operatorPrecedence.mjs`, `punctuations.mjs`, `allowedCharacters.mjs`

### Exceptions (`src/exceptions/`)

All extend `BaseException.mjs`: `ParsingException` (line/col/file/hint), `InterpreterException` (runtime errors), `ImportException` (import path/source location), `AssemblerException` (compilation errors).

### CLI (`src/cli/`)

Yargs-based CLI with three commands: `compile`, `preview`, `check`. Kindle compilation support via `compile-kindle.mjs`, `kindle-profile.mjs`, `kindle-config.mjs`, `kindle-packager.mjs`.

### Authoring (`src/authoring/`)

`authoringSchema.mjs`: IDE schema defining property types, defaults, and descriptions per context (story, section, scene, choice). Used for editor support.

## Test Infrastructure

Tests use a custom framework in `test/support/test-utils.mjs` with `assert()`, `assertEqual()`, `assertArrayEqual()`, `assertDefined()`, `assertThrows()`, `runTest()`, `runTestSuite()`. No external test runner.

Test runner (`test/runners/run-all-tests.mjs`) aggregates all suites. Tests are classified as **critical** (core features, safety, regression, builtins) or **optional** (edge cases, performance, errors, CLI, runtime). CI passes (exit 0) if all critical tests pass, even if optional tests fail.

Test fixtures live in `test/fixtures/` (stories, imports, compiled JSON, story sources).

### Writing Tests

Standard pattern for test files:

```javascript
import IFScript from '../../../src/IFScript.mjs'
import { assert, assertEqual, assertThrows, runTestSuite } from '../../support/test-utils.mjs'
import { pathToFileURL } from 'url'

async function testSomeFeature () {
  const storyText = `
    section__
      @title "Test"
      myVar = 42
      "Hello"
    __section
  `
  const ifScript = new IFScript()
  await ifScript.init()
  const parsed = await ifScript.parse(storyText)

  assertEqual(parsed.sections.length, 1, 'Should have one section')
}

export async function runMyTests () {
  return await runTestSuite('My Test Suite', [
    { name: 'Some feature works', fn: testSomeFeature }
  ])
}

// Allow direct execution: node test/suites/category/my.test.mjs
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runMyTests().then(passed => process.exit(passed ? 0 : 1))
}
```

To add a new suite to CI, import and register it in `test/runners/run-all-tests.mjs` with `critical: true` or `critical: false`, and add an npm script in `package.json`.

## CI/CD

GitHub Actions (`.github/workflows/`):
- **ci-pr.yml**: Runs `npm test` and `npm run build` on PRs to `custom-parser` branch (Node.js 20, Ubuntu)
- **ci-push.yml**: Same checks on push to `custom-parser`
- **deploy-gh-pages.yml**: Deploys Thrones story to `gh-pages` after successful CI push

## Code Style

- StandardJS: no semicolons, 2-space indentation, max line length 160 (`.editorconfig`)
- ES modules with `.mjs` extension throughout
- Globals allowed in lint: `localStorage`, `fetch`, `HTMLElement`, `CustomEvent`, `customElements`, `Audio`
- Lint ignores: `src/web/assets/**`, `src/web/js/lib/**`, `dist/**`
- Webpack configs in `config/` directory
