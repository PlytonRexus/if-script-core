class AudioAdapter {
  constructor () {
    this.enabled = true
    this.channels = {
      sceneMusic: null,
      ambience: null
    }
    this.lastState = {
      sceneMusicUrl: null,
      ambienceUrl: null
    }
  }

  ensureAudio () {
    if (typeof Audio === 'undefined') return false
    if (!this.channels.sceneMusic) this.channels.sceneMusic = new Audio()
    if (!this.channels.ambience) this.channels.ambience = new Audio()
    return true
  }

  setEnabled (enabled) {
    this.enabled = enabled !== false
    if (!this.enabled) this.stopAll()
  }

  applyScene (scene) {
    if (!this.enabled || !scene) return
    if (!this.ensureAudio()) return
    const url = scene.music || null
    const audio = this.channels.sceneMusic
    if (!url) {
      audio.pause()
      this.lastState.sceneMusicUrl = null
      return
    }
    if (this.lastState.sceneMusicUrl !== url) {
      audio.src = url
      this.lastState.sceneMusicUrl = url
    }
    audio.loop = scene.musicLoop !== undefined ? scene.musicLoop : true
    audio.volume = typeof scene.musicVolume === 'number' ? scene.musicVolume : 1
    audio.play().catch(() => {})
  }

  applySection (sectionSettings) {
    if (!this.enabled || !sectionSettings) return
    if (!this.ensureAudio()) return
    const url = sectionSettings.ambience || null
    const audio = this.channels.ambience
    if (!url) {
      audio.pause()
      this.lastState.ambienceUrl = null
      return
    }
    if (this.lastState.ambienceUrl !== url) {
      audio.src = url
      this.lastState.ambienceUrl = url
    }
    audio.loop = sectionSettings.ambienceLoop !== undefined ? sectionSettings.ambienceLoop : true
    audio.volume = typeof sectionSettings.ambienceVolume === 'number' ? sectionSettings.ambienceVolume : 1
    audio.play().catch(() => {})
  }

  playSfx (url) {
    if (!this.enabled || !url) return
    if (typeof Audio === 'undefined') return
    const sfx = new Audio(url)
    sfx.play().catch(() => {})
  }

  getState () {
    return {
      sceneMusicUrl: this.lastState.sceneMusicUrl,
      ambienceUrl: this.lastState.ambienceUrl
    }
  }

  stopAll () {
    Object.values(this.channels).forEach(channel => {
      if (!channel) return
      channel.pause()
      channel.currentTime = 0
    })
  }
}

export default AudioAdapter
