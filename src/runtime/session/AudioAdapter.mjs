class AudioAdapter {
  constructor (options = {}) {
    this.debug = options.debug === true
    this.enabled = true
    this.paused = false
    this.activeSfx = new Set()
    this.channels = {
      storyAmbience: null,
      sceneMusic: null,
      ambience: null
    }
    this.lastState = {
      storyAmbienceUrl: null,
      sceneMusicUrl: null,
      ambienceUrl: null
    }
  }

  setDebug (enabled) {
    this.debug = enabled === true
  }

  logDebug (message, extra = '') {
    if (!this.debug) return
    if (typeof console === 'undefined' || typeof console.debug !== 'function') return
    if (extra) console.debug(`[if-audio] ${message}: ${extra}`)
    else console.debug(`[if-audio] ${message}`)
  }

  normalizeDebugUrl (url) {
    if (typeof url !== 'string' || url.trim() === '') return ''
    try {
      if (typeof window !== 'undefined' && window.location) {
        return new URL(url, window.location.href).href
      }
      if (typeof document !== 'undefined' && document.baseURI) {
        return new URL(url, document.baseURI).href
      }
      return url
    } catch (err) {
      return url
    }
  }

  getAudioUrl (audio) {
    if (!audio) return ''
    const raw = audio.currentSrc || audio.src || ''
    return this.normalizeDebugUrl(raw)
  }

  bindChannelDebugEvents (channelName, audio) {
    if (!audio || audio._ifDebugBound) return
    audio.addEventListener('play', () => {
      this.logDebug(`${channelName} start`, this.getAudioUrl(audio))
    })
    audio.addEventListener('ended', () => {
      this.logDebug(`${channelName} end`, this.getAudioUrl(audio))
      this.handleNaturalChannelEnd(channelName, audio)
    })
    audio._ifDebugBound = true
  }

  playWithDebug (audio, channelName) {
    if (!audio) return
    const playResult = audio.play()
    if (playResult && typeof playResult.catch === 'function') {
      playResult.catch((err) => {
        this.logDebug(`${channelName} play blocked`, err && err.message ? err.message : String(err || 'unknown'))
      })
    }
  }

  ensureAudio () {
    if (typeof Audio === 'undefined') return false
    if (!this.channels.storyAmbience) {
      this.channels.storyAmbience = new Audio()
      this.bindChannelDebugEvents('storyAmbience', this.channels.storyAmbience)
    }
    if (!this.channels.sceneMusic) {
      this.channels.sceneMusic = new Audio()
      this.bindChannelDebugEvents('sceneMusic', this.channels.sceneMusic)
    }
    if (!this.channels.ambience) {
      this.channels.ambience = new Audio()
      this.bindChannelDebugEvents('ambience', this.channels.ambience)
    }
    return true
  }

  pauseChannels ({ reset = false } = {}) {
    Object.values(this.channels).forEach(channel => {
      if (!channel) return
      channel.pause()
      if (reset) channel.currentTime = 0
    })
  }

  clearChannels () {
    Object.values(this.channels).forEach(channel => {
      if (!channel) return
      try {
        channel.pause()
        channel.removeAttribute('src')
        channel.src = ''
        if (typeof channel.load === 'function') channel.load()
      } catch (err) {
        // Ignore channel source reset issues.
      }
    })
    this.lastState.storyAmbienceUrl = null
    this.lastState.sceneMusicUrl = null
    this.lastState.ambienceUrl = null
  }

  stopSfx ({ reset = true } = {}) {
    for (const sfx of Array.from(this.activeSfx)) {
      try {
        sfx.pause()
        if (reset) sfx.currentTime = 0
      } catch (err) {
        // Ignore audio instance teardown failures.
      }
    }
    if (reset) this.activeSfx.clear()
  }

  resumeSfx () {
    if (!this.enabled || this.paused) return
    for (const sfx of Array.from(this.activeSfx)) {
      if (!sfx) {
        this.activeSfx.delete(sfx)
        continue
      }
      if (sfx.ended) {
        this.activeSfx.delete(sfx)
        continue
      }
      this.playWithDebug(sfx, 'sfx')
    }
  }

  setState (state = {}) {
    if (!state || typeof state !== 'object') return
    if (Object.prototype.hasOwnProperty.call(state, 'enabled')) {
      this.enabled = state.enabled !== false
    }
    if (Object.prototype.hasOwnProperty.call(state, 'paused')) {
      this.paused = state.paused === true
    }
  }

  setEnabled (enabled) {
    this.enabled = enabled !== false
    if (!this.enabled) {
      this.pauseChannels()
      this.stopSfx()
      return
    }
    if (!this.paused) this.resumePlayback()
  }

  hasStoryAmbience () {
    return !!this.lastState.storyAmbienceUrl
  }

  hasSceneMusic () {
    return !!this.lastState.sceneMusicUrl
  }

  hasSectionAmbience () {
    return !!this.lastState.ambienceUrl
  }

  getPreferredBackgroundChannel () {
    if (!this.enabled || this.paused) return null
    if (this.hasSectionAmbience()) return 'ambience'
    if (this.hasSceneMusic()) return 'sceneMusic'
    if (this.hasStoryAmbience()) return 'storyAmbience'
    return null
  }

  syncBackgroundPlayback () {
    if (!this.ensureAudio()) return
    const preferred = this.getPreferredBackgroundChannel()
    const order = ['ambience', 'sceneMusic', 'storyAmbience']

    order.forEach(channelName => {
      const channel = this.channels[channelName]
      if (!channel) return
      if (preferred === channelName) {
        if (channel.src) this.playWithDebug(channel, channelName)
      } else {
        channel.pause()
      }
    })
  }

  handleNaturalChannelEnd (channelName, audio) {
    if (!audio || audio.loop === true) return

    if (channelName === 'ambience' && this.lastState.ambienceUrl) {
      const endedUrl = this.lastState.ambienceUrl
      this.lastState.ambienceUrl = null
      this.logDebug('ambience cleared (natural end)', this.normalizeDebugUrl(endedUrl))
      this.syncBackgroundPlayback()
      return
    }

    if (channelName === 'sceneMusic' && this.lastState.sceneMusicUrl) {
      const endedUrl = this.lastState.sceneMusicUrl
      this.lastState.sceneMusicUrl = null
      this.logDebug('sceneMusic cleared (natural end)', this.normalizeDebugUrl(endedUrl))
      this.syncBackgroundPlayback()
      return
    }

    if (channelName === 'storyAmbience' && this.lastState.storyAmbienceUrl) {
      const endedUrl = this.lastState.storyAmbienceUrl
      this.lastState.storyAmbienceUrl = null
      this.logDebug('storyAmbience cleared (natural end)', this.normalizeDebugUrl(endedUrl))
      this.syncBackgroundPlayback()
    }
  }

  applyStory (storySettings) {
    if (!storySettings) return
    if (!this.ensureAudio()) return

    const url = storySettings.storyAmbience || null
    const audio = this.channels.storyAmbience
    const previousUrl = this.lastState.storyAmbienceUrl
    if (!url) {
      if (previousUrl) this.logDebug('storyAmbience end', this.normalizeDebugUrl(previousUrl))
      audio.pause()
      this.lastState.storyAmbienceUrl = null
      this.syncBackgroundPlayback()
      return
    }

    if (previousUrl !== url) {
      if (previousUrl) this.logDebug('storyAmbience end (source change)', this.normalizeDebugUrl(previousUrl))
      audio.src = url
      this.lastState.storyAmbienceUrl = url
    }
    audio.loop = storySettings.storyAmbienceLoop !== undefined ? storySettings.storyAmbienceLoop : true
    audio.volume = typeof storySettings.storyAmbienceVolume === 'number' ? storySettings.storyAmbienceVolume : 1
    this.syncBackgroundPlayback()
  }

  applyScene (scene) {
    if (!scene) return
    if (!this.ensureAudio()) return
    const url = scene.music || null
    const audio = this.channels.sceneMusic
    const previousUrl = this.lastState.sceneMusicUrl
    if (!url) {
      if (previousUrl) this.logDebug('sceneMusic end', this.normalizeDebugUrl(previousUrl))
      audio.pause()
      this.lastState.sceneMusicUrl = null
      this.syncBackgroundPlayback()
      return
    }
    if (previousUrl !== url) {
      if (previousUrl) this.logDebug('sceneMusic end (source change)', this.normalizeDebugUrl(previousUrl))
      audio.src = url
      this.lastState.sceneMusicUrl = url
    }
    audio.loop = scene.musicLoop !== undefined ? scene.musicLoop : true
    audio.volume = typeof scene.musicVolume === 'number' ? scene.musicVolume : 1
    this.syncBackgroundPlayback()
  }

  applySection (sectionSettings) {
    if (!sectionSettings) return
    if (!this.ensureAudio()) return
    const url = sectionSettings.ambience || null
    const audio = this.channels.ambience
    const previousUrl = this.lastState.ambienceUrl
    if (!url) {
      if (previousUrl) this.logDebug('ambience end', this.normalizeDebugUrl(previousUrl))
      audio.pause()
      this.lastState.ambienceUrl = null
      this.syncBackgroundPlayback()
      return
    }
    if (previousUrl !== url) {
      if (previousUrl) this.logDebug('ambience end (source change)', this.normalizeDebugUrl(previousUrl))
      audio.src = url
      this.lastState.ambienceUrl = url
    }
    audio.loop = sectionSettings.ambienceLoop !== undefined ? sectionSettings.ambienceLoop : true
    audio.volume = typeof sectionSettings.ambienceVolume === 'number' ? sectionSettings.ambienceVolume : 1
    this.syncBackgroundPlayback()
  }

  playSfx (url) {
    if (!this.enabled || this.paused || !url) return
    if (typeof Audio === 'undefined') return
    const sfx = new Audio(url)
    const sfxUrl = this.getAudioUrl(sfx)

    for (const existing of Array.from(this.activeSfx)) {
      if (!existing) {
        this.activeSfx.delete(existing)
        continue
      }
      if (this.getAudioUrl(existing) !== sfxUrl) continue
      try {
        existing.pause()
        existing.currentTime = 0
      } catch (err) {
        // Ignore stale instances.
      }
      this.activeSfx.delete(existing)
    }

    this.activeSfx.add(sfx)
    const cleanup = () => this.activeSfx.delete(sfx)
    sfx.addEventListener('play', () => this.logDebug('sfx start', this.getAudioUrl(sfx)))
    sfx.addEventListener('ended', () => {
      this.logDebug('sfx end', this.getAudioUrl(sfx))
      cleanup()
    })
    sfx.addEventListener('error', cleanup)
    sfx.addEventListener('abort', cleanup)
    this.playWithDebug(sfx, 'sfx')
  }

  pausePlayback () {
    this.paused = true
    this.pauseChannels()
    this.stopSfx({ reset: false })
  }

  resumePlayback () {
    this.paused = false
    if (!this.enabled) return
    this.syncBackgroundPlayback()
    this.resumeSfx()
  }

  resume () {
    this.resumePlayback()
  }

  getUiState () {
    const storyAmbienceLoaded = !!this.lastState.storyAmbienceUrl
    const sceneMusicLoaded = !!this.lastState.sceneMusicUrl
    const ambienceLoaded = !!this.lastState.ambienceUrl
    const hasLoadedAudio = storyAmbienceLoaded || sceneMusicLoaded || ambienceLoaded
    return {
      enabled: this.enabled,
      paused: this.paused,
      storyAmbienceLoaded,
      sceneMusicLoaded,
      ambienceLoaded,
      hasLoadedAudio,
      playing: this.enabled && !this.paused && hasLoadedAudio
    }
  }

  getState () {
    return {
      enabled: this.enabled,
      paused: this.paused,
      storyAmbienceUrl: this.lastState.storyAmbienceUrl,
      sceneMusicUrl: this.lastState.sceneMusicUrl,
      ambienceUrl: this.lastState.ambienceUrl
    }
  }

  stopAll ({ resetPaused = true, clearState = false } = {}) {
    this.pauseChannels({ reset: true })
    this.stopSfx({ reset: true })
    if (clearState) this.clearChannels()
    if (resetPaused) this.paused = false
  }
}

export default AudioAdapter
