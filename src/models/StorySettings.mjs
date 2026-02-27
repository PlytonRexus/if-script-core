import Settings from './Settings.mjs'

class StorySettings extends Settings {
  get type () {
    return this._class
  }

  set type (_type) {
    this._class = _type
  }

  /**
   * @param {{
   *   referrable:boolean,
   *   startAt:number|string,
   *   fullTimer:{timer:number, target:number|string},
   *   fullTimerOutcome:string,
   *   name:string,
   *   storyAmbience:string,
   *   storyAmbienceVolume:number,
   *   storyAmbienceLoop:boolean,
   *   storyAmbienceFadeInMs:number,
   *   storyAmbienceFadeOutMs:number
   * }} input
   */
  constructor (input, json) {
    if (json) {
      if (typeof json === 'string') { json = JSON.parse(json) }
      input = json
    }

    super(input)
    this._class = 'StorySettings'
    const {
      referrable,
      name,
      fullTimerOutcome,
      maxIterations,
      maxCallDepth,
      theme,
      storyAmbience,
      storyAmbienceVolume,
      storyAmbienceLoop,
      storyAmbienceFadeInMs,
      storyAmbienceFadeOutMs,
      allowUndo,
      showTurn,
      animations,
      autoSave,
      presentationMode
    } = this.input
    this.startAt = this.input.startAt !== undefined ? this.input.startAt : 0
    this.fullTimer = this.input.fullTimer || null
    this.fullTimerOutcome = typeof fullTimerOutcome === 'string' && fullTimerOutcome.trim() !== ''
      ? fullTimerOutcome
      : null
    this.referrable = referrable !== undefined ? referrable : false
    this.name = name
    this.maxIterations = maxIterations !== undefined ? maxIterations : 10000
    this.maxCallDepth = maxCallDepth !== undefined ? maxCallDepth : 1000
    this.theme = theme || null
    this.storyAmbience = storyAmbience || null
    this.storyAmbienceVolume = typeof storyAmbienceVolume === 'number' ? storyAmbienceVolume : 1
    this.storyAmbienceLoop = storyAmbienceLoop !== undefined ? storyAmbienceLoop : true
    this.storyAmbienceFadeInMs = typeof storyAmbienceFadeInMs === 'number' ? storyAmbienceFadeInMs : 0
    this.storyAmbienceFadeOutMs = typeof storyAmbienceFadeOutMs === 'number' ? storyAmbienceFadeOutMs : 0
    this.allowUndo = allowUndo !== undefined ? allowUndo : true
    this.showTurn = showTurn !== undefined ? showTurn : true
    this.animations = animations !== undefined ? animations : true
    this.autoSave = autoSave !== undefined ? autoSave : false
    this.presentationMode = typeof presentationMode === 'string' && presentationMode.trim() !== ''
      ? presentationMode
      : 'literary'
  }

  static fromJson (json) {
    return new StorySettings({}, json)
  }
}

export default StorySettings
