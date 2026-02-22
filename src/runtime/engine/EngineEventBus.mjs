class EngineEventBus {
  constructor () {
    this.listeners = new Map()
  }

  on (eventName, handler) {
    if (typeof handler !== 'function') return () => {}
    if (!this.listeners.has(eventName)) this.listeners.set(eventName, new Set())
    const set = this.listeners.get(eventName)
    set.add(handler)
    return () => this.off(eventName, handler)
  }

  off (eventName, handler) {
    const set = this.listeners.get(eventName)
    if (!set) return
    set.delete(handler)
    if (set.size === 0) this.listeners.delete(eventName)
  }

  emit (eventName, payload) {
    const set = this.listeners.get(eventName)
    if (!set) return
    for (const handler of set) {
      try {
        handler(payload)
      } catch (err) {
        // Do not let one observer crash the runtime bus.
      }
    }
  }
}

export default EngineEventBus
