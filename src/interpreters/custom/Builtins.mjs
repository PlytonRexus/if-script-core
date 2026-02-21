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
  randomChoice: (arr) => arr[Math.floor(Math.random() * arr.length)],

  // Type conversion
  toNumber: (x) => { const n = Number(x); return isNaN(n) ? 0 : n },
  toString: (x) => String(x),

  // Inspection & utilities
  type: (x) => Array.isArray(x) ? 'array' : x === null ? 'null' : typeof x,
  len: (x) => x.length,
  contains: (collection, item) => collection.includes(item),
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
