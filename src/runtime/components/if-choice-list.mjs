const BaseHTMLElement = typeof HTMLElement === 'undefined' ? class {} : HTMLElement
const INPUT_PLACEHOLDER_PATTERN = /\[\[\s*input\s*\]\]|\{\{\s*input\s*\}\}/gi

export function buildInputChoiceMarkup (choice = {}, inputId = '') {
  const text = typeof choice.textHtml === 'string' && choice.textHtml.trim() !== ''
    ? choice.textHtml
    : String(choice.text || '')
  const inputMarkup = `
    <span class="choice-inline-control">
      <input type="text" class="choice-inline-input" data-choice-input-id="${String(inputId || '')}" data-choice-index="${choice.choiceIndex}" autocomplete="off" />
      <button type="button" class="choice-inline-submit" aria-label="Submit this choice" data-choice-index="${choice.choiceIndex}">→</button>
    </span>
  `
  let inserted = false
  const withInput = text.replace(INPUT_PLACEHOLDER_PATTERN, () => {
    if (inserted) return ''
    inserted = true
    return inputMarkup
  })
  if (inserted) return withInput
  return `${withInput} ${inputMarkup}`.trim()
}

class IFChoiceList extends BaseHTMLElement {
  constructor () {
    super()
    this.attachShadow({ mode: 'open' })
    this.choices = []
    this.onSelect = null
    this.onFocus = null
  }

  connectedCallback () {
    this.render()
  }

  setModel ({ choices = [], onSelect = null, onFocus = null }) {
    this.choices = choices
    this.onSelect = onSelect
    this.onFocus = onFocus
    this.render()
  }

  notifySelect (choiceIndex, inputValue = '') {
    if (typeof this.onSelect === 'function') this.onSelect(choiceIndex, inputValue)
    this.dispatchEvent(new CustomEvent('choice-select', { detail: { choiceIndex, inputValue } }))
  }

  notifyFocus (choiceIndex) {
    if (typeof this.onFocus === 'function') this.onFocus(choiceIndex)
    this.dispatchEvent(new CustomEvent('choice-focus', { detail: { choiceIndex } }))
  }

  renderChoiceRow (choice) {
    const style = choice.choiceStyle || 'default'
    const text = choice.textHtml || choice.text || ''
    if (choice.mode === 'input' && !choice.disabled) {
      const inputId = `if-choice-input-${choice.choiceIndex}`
      const markup = buildInputChoiceMarkup(choice, inputId)
      return `
        <div
          class="choice choice-input style-${style}"
          part="choice choice-${style} choice-input"
          data-choice-index="${choice.choiceIndex}"
          tabindex="0"
          role="button"
          aria-disabled="false"
        >${markup}</div>
      `
    }
    return `
      <button
        type="button"
        class="choice style-${style}"
        part="choice choice-${style}"
        data-choice-index="${choice.choiceIndex}"
        ${choice.disabled ? 'disabled aria-disabled="true"' : ''}
      >${text}</button>
    `
  }

  attemptInputChoiceSubmit (choiceNode, choiceIndex) {
    const inputNode = choiceNode.querySelector('.choice-inline-input')
    const inputValue = inputNode ? String(inputNode.value || '') : ''
    if (inputValue.trim() === '') {
      choiceNode.classList.add('choice-input-invalid')
      if (inputNode) inputNode.focus()
      return
    }
    choiceNode.classList.remove('choice-input-invalid')
    this.notifySelect(choiceIndex, inputValue)
  }

  bindInputChoiceEvents (choiceNode, choiceIndex) {
    const inputNode = choiceNode.querySelector('.choice-inline-input')
    choiceNode.addEventListener('focus', () => this.notifyFocus(choiceIndex))
    choiceNode.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      this.attemptInputChoiceSubmit(choiceNode, choiceIndex)
    })
    choiceNode.addEventListener('click', event => {
      if (event.target && event.target.classList && event.target.classList.contains('choice-inline-input')) return
      this.attemptInputChoiceSubmit(choiceNode, choiceIndex)
    })

    if (!inputNode) return
    inputNode.setAttribute('required', 'required')
    inputNode.addEventListener('focus', () => this.notifyFocus(choiceIndex))
    inputNode.addEventListener('input', () => {
      if (String(inputNode.value || '').trim() !== '') choiceNode.classList.remove('choice-input-invalid')
    })
    inputNode.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return
      event.preventDefault()
      this.attemptInputChoiceSubmit(choiceNode, choiceIndex)
    })
  }

  bindChoiceEvents () {
    this.shadowRoot.querySelectorAll('.choice').forEach(node => {
      const idx = parseInt(node.getAttribute('data-choice-index'), 10)
      if (node.classList.contains('choice-input')) {
        this.bindInputChoiceEvents(node, idx)
        return
      }
      node.addEventListener('click', () => {
        if (node.hasAttribute('disabled')) return
        this.notifySelect(idx)
      })
      node.addEventListener('focus', () => this.notifyFocus(idx))
    })
  }

  render () {
    if (!this.shadowRoot) return
    const rows = this.choices.map(choice => this.renderChoiceRow(choice)).join('')

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .list { display: grid; gap: 10px; }
        .choice {
          all: unset;
          display: block;
          cursor: pointer;
          border: 1px solid var(--if-choice-border, #b9a989);
          border-radius: 10px;
          padding: 12px 14px;
          background: var(--if-choice-bg, #f6f1e7);
          color: var(--if-choice-text, #2e2115);
          line-height: 1.4;
          transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
        }
        .choice-input {
          cursor: text;
        }
        .choice-inline-input {
          border: 1px solid var(--if-choice-input-border, #9f8d71);
          border-radius: 6px;
          padding: 5px 8px;
          margin: 0 6px;
          background: var(--if-choice-input-bg, rgba(255, 255, 255, 0.85));
          color: inherit;
          font: inherit;
          line-height: inherit;
          min-width: 130px;
          max-width: 100%;
          box-sizing: border-box;
        }
        .choice-inline-control {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          vertical-align: middle;
          margin: 0 6px;
        }
        .choice-inline-submit {
          border: 1px solid var(--if-choice-input-border, #9f8d71);
          border-radius: 999px;
          width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--if-choice-input-bg, rgba(255, 255, 255, 0.85));
          color: inherit;
          font: inherit;
          line-height: 1;
          cursor: pointer;
          padding: 0;
        }
        .choice-inline-submit:focus-visible {
          outline: 2px solid var(--if-focus, #2f6f98);
          outline-offset: 1px;
        }
        .choice-inline-input:focus-visible {
          outline: 2px solid var(--if-focus, #2f6f98);
          outline-offset: 1px;
        }
        .choice-input-invalid {
          border-color: var(--if-choice-invalid-border, #b33e3e);
        }
        .choice:hover { transform: translateY(-1px); background: var(--if-choice-bg-hover, #fdfaf3); }
        .choice:focus-visible {
          outline: 2px solid var(--if-focus, #2f6f98);
          outline-offset: 2px;
        }
        .choice[disabled] {
          cursor: not-allowed;
          opacity: 0.65;
        }
      </style>
      <div class="list" part="choice-list">${rows}</div>
    `

    this.bindChoiceEvents()
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('if-choice-list')) {
  customElements.define('if-choice-list', IFChoiceList)
}

export default IFChoiceList
