const BaseHTMLElement = typeof HTMLElement === 'undefined' ? class {} : HTMLElement

function escapeHtml (value) {
  return String(value == null ? '' : value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatRemaining (ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes > 0) return `${minutes}:${String(seconds).padStart(2, '0')} left`
  return `${seconds}s left`
}

class IFStatusBar extends BaseHTMLElement {
  constructor () {
    super()
    this.attachShadow({ mode: 'open' })
    this.stats = []
    this.timers = []
    this.ticker = null
  }

  connectedCallback () {
    this.syncTicker()
    this.render()
  }

  disconnectedCallback () {
    this.clearTicker()
  }

  setModel ({ stats = [], timers = [] }) {
    this.stats = stats
    this.timers = Array.isArray(timers) ? timers : []
    this.syncTicker()
    this.render()
  }

  clearTicker () {
    if (!this.ticker) return
    clearInterval(this.ticker)
    this.ticker = null
  }

  syncTicker () {
    const now = Date.now()
    const hasActiveTimer = this.timers.some(timer =>
      timer &&
      typeof timer.deadlineAt === 'number' &&
      timer.deadlineAt > now
    )
    if (!hasActiveTimer) {
      this.clearTicker()
      return
    }
    if (this.ticker) return
    this.ticker = setInterval(() => {
      if (!this.isConnected) return
      this.render()
      this.syncTicker()
    }, 200)
  }

  renderTimerMarkup (timer, now) {
    if (!timer || typeof timer.deadlineAt !== 'number' || timer.deadlineAt <= now) return ''
    const remainingText = formatRemaining(timer.deadlineAt - now)
    const timerName = timer.timerType === 'full' ? 'Story Timer' : 'Section Timer'
    const outcomeText = typeof timer.outcomeText === 'string' && timer.outcomeText.trim() !== ''
      ? timer.outcomeText.trim()
      : ''
    const outcomeLine = outcomeText !== ''
      ? `<div class="timer-target" part="timer-target">${escapeHtml(outcomeText)}</div>`
      : ''
    return `
      <div class="timer" part="timer-item">
        <div class="timer-head">
          <span class="timer-name">${escapeHtml(timerName)}</span>
          <span class="timer-remaining">${escapeHtml(remainingText)}</span>
        </div>
        ${outcomeLine}
      </div>
    `
  }

  render () {
    if (!this.shadowRoot) return
    const now = Date.now()
    const items = this.stats
      .map(stat => `<span class="item" part="stat-item"><strong>${escapeHtml(stat.label)}:</strong> ${escapeHtml(stat.value)}</span>`)
      .join('')
    const timers = this.timers
      .map(timer => this.renderTimerMarkup(timer, now))
      .join('')
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .bar {
          display: grid;
          gap: 10px;
          padding: 8px 12px;
          border: 1px solid var(--if-status-border, #c9b89a);
          border-radius: 10px;
          background: var(--if-status-bg, #efe5d3);
          color: var(--if-status-text, #3b2a1c);
          font-size: 13px;
          font-family: monospace;
        }
        .stats {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        .timers {
          display: grid;
          gap: 8px;
        }
        .timer {
          display: grid;
          gap: 5px;
          padding: 8px;
          border-radius: 8px;
          background: var(--if-status-timer-bg, rgba(255, 255, 255, 0.55));
        }
        .timer-head {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          font-size: 12px;
        }
        .timer-name {
          font-weight: 700;
        }
        .timer-target {
          font-size: 12px;
          color: var(--if-status-timer-text, #4a3928);
        }
      </style>
      <div class="bar" part="status-bar">
        <div class="stats" part="status-stats">${items}</div>
        <div class="timers" part="status-timers">${timers}</div>
      </div>
    `
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('if-status-bar')) {
  customElements.define('if-status-bar', IFStatusBar)
}

export default IFStatusBar
