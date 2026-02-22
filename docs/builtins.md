# IF-Script Built-in Functions

Builtins are available in expressions and function calls.

Example:
```if
roll = randomInt(1, 6)
isWeekend = dayOfWeek() == 0 || dayOfWeek() == 6
```

Notes:
- Builtin names are resolved before user-defined functions.
- Time/date helpers use local runtime time.

## Math

| Function | Returns | Example |
|------|------|------|
| `abs(x)` | `number` | `abs(-5) // 5` |
| `floor(x)` | `number` | `floor(4.9) // 4` |
| `ceil(x)` | `number` | `ceil(4.1) // 5` |
| `round(x)` | `number` | `round(4.5) // 5` |
| `sqrt(x)` | `number` | `sqrt(9) // 3` |
| `pow(base, exp)` | `number` | `pow(2, 10) // 1024` |
| `min(...args)` | `number` | `min(3, 1, 4) // 1` |
| `max(...args)` | `number` | `max(3, 1, 4) // 4` |

## Randomness

| Function | Returns | Example |
|------|------|------|
| `random()` | `number` in `[0, 1)` | `random()` |
| `randomInt(min, max)` | inclusive integer | `randomInt(1, 6)` |
| `setSeed(seed)` | normalized seed `number` | `setSeed(42)` |
| `seededRandom()` | deterministic `number` in `[0, 1)` | `seededRandom()` |
| `seededRandomInt(min, max)` | deterministic inclusive integer | `seededRandomInt(1, 6)` |
| `randomChoice(arr)` | one element from `arr` | `randomChoice(["a", "b"])` |
| `pick(arr)` | one element from `arr` | `pick(["a", "b"])` |
| `chance(percent)` | `boolean` | `chance(25)` |
| `shuffle(arr)` | shuffled copy of `arr` | `shuffle([1,2,3])` |

Deterministic RNG notes:
- `setSeed(seed)` normalizes invalid values to `1`.
- `seededRandom*` results are repeatable for the same seed and call order.

## Type Conversion

| Function | Returns | Example |
|------|------|------|
| `toNumber(x)` | `number` | `toNumber("42") // 42` |
| `toString(x)` | `string` | `toString(42) // "42"` |
| `upper(x)` | uppercase `string` | `upper("abc") // "ABC"` |
| `lower(x)` | lowercase `string` | `lower("ABC") // "abc"` |
| `trim(x)` | trimmed `string` | `trim(" a ") // "a"` |
| `replace(x, search, replacement)` | replaced `string` | `replace("a-b", "-", ":") // "a:b"` |
| `slice(x, start, end?)` | sliced `string` | `slice("abcdef", 1, 4) // "bcd"` |
| `startsWith(x, prefix)` | `boolean` | `startsWith("veracruz", "vera")` |
| `endsWith(x, suffix)` | `boolean` | `endsWith("veracruz", "cruz")` |
| `capitalize(x)` | capitalized `string` | `capitalize("reporter") // "Reporter"` |
| `slugify(x)` | URL-safe slug `string` | `slugify("A Stranger in Veracruz") // "a-stranger-in-veracruz"` |
| `stripTags(x)` | tag-stripped `string` | `stripTags("<b>name</b>") // "name"` |
| `sanitize(x)` | cleaned single-line `string` | `sanitize(" <b>Elena</b> ") // "Elena"` |
| `split(x, sep)` | `array<string>` | `split("a,b", ",") // ["a","b"]` |
| `join(arr, sep)` | `string` | `join(["a","b"], "-") // "a-b"` |

`toNumber(x)` edge behavior:
- If conversion is `NaN`, IF-Script returns `0`.

## Inspection and Utilities

| Function | Returns | Example |
|------|------|------|
| `type(x)` | `string` type name | `type([1,2]) // "array"` |
| `len(x)` | `number` length | `len("hello") // 5` |
| `contains(collection, item)` | `boolean` | `contains([1,2,3], 2)` |
| `clamp(value, min, max)` | bounded number | `clamp(15, 0, 10) // 10` |
| `sum(arr)` | numeric sum | `sum([1,2,3]) // 6` |
| `avg(arr)` | numeric average | `avg([2,4,6]) // 4` |
| `unique(arr)` | de-duplicated copy | `unique([1,2,2,3]) // [1,2,3]` |
| `findIndex(arr, item)` | first index or `-1` | `findIndex(["a","b"], "b") // 1` |
| `range(n)` | array `[0..n-1]` | `range(5) // [0,1,2,3,4]` |
| `range(start, end)` | array `[start..end-1]` | `range(2, 5) // [2,3,4]` |

`range` uses half-open intervals and excludes the end value.
Collection helper edge behavior:
- Non-array input returns `0` for `sum`/`avg`, `[]` for `unique`, and `-1` for `findIndex`.

## Date and Time

| Function | Returns | Example |
|------|------|------|
| `now()` | unix timestamp in milliseconds | `ts = now()` |
| `year()` | current year | `year()` |
| `month()` | month `1..12` | `month()` |
| `day()` | day of month `1..31` | `day()` |
| `hour()` | hour `0..23` | `hour()` |
| `minute()` | minute `0..59` | `minute()` |
| `second()` | second `0..59` | `second()` |
| `dayOfWeek()` | day index `0..6` (`0` = Sunday) | `dayOfWeek()` |
| `formatDate(ts, sep = "-")` | `YYYY{sep}MM{sep}DD` | `formatDate(now(), "/")` |
| `formatTime(ts, sep = ":")` | `HH{sep}MM{sep}SS` | `formatTime(now())` |

For source-of-truth behavior, see:
- `src/interpreters/custom/Builtins.mjs`
- `test/suites/core/builtins.test.mjs`
