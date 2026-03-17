import fs from 'fs/promises'
import path from 'path'

const KINDLE_LAYOUT = 'per-section-variant-files'
const DEFAULT_LIMITS = {
  maxStates: 8000,
  warnStates: 4000,
  maxLinks: 30000,
  warnLinks: 20000
}
const DEFAULT_CONVERTER_ORDER = ['kindlepreviewer', 'calibre', 'html-to-mobi', 'mobi-zipper']
const ALLOWED_CONVERTERS = new Set(['kindlepreviewer', 'calibre', 'html-to-mobi', 'mobi-zipper', 'none'])
const ALLOWED_TYPES = new Set(['boolean', 'enum', 'number'])

function failConfig (message, filePath, hint = null) {
  const error = new Error(message)
  error.code = 'KINDLE_CONFIG_INVALID'
  error.file = filePath || null
  error.hint = hint
  throw error
}

function isPlainObject (value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function ensureInteger (value, label, filePath) {
  if (typeof value !== 'number' || !Number.isFinite(value) || Number.isNaN(value) || Math.trunc(value) !== value) {
    failConfig(`${label} must be an integer.`, filePath)
  }
  return value
}

function ensurePositiveInteger (value, label, filePath) {
  const normalized = ensureInteger(value, label, filePath)
  if (normalized <= 0) failConfig(`${label} must be greater than zero.`, filePath)
  return normalized
}

function ensureUniqueValues (values, label, filePath) {
  const seen = new Set()
  values.forEach((value) => {
    const key = JSON.stringify(value)
    if (seen.has(key)) failConfig(`${label} contains duplicate values.`, filePath)
    seen.add(key)
  })
}

function normalizeVariableConfig (name, raw, filePath) {
  if (!isPlainObject(raw)) {
    failConfig(`Kindle variable "${name}" must be an object.`, filePath)
  }

  const type = typeof raw.type === 'string' ? raw.type.trim() : ''
  if (!ALLOWED_TYPES.has(type)) {
    failConfig(`Kindle variable "${name}" has unsupported type "${type || '<missing>'}".`, filePath)
  }

  if (!Array.isArray(raw.values) || raw.values.length === 0) {
    failConfig(`Kindle variable "${name}" must declare a non-empty values array.`, filePath)
  }

  const values = raw.values.map((value) => {
    if (type === 'boolean') {
      if (typeof value !== 'boolean') failConfig(`Kindle variable "${name}" only allows boolean values.`, filePath)
      return value
    }
    if (type === 'enum') {
      if (typeof value !== 'string' || value.trim() === '') {
        failConfig(`Kindle variable "${name}" only allows non-empty string enum values.`, filePath)
      }
      return value
    }
    const normalized = ensureInteger(value, `Kindle variable "${name}" values`, filePath)
    return normalized
  })

  ensureUniqueValues(values, `Kindle variable "${name}" values`, filePath)

  if (!Object.prototype.hasOwnProperty.call(raw, 'default')) {
    failConfig(`Kindle variable "${name}" must declare a default value.`, filePath)
  }

  const defaultValue = type === 'number'
    ? ensureInteger(raw.default, `Kindle variable "${name}" default`, filePath)
    : raw.default

  const matchesDefault = values.some(value => Object.is(value, defaultValue))
  if (!matchesDefault) {
    failConfig(`Kindle variable "${name}" default must appear in its values array.`, filePath)
  }

  return {
    type,
    values,
    default: defaultValue
  }
}

function normalizeLimits (raw, filePath) {
  const out = { ...DEFAULT_LIMITS }
  if (!raw) return out
  if (!isPlainObject(raw)) failConfig('Kindle limits must be an object.', filePath)

  Object.keys(DEFAULT_LIMITS).forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(raw, key)) return
    out[key] = ensurePositiveInteger(raw[key], `Kindle limits.${key}`, filePath)
  })

  if (out.warnStates > out.maxStates) failConfig('Kindle warnStates cannot exceed maxStates.', filePath)
  if (out.warnLinks > out.maxLinks) failConfig('Kindle warnLinks cannot exceed maxLinks.', filePath)
  return out
}

