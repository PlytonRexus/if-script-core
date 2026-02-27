class EventTimeline {
  constructor () {
    this.events = []
    this.max = 200
  }

  push (eventName, payload) {
    this.events.push({
      eventName,
      payload
    })
    if (this.events.length > this.max) this.events.shift()
  }

  getAll () {
    return [...this.events]
  }
}

export default EventTimeline
