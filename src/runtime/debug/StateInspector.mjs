class StateInspector {
  summarize (engine) {
    if (!engine || !engine.run || !engine.run.state) return null
    return {
      turn: engine.run.state.turn,
      section: engine.run.state.section
        ? {
            serial: engine.run.state.section.serial,
            title: engine.run.state.section.settings ? engine.run.state.section.settings.title : null
          }
        : null,
      scene: engine.run.state.scene
        ? {
            serial: engine.run.state.scene.serial,
            name: engine.run.state.scene.name
          }
        : null,
      variables: { ...(engine.run.state.variables || {}) },
      onceConsumed: { ...(engine.run.state.onceConsumed || {}) }
    }
  }
}

export default StateInspector
