import './if-section-view.mjs'

const BaseHTMLElement = typeof HTMLElement === 'undefined' ? class {} : HTMLElement

class IFStoryView extends BaseHTMLElement {
  constructor () {
    super()
    this.attachShadow({ mode: 'open' })
    this.model = { section: null }
    this.onChoiceSelect = null
    this.onChoiceFocus = null
  }

  connectedCallback () {
    this.render()
  }

  setModel ({ section = null, onChoiceSelect = null, onChoiceFocus = null }) {
    this.model = { section }
    this.onChoiceSelect = onChoiceSelect
    this.onChoiceFocus = onChoiceFocus
    this.render()
  }

  render () {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
      </style>
      <if-section-view></if-section-view>
    `
    const sectionView = this.shadowRoot.querySelector('if-section-view')
    sectionView.setModel({
      section: this.model.section,
      onChoiceSelect: this.onChoiceSelect,
      onChoiceFocus: this.onChoiceFocus
    })
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('if-story-view')) {
  customElements.define('if-story-view', IFStoryView)
}

export default IFStoryView
