class StorageAdapter {
  constructor (storage = null) {
    this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : null)
  }

  getAutoKey (storyFingerprint) {
    return `ifscript:v2:auto:${storyFingerprint}`
  }

  getSlotKey (storyFingerprint, slot) {
    return `ifscript:v2:slot:${slot}:${storyFingerprint}`
  }

  writeAutoSave (storyFingerprint, payload) {
    if (!this.storage) return false
    try {
      this.storage.setItem(this.getAutoKey(storyFingerprint), JSON.stringify(payload))
      return true
    } catch (err) {
      return false
    }
  }

  readAutoSave (storyFingerprint) {
    if (!this.storage) return null
    try {
      const raw = this.storage.getItem(this.getAutoKey(storyFingerprint))
      if (!raw) return null
      return JSON.parse(raw)
    } catch (err) {
      return null
    }
  }

  clearAutoSave (storyFingerprint) {
    if (!this.storage) return false
    try {
      this.storage.removeItem(this.getAutoKey(storyFingerprint))
      return true
    } catch (err) {
      return false
    }
  }

  writeSlotSave (storyFingerprint, slot, payload) {
    if (!this.storage) return false
    if (![1, 2, 3].includes(slot)) return false
    try {
      this.storage.setItem(this.getSlotKey(storyFingerprint, slot), JSON.stringify(payload))
      return true
    } catch (err) {
      return false
    }
  }

  readSlotSave (storyFingerprint, slot) {
    if (!this.storage) return null
    if (![1, 2, 3].includes(slot)) return null
    try {
      const raw = this.storage.getItem(this.getSlotKey(storyFingerprint, slot))
      if (!raw) return null
      return JSON.parse(raw)
    } catch (err) {
      return null
    }
  }

  listSlotMetadata (storyFingerprint) {
    return [1, 2, 3].map(slot => {
      const payload = this.readSlotSave(storyFingerprint, slot)
      return {
        slot,
        savedAt: payload ? payload.savedAt : null,
        sectionSerial: payload ? payload.sectionSerial : null,
        turn: payload ? payload.turn : null
      }
    })
  }
}

export default StorageAdapter
