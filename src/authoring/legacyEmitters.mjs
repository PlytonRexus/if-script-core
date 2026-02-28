function quoteString (value) {
  const raw = String(value == null ? '' : value)
  return `"${raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function indentLines (lines, indent) {
  return lines.map(line => `${indent}${line}`)
}

function renderPrimitive (value) {
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return quoteString(value)
}

function renderNodeExpression (node) {
  if (node == null) return ''
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') return renderPrimitive(node)

  if (node._class === 'Token') {
    if (typeof node.symbol === 'boolean') return node.symbol ? 'true' : 'false'
    if (node.type === 'STRING') return quoteString(node.symbol)
    return String(node.symbol)
  }

  if (node._class === 'Action') {
    if (node.type === 'assign') return `${renderNodeExpression(node.left)} = ${renderNodeExpression(node.right)}`
    if (node.type === 'binary') return `${renderNodeExpression(node.left)} ${node.operator} ${renderNodeExpression(node.right)}`
    if (node.type === 'unary') return `${node.operator}${renderNodeExpression(node.left)}`
    if (node.type === 'return') return `return__ ${renderNodeExpression(node.left)}`
  }

  if (node._class === 'ArrayLiteral') {
    const parts = Array.isArray(node.elements) ? node.elements.map(renderNodeExpression) : []
    return `[${parts.join(', ')}]`
  }

  if (node._class === 'ArrayAccess') {
    return `${renderNodeExpression(node.array)}[${renderNodeExpression(node.index)}]`
  }

  if (node._class === 'MemberAccess') {
    if (!Array.isArray(node.args)) return `${renderNodeExpression(node.object)}.${node.member}`
    return `${renderNodeExpression(node.object)}.${node.member}(${node.args.map(renderNodeExpression).join(', ')})`
  }

  if (node._class === 'FunctionCall') {
    const name = typeof node.name === 'string' ? node.name : renderNodeExpression(node.name)
    const args = Array.isArray(node.args) ? node.args.map(renderNodeExpression).join(', ') : ''
    return `${name}(${args})`
  }

  return String(node.symbol ?? '')
}

function renderPropertyLine (keyword, value) {
  if (value === null || value === undefined || value === '') return null
  if (Array.isArray(value)) {
    if (value.length === 0) return null
    return `${keyword} ${value.map(renderPrimitive).join(' ')}`
  }
  if (typeof value === 'object' && !('_class' in value)) {
    if (Object.prototype.hasOwnProperty.call(value, 'timer') && Object.prototype.hasOwnProperty.call(value, 'target')) {
      if (value.target === null || value.target === undefined || value.target === '') return null
      return `${keyword} ${value.timer} ${renderPrimitive(value.target)}`
    }
  }
  if (typeof value === 'string') return `${keyword} ${quoteString(value)}`
  if (typeof value === 'number' || typeof value === 'boolean') return `${keyword} ${String(value)}`
  return `${keyword} ${renderNodeExpression(value)}`
}

function normalizeBlockBody (input) {
  if (!Array.isArray(input)) return []
  return input
    .map(entry => {
      if (typeof entry === 'string') return entry
      const rendered = renderNodeExpression(entry)
      return rendered.trim()
    })
    .filter(Boolean)
}

export function renderConditionalLegacy (input = {}) {
  const condition = renderNodeExpression(input.condition || input.cond || 'true')
  const ifLines = normalizeBlockBody(input.ifBlock || input.thenBlock || [])
  const elseLines = normalizeBlockBody(input.elseBlock || [])
  const indent = typeof input.indent === 'string' ? input.indent : '  '

  const out = [`if__ (${condition}) {`]
  out.push(...indentLines(ifLines, indent))
  out.push('}')
  if (elseLines.length > 0) {
    out.push('else__ {')
    out.push(...indentLines(elseLines, indent))
    out.push('}')
  }
  return out.join('\n')
}

export function renderLoopLegacy (input = {}) {
  const condition = renderNodeExpression(input.condition || 'true')
  const bodyLines = normalizeBlockBody(input.body || [])
  const indent = typeof input.indent === 'string' ? input.indent : '  '
  return [
    `while__ (${condition}) {`,
    ...indentLines(bodyLines, indent),
    '}'
  ].join('\n')
}

export function renderChoiceLegacy (input = {}) {
  const out = ['choice__']
  const indent = typeof input.indent === 'string' ? input.indent : '  '
  const targetType = input.targetType === 'scene' ? 'scene' : 'section'
  const targetLine = renderPropertyLine('@target', input.target)
  if (targetType === 'scene') out.push(`${indent}@targetType "scene"`)
  if (targetLine) out.push(`${indent}${targetLine}`)
  if (input.input) out.push(`${indent}@input ${String(input.input).trim()}`)
  if (input.when) out.push(`${indent}@when ${renderNodeExpression(input.when)}`)
  if (input.once === true || input.once === false) out.push(`${indent}@once ${String(input.once)}`)
  if (input.disabledText) out.push(`${indent}@disabledText ${quoteString(input.disabledText)}`)
  if (Array.isArray(input.actions)) {
    input.actions.forEach(action => {
      const rendered = renderNodeExpression(action)
      if (rendered) out.push(`${indent}@action ${rendered}`)
    })
  }
  if (input.choiceSfx) out.push(`${indent}@choiceSfx ${quoteString(input.choiceSfx)}`)
  if (input.focusSfx) out.push(`${indent}@focusSfx ${quoteString(input.focusSfx)}`)
  if (input.choiceStyle) out.push(`${indent}@choiceStyle ${quoteString(input.choiceStyle)}`)
  if (input.text) out.push(`${indent}${quoteString(input.text)}`)
  out.push('__choice')
  return out.join('\n')
}

export function renderSectionLegacy (input = {}) {
  const out = ['section__']
  const indent = typeof input.indent === 'string' ? input.indent : '  '
  if (input.title) out.push(`${indent}@title ${quoteString(input.title)}`)
  const settingMap = input.settings && typeof input.settings === 'object' ? input.settings : {}
  const propertyLines = [
    ['@timer', settingMap.timer],
    ['@timerOutcome', settingMap.timerOutcome],
    ['@ambience', settingMap.ambience],
    ['@ambienceVolume', settingMap.ambienceVolume],
    ['@ambienceLoop', settingMap.ambienceLoop],
    ['@ambienceFadeInMs', settingMap.ambienceFadeInMs],
    ['@ambienceFadeOutMs', settingMap.ambienceFadeOutMs],
    ['@backdrop', settingMap.backdrop],
    ['@shot', settingMap.shot],
    ['@textPacing', settingMap.textPacing]
  ]
  propertyLines.forEach(([keyword, value]) => {
    const rendered = renderPropertyLine(keyword, value)
    if (rendered) out.push(`${indent}${rendered}`)
  })
  if (Array.isArray(settingMap.sfx)) {
    settingMap.sfx.forEach(entry => {
      const rendered = renderPropertyLine('@sfx', entry)
      if (rendered) out.push(`${indent}${rendered}`)
    })
  }

  const textLines = normalizeBlockBody(input.text || [])
  out.push(...indentLines(textLines, indent))

  if (Array.isArray(input.choices)) {
    input.choices.forEach(choice => {
      const rendered = renderChoiceLegacy({ ...choice, indent: `${indent}` }).split('\n')
      out.push(...indentLines(rendered, indent))
    })
  }

  out.push('__section')
  return out.join('\n')
}

export function getLegacyAuthoringEmitters () {
  return {
    renderSectionLegacy,
    renderChoiceLegacy,
    renderConditionalLegacy,
    renderLoopLegacy
  }
}