function normalizePackaging (raw, filePath) {
  if (!raw) return { converterOrder: [...DEFAULT_CONVERTER_ORDER] }
  if (!isPlainObject(raw)) failConfig('Kindle packaging must be an object.', filePath)

  const order = Object.prototype.hasOwnProperty.call(raw, 'converterOrder')
    ? raw.converterOrder
    : DEFAULT_CONVERTER_ORDER

  if (!Array.isArray(order) || order.length === 0) {
    failConfig('Kindle packaging.converterOrder must be a non-empty array.', filePath)
  }

  const normalized = order.map((entry) => {
    if (typeof entry !== 'string' || entry.trim() === '') {
      failConfig('Kindle packaging.converterOrder entries must be non-empty strings.', filePath)
    }
    const value = entry.trim()
    if (!ALLOWED_CONVERTERS.has(value) || value === 'none') {
      failConfig(`Kindle packaging.converterOrder contains unsupported converter "${value}".`, filePath)
    }
    return value
  })

  ensureUniqueValues(normalized, 'Kindle packaging.converterOrder', filePath)
  return { converterOrder: normalized }
}

function normalizeKindleConfig (raw, filePath) {
  if (!isPlainObject(raw)) failConfig('Kindle config root must be an object.', filePath)
  if (raw.version !== 1) failConfig('Kindle config version must be 1.', filePath)
  if (raw.layout !== KINDLE_LAYOUT) {
    failConfig(`Kindle config layout must be "${KINDLE_LAYOUT}".`, filePath)
  }

  if (!isPlainObject(raw.state)) failConfig('Kindle config state must be an object.', filePath)
  const variablesRaw = raw.state.variables
  if (!isPlainObject(variablesRaw)) failConfig('Kindle config state.variables must be an object.', filePath)

  const variableNames = Object.keys(variablesRaw).sort((left, right) => left.localeCompare(right))
  const variables = {}
  const defaults = {}

  variableNames.forEach((name) => {
    if (typeof name !== 'string' || name.trim() === '') {
      failConfig('Kindle config variable names must be non-empty strings.', filePath)
    }
    if (name === 'turn') failConfig('Kindle config cannot declare reserved variable "turn".', filePath)
    const normalized = normalizeVariableConfig(name, variablesRaw[name], filePath)
    variables[name] = normalized
    defaults[name] = normalized.default
  })

  return {
    version: 1,
    layout: KINDLE_LAYOUT,
    state: {
      variables,
      variableNames,
      defaults
    },
    limits: normalizeLimits(raw.limits, filePath),
    packaging: normalizePackaging(raw.packaging, filePath)
  }
}

async function loadKindleConfig (configPath, cwd = process.cwd()) {
  const resolved = path.resolve(cwd, configPath)
  let text = ''
  try {
    text = await fs.readFile(resolved, 'utf-8')
  } catch (error) {
    const wrapped = new Error(`Failed to read Kindle config "${resolved}": ${error.message}`)
    wrapped.code = 'KINDLE_CONFIG_INVALID'
    wrapped.file = resolved
    throw wrapped
  }

  let parsed = null
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    const wrapped = new Error(`Kindle config "${resolved}" is not valid JSON: ${error.message}`)
    wrapped.code = 'KINDLE_CONFIG_INVALID'
    wrapped.file = resolved
    throw wrapped
  }

  return {
    path: resolved,
    ...normalizeKindleConfig(parsed, resolved)
  }
}

export {
  KINDLE_LAYOUT,
  DEFAULT_LIMITS,
  DEFAULT_CONVERTER_ORDER,
  ALLOWED_CONVERTERS,
  loadKindleConfig
}
