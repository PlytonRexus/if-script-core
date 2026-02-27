class EngineState {
  constructor () {
    this.runtimeOptions = {
      theme: 'literary-default',
      presentationMode: 'literary',
      allowUndo: true,
      showTurn: true,
      animations: true,
      autoSave: false
    }
    this.currentSectionView = null
    this.choiceLookup = {}
    this.sectionTimerHandle = null
    this.fullTimerHandle = null
    this.timers = {
      section: null,
      full: null
    }
    this.storyFingerprint = null
    this.traceCounter = 0
  }
}

export default EngineState
