import Operators from '../../constants/custom/operators.mjs'

function resolveConverterCtor () {
  if (typeof globalThis === 'undefined') return null
  const candidates = [
    globalThis.showdown,
    globalThis.Showdown,
    globalThis.window && globalThis.window.showdown
  ]

  for (const candidate of candidates) {
    if (candidate && typeof candidate.Converter === 'function') {
      return candidate.Converter
    }
  }

  return null
}

function escapeHtml (value) {
  return String(value == null ? '' : value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatInline (text) {
  let out = escapeHtml(text)
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img alt="$1" src="$2" />')
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>')
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  out = out.replace(/_([^_]+)_/g, '<em>$1</em>')
  out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>')
  return out
}

function flushParagraph (buffer, parts) {
  if (buffer.length === 0) return
  const content = buffer.map(line => formatInline(line)).join('<br/>')
  parts.push(`<p>${content}</p>`)
  buffer.length = 0
}

function fallbackMarkdownToHtml (text) {
  const normalized = String(text == null ? '' : text).replace(/\r\n/g, '\n')
  if (normalized.trim() === '') return '<p></p>'

  const lines = normalized.split('\n')
  const parts = []
  const paragraph = []
  let inUl = false
  let inOl = false
  let inBlockquote = false

  const closeLists = () => {
    if (inUl) {
      parts.push('</ul>')
      inUl = false
    }
    if (inOl) {
      parts.push('</ol>')
      inOl = false
    }
  }

  const closeBlockquote = () => {
    if (inBlockquote) {
      parts.push('</blockquote>')
      inBlockquote = false
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line === '') {
      flushParagraph(paragraph, parts)
      closeLists()
      closeBlockquote()
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      flushParagraph(paragraph, parts)
      closeLists()
      closeBlockquote()
      const [, hashes = '#', headingText = ''] = heading
      const level = hashes.length
      parts.push(`<h${level}>${formatInline(headingText)}</h${level}>`)
      continue
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flushParagraph(paragraph, parts)
      closeLists()
      closeBlockquote()
      parts.push('<hr/>')
      continue
    }

    const quote = line.match(/^>\s?(.*)$/)
    if (quote) {
      flushParagraph(paragraph, parts)
      closeLists()
      if (!inBlockquote) {
        parts.push('<blockquote>')
        inBlockquote = true
      }
      const [, quoteText = ''] = quote
      parts.push(`<p>${formatInline(quoteText)}</p>`)
      continue
    }

    const ul = line.match(/^[-*+]\s+(.*)$/)
    if (ul) {
      flushParagraph(paragraph, parts)
      closeBlockquote()
      if (!inUl) {
        closeLists()
        parts.push('<ul>')
        inUl = true
      }
      const [, ulText = ''] = ul
      parts.push(`<li>${formatInline(ulText)}</li>`)
      continue
    }

    const ol = line.match(/^\d+\.\s+(.*)$/)
    if (ol) {
      flushParagraph(paragraph, parts)
      closeBlockquote()
      if (!inOl) {
        closeLists()
        parts.push('<ol>')
        inOl = true
      }
      const [, olText = ''] = ol
      parts.push(`<li>${formatInline(olText)}</li>`)
      continue
    }

    closeLists()
    closeBlockquote()
    paragraph.push(rawLine)
  }

  flushParagraph(paragraph, parts)
  closeLists()
  closeBlockquote()
  return parts.join('\n')
}

class InterpreterUtils {
  constructor () {
    this.converter = null
    const Converter = resolveConverterCtor()
    if (Converter) {
      try {
        this.converter = new Converter()
      } catch {
        this.converter = null
      }
    }
  }

  /**
   * @param {Action} action
   * @param {string|number} left
   * @param {string|number} right
   *
   * @returns {boolean|number|string}
   */
  solveAction (action, left, right) {
    let result
    switch (action.operator) {
      case Operators.ADDITION:
        result = left + right
        break
      case Operators.SUBTRACTION:
        result = left - right
        break
      case Operators.MULTIPLICATION:
        result = left * right
        break
      case Operators.DIVISION:
        result = left / right
        break
      case Operators.MODULO:
        result = left % right
        break
      case Operators.EQUAL:
        result = left === right
        break
      case Operators.NOT_EQUAL:
        result = left !== right
        break
      case Operators.GREATER:
        result = left > right
        break
      case Operators.LESS:
        result = left < right
        break
      case Operators.GEQUAL:
        result = left >= right
        break
      case Operators.LEQUAL:
        result = left <= right
        break
      case Operators.LOGICAL_OR:
        result = left || right
        break
      case Operators.LOGICAL_AND:
        result = left && right
        break
    }

    return result
  }

  /**
   * @param {string} text
   * @return {string}
   */
  formatText (text) {
    const source = String(text == null ? '' : text)
    if (!this.converter || typeof this.converter.makeHtml !== 'function') return fallbackMarkdownToHtml(source)
    try {
      return this.converter.makeHtml(source)
    } catch {
      return fallbackMarkdownToHtml(source)
    }
  }
}

export default InterpreterUtils
