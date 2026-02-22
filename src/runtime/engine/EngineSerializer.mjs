class EngineSerializer {
  static hashString (text) {
    let hash = 5381
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) + hash) + text.charCodeAt(i)
      hash = hash >>> 0
    }
    return hash.toString(16)
  }

  static computeStoryFingerprint (story) {
    if (!story) return 'unknown'
    const descriptor = {
      name: story.name || null,
      startAt: story.settings ? story.settings.startAt : null,
      sections: (story.sections || []).map(s => ({
        serial: s.serial,
        title: s && s.settings ? s.settings.title : null
      })),
      scenes: (story.scenes || []).map(s => ({
        serial: s.serial,
        name: s.name,
        first: s.first
      }))
    }
    return this.hashString(JSON.stringify(descriptor))
  }

  static cloneSerializableVariables (variables) {
    const result = {}
    const source = variables || {}
    Object.keys(source).forEach(key => {
      if (key === 'functions') return
      const value = source[key]
      if (typeof value === 'function') return
      try {
        result[key] = JSON.parse(JSON.stringify(value))
      } catch (err) {
        // Ignore non-serializable values.
      }
    })
    return result
  }

  static buildSnapshot (engine, metadata = {}) {
    if (!engine || !engine.run || !engine.run.state || !engine.run.story) return null
    const sectionSerial = engine.run.state.section ? engine.run.state.section.serial : null
    if (typeof sectionSerial !== 'number') return null

    return {
      version: 2,
      savedAt: Date.now(),
      storyFingerprint: engine.engineState.storyFingerprint || this.computeStoryFingerprint(engine.run.story),
      sectionSerial,
      turn: engine.run.state.turn,
      variables: this.cloneSerializableVariables(engine.run.state.variables),
      onceConsumed: { ...(engine.run.state.onceConsumed || {}) },
      themeId: engine.run.theme || engine.engineState.runtimeOptions.theme || 'literary-default',
      presentationMode: engine.engineState.runtimeOptions.presentationMode || 'literary',
      audioState: metadata.audioState || null
    }
  }

  static isValidSnapshot (engine, payload) {
    if (!payload || typeof payload !== 'object') return false
    if (payload.version !== 2) return false
    if (payload.storyFingerprint !== (engine.engineState.storyFingerprint || this.computeStoryFingerprint(engine.run.story))) return false
    if (typeof payload.sectionSerial !== 'number') return false
    const sectionExists = (engine.run.story.sections || []).some(section => section.serial === payload.sectionSerial)
    if (!sectionExists) return false
    if (payload.variables && typeof payload.variables !== 'object') return false
    if (payload.onceConsumed && typeof payload.onceConsumed !== 'object') return false
    return true
  }
}

export default EngineSerializer
