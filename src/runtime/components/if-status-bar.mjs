const BaseHTMLElement = typeof HTMLElement === 'undefined' ? class {} : HTMLElement

class IFStatusBar extends BaseHTMLElement {
  constructor () {
    super()
    this.attachShadow({ mode: 'open' })
    this.stats = []
  }

  connectedCallback () {
    this.render()
  }

  setModel ({ stats = [] }) {
    this.stats = stats
    this.render()
  }

  render () {
    if (!this.shadowRoot) return
    const items = this.stats.map(stat => `<span class="item" part="stat-item"><strong>${stat.label}:</strong> ${stat.value}</span>`).join('')
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .bar {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          padding: 8px 12px;
          border: 1px solid var(--if-status-border, #c9b89a);
          border-radius: 10px;
          background: var(--if-status-bg, #efe5d3);
          color: var(--if-status-text, #3b2a1c);
          font-size: 13px;
        }
      </style>
      <div class="bar" part="status-bar">${items}</div>
    `
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('if-status-bar')) {
  customElements.define('if-status-bar', IFStatusBar)
}

export default IFStatusBar
