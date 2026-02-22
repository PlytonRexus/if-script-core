let seededState = 1

function normalizeSeed (seed) {
  const n = Number(seed)
  if (!Number.isFinite(n) || Number.isNaN(n)) return 1
  const normalized = (Math.abs(Math.floor(n)) >>> 0)
  return normalized === 0 ? 1 : normalized
}

function nextSeededRandom () {
  seededState = (1664525 * seededState + 1013904223) >>> 0
  return seededState / 4294967296
}

function numberOrZero (value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function resetBuiltinState () {
  seededState = 1
}

const BUILTINS = {
  // Math
  abs: (x) => Math.abs(x),
  floor: (x) => Math.floor(x),
  ceil: (x) => Math.ceil(x),
  round: (x) => Math.round(x),
  sqrt: (x) => Math.sqrt(x),
  pow: (base, exp) => Math.pow(base, exp),
  min: (...args) => Math.min(...args),
  max: (...args) => Math.max(...args),

  // Randomness
  random: () => Math.random(),
  randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  setSeed: (seed) => {
    seededState = normalizeSeed(seed)
    return seededState
  },
  seededRandom: () => nextSeededRandom(),
  seededRandomInt: (min, max) => {
    const low = Number(min)
    const high = Number(max)
    if (!Number.isFinite(low) || !Number.isFinite(high)) return 0
    const a = Math.floor(Math.min(low, high))
    const b = Math.floor(Math.max(low, high))
    return Math.floor(nextSeededRandom() * (b - a + 1)) + a
  },
  randomChoice: (arr) => arr[Math.floor(Math.random() * arr.length)],
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  chance: (percent) => Math.random() * 100 < Number(percent),
  shuffle: (arr) => {
    const out = Array.isArray(arr) ? [...arr] : []
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = out[i]
      out[i] = out[j]
      out[j] = tmp
    }
    return out
  },

  // Type conversion
  toNumber: (x) => { const n = Number(x); return isNaN(n) ? 0 : n },
  toString: (x) => String(x),
  upper: (x) => String(x).toUpperCase(),
  lower: (x) => String(x).toLowerCase(),
  trim: (x) => String(x).trim(),
  split: (x, sep) => String(x).split(sep === undefined ? ',' : sep),
  join: (arr, sep) => Array.isArray(arr) ? arr.join(sep === undefined ? ',' : sep) : '',

  // Inspection & utilities
  type: (x) => Array.isArray(x) ? 'array' : x === null ? 'null' : typeof x,
  len: (x) => x.length,
  contains: (collection, item) => collection.includes(item),
  clamp: (value, min, max) => Math.min(Math.max(Number(value), Number(min)), Number(max)),
  sum: (arr) => Array.isArray(arr) ? arr.reduce((acc, val) => acc + numberOrZero(val), 0) : 0,
  avg: (arr) => Array.isArray(arr) && arr.length > 0
    ? arr.reduce((acc, val) => acc + numberOrZero(val), 0) / arr.length
    : 0,
  unique: (arr) => Array.isArray(arr) ? [...new Set(arr)] : [],
  findIndex: (arr, item) => Array.isArray(arr) ? arr.findIndex(v => v === item) : -1,
  range: (startOrN, end) => {
    const start = end === undefined ? 0 : startOrN
    const stop = end === undefined ? startOrN : end
    return Array.from({ length: stop - start }, (_, i) => start + i)
  },

  // Date & time
  now: () => Date.now(),
  year: () => new Date().getFullYear(),
  month: () => new Date().getMonth() + 1,
  day: () => new Date().getDate(),
  hour: () => new Date().getHours(),
  minute: () => new Date().getMinutes(),
  second: () => new Date().getSeconds(),
  dayOfWeek: () => new Date().getDay(),
  formatDate: (ts, sep) => {
    const d = new Date(ts)
    const s = sep === undefined ? '-' : sep
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}${s}${mm}${s}${dd}`
  },
  formatTime: (ts, sep) => {
    const d = new Date(ts)
    const s = sep === undefined ? ':' : sep
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    const ss = String(d.getSeconds()).padStart(2, '0')
    return `${hh}${s}${mm}${s}${ss}`
  }
}

export default BUILTINS
export { resetBuiltinState }
