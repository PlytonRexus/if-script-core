class DebugPanel {
  constructor () {
    this.root = null
    this.visible = false
  }

  mount () {
    if (typeof document === 'undefined') return
    if (this.root) return
    const panel = document.createElement('aside')
    panel.id = 'if-v2-debug-panel'
    panel.style.cssText = [
      'position:fixed',
      'right:12px',
      'bottom:12px',
      'width:380px',
      'max-height:60vh',
      'overflow:auto',
      'z-index:9999',
      'background:#111',
      'color:#eee',
      'border:1px solid #444',
      'border-radius:8px',
      'padding:10px',
      'font:12px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      'display:none'
    ].join(';')
    panel.innerHTML = '<div><strong>IF Runtime Debug</strong></div><pre id="if-v2-debug-content"></pre>'
    document.body.appendChild(panel)
    this.root = panel
  }

  setVisible (visible) {
    this.visible = visible === true
    if (!this.root) return
    this.root.style.display = this.visible ? 'block' : 'none'
  }

  render (model) {
    if (!this.root) return
    const pre = this.root.querySelector('#if-v2-debug-content')
    if (!pre) return
    pre.textContent = JSON.stringify(model, null, 2)
  }

  destroy () {
    if (!this.root) return
    this.root.remove()
    this.root = null
  }
}

export default DebugPanel
