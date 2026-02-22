const BaseHTMLElement = typeof HTMLElement === 'undefined' ? class {} : HTMLElement

class IFSavePanel extends BaseHTMLElement {
  constructor () {
    super()
    this.attachShadow({ mode: 'open' })
    this.model = {
      open: false,
      autoSavedAt: null,
      slots: []
    }
    this.handlers = {}
  }

  connectedCallback () {
    this.render()
  }

  setModel ({ open = false, autoSavedAt = null, slots = [], handlers = {} }) {
    this.model = { open, autoSavedAt, slots }
    this.handlers = handlers
    this.render()
  }

  formatDate (value) {
    if (!value) return 'Empty'
    try {
      return new Date(value).toLocaleString()
    } catch (err) {
      return 'Unknown'
    }
  }

  render () {
    if (!this.shadowRoot) return
    const slotRows = (this.model.slots || []).map(slot => `
      <div class="slot" part="save-slot">
        <div class="meta">Slot ${slot.slot}: ${this.formatDate(slot.savedAt)}</div>
        <div class="row">
          <button type="button" data-action="save" data-slot="${slot.slot}">Save</button>
          <button type="button" data-action="load" data-slot="${slot.slot}" ${slot.savedAt ? '' : 'disabled'}>Load</button>
        </div>
      </div>
    `).join('')

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .panel {
          display: ${this.model.open ? 'grid' : 'none'};
          gap: 10px;
          border: 1px solid var(--if-save-border, #c7b79a);
          border-radius: 12px;
          background: var(--if-save-bg, #fef7ea);
          padding: 12px;
        }
        .slot {
          border: 1px dashed var(--if-save-slot-border, #c5b69a);
          border-radius: 8px;
          padding: 8px;
          display: grid;
          gap: 6px;
        }
        .row { display: flex; gap: 8px; }
        button {
          border: 1px solid var(--if-save-button-border, #b9a989);
          background: var(--if-save-button-bg, #fffaf0);
          border-radius: 8px;
          padding: 5px 8px;
          cursor: pointer;
        }
        .meta { font-size: 12px; opacity: 0.8; }
      </style>
      <section class="panel" part="save-panel">
        <div class="meta">Autosave: ${this.formatDate(this.model.autoSavedAt)}</div>
        ${slotRows}
      </section>
    `

    this.shadowRoot.querySelectorAll('button[data-action]').forEach(button => {
      button.onclick = () => {
        const slot = parseInt(button.getAttribute('data-slot'))
        const action = button.getAttribute('data-action')
        if (action === 'save' && this.handlers.onSave) this.handlers.onSave(slot)
        if (action === 'load' && this.handlers.onLoad) this.handlers.onLoad(slot)
      }
    })
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('if-save-panel')) {
  customElements.define('if-save-panel', IFSavePanel)
}

export default IFSavePanel
