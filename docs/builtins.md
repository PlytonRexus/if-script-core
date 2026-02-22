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
| `randomChoice(arr)` | one element from `arr` | `randomChoice(["a", "b"])` |

## Type Conversion

| Function | Returns | Example |
|------|------|------|
| `toNumber(x)` | `number` | `toNumber("42") // 42` |
| `toString(x)` | `string` | `toString(42) // "42"` |

`toNumber(x)` edge behavior:
- If conversion is `NaN`, IF-Script returns `0`.

## Inspection and Utilities

| Function | Returns | Example |
|------|------|------|
| `type(x)` | `string` type name | `type([1,2]) // "array"` |
| `len(x)` | `number` length | `len("hello") // 5` |
| `contains(collection, item)` | `boolean` | `contains([1,2,3], 2)` |
| `range(n)` | array `[0..n-1]` | `range(5) // [0,1,2,3,4]` |
| `range(start, end)` | array `[start..end-1]` | `range(2, 5) // [2,3,4]` |

`range` uses half-open intervals and excludes the end value.

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
- `test/builtins-test.mjs`
