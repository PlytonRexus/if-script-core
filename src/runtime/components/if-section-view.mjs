import './if-choice-list.mjs'

const BaseHTMLElement = typeof HTMLElement === 'undefined' ? class {} : HTMLElement

class IFSectionView extends BaseHTMLElement {
  constructor () {
    super()
    this.attachShadow({ mode: 'open' })
    this.section = null
    this.onChoiceSelect = null
    this.onChoiceFocus = null
  }

  connectedCallback () {
    this.render()
  }

  setModel ({ section, onChoiceSelect = null, onChoiceFocus = null }) {
    this.section = section
    this.onChoiceSelect = onChoiceSelect
    this.onChoiceFocus = onChoiceFocus
    this.render()
  }

  render () {
    if (!this.shadowRoot) return
    const title = this.section ? (this.section.titleHtml || this.section.titleText || '') : ''
    const body = this.section ? (this.section.bodyHtml || this.section.bodyText || '') : ''
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .section {
          display: grid;
          gap: 16px;
        }
        .title {
          margin: 0;
          color: var(--if-title-text, #2f2115);
          font-family: var(--if-font-display, "Cormorant Garamond", serif);
          font-size: clamp(28px, 5vw, 44px);
          line-height: 1.05;
        }
        .body {
          color: var(--if-body-text, #2f271f);
          font-family: var(--if-font-body, "Alegreya", serif);
          line-height: 1.7;
          font-size: clamp(17px, 2.2vw, 21px);
        }
        if-choice-list {
          font-size: clamp(16px, 2.2vw, 21px);
        }
      </style>
      <article class="section" part="section">
        <h1 class="title" part="section-title">${title}</h1>
        <div class="body" part="section-body">${body}</div>
        <if-choice-list></if-choice-list>
      </article>
    `
    const choiceList = this.shadowRoot.querySelector('if-choice-list')
    choiceList.setModel({
      choices: this.section ? this.section.choices || [] : [],
      onSelect: this.onChoiceSelect,
      onFocus: this.onChoiceFocus
    })
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('if-section-view')) {
  customElements.define('if-section-view', IFSectionView)
}

export default IFSectionView
