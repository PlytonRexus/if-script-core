const Keywords = {
  // blocks
  SECTION_START: 'section__',
  SECTION_END: '__section',
  IMPORT_START: 'import__',
  IMPORT_END: '__import',
  SCENE_START: 'scene__',
  SCENE_END: '__scene',
  SETTINGS_START: 'settings__',
  SETTINGS_END: '__settings',
  SECTION_SETTINGS_START: 'secset__',
  SECTION_SETTINGS_END: '__secset',
  CHOICE_START: 'choice__',
  CHOICE_END: '__choice',

  // conditional blocks
  IF_BLOCK_START: 'if__',
  THEN: 'then__',
  ELSE_BLOCK_START: 'else__',
  ELSE_BLOCK_END: '__else',

  // global settings
  PROP_START_AT: '@startAt',
  PROP_REFERRABLE: '@referrable',
  PROP_FULL_TIMER: '@fullTimer',
  PROP_IF_TITLE: '@storyTitle',
  PROP_MAX_ITERATIONS: '@maxIterations',
  PROP_MAX_CALL_DEPTH: '@maxCallDepth',
  PROP_STATUS_BAR: '@statusBar',
  PROP_THEME: '@theme',
  PROP_ALLOW_UNDO: '@allowUndo',
  PROP_SHOW_TURN: '@showTurn',
  PROP_ANIMATIONS: '@animations',
  PROP_AUTO_SAVE: '@autoSave',
  PROP_PRESENTATION_MODE: '@presentationMode',

  // scene properties
  PROP_SCENE_FIRST: '@first',
  PROP_SCENE_MUSIC: '@music',
  PROP_SCENE_MUSIC_VOLUME: '@musicVolume',
  PROP_SCENE_MUSIC_LOOP: '@musicLoop',
  PROP_SCENE_MUSIC_FADE_IN_MS: '@musicFadeInMs',
  PROP_SCENE_MUSIC_FADE_OUT_MS: '@musicFadeOutMs',
  PROP_SCENE_TRANSITION: '@sceneTransition',
  PROP_SCENE_SECTIONS: '@sections',
  PROP_SCENE_NAME: '@name',

  // section properties
  PROP_SECTION_TITLE: '@title',
  PROP_SECTION_TIMER: '@timer',
  PROP_SECTION_AMBIENCE: '@ambience',
  PROP_SECTION_AMBIENCE_VOLUME: '@ambienceVolume',
  PROP_SECTION_AMBIENCE_LOOP: '@ambienceLoop',
  PROP_SECTION_AMBIENCE_FADE_IN_MS: '@ambienceFadeInMs',
  PROP_SECTION_AMBIENCE_FADE_OUT_MS: '@ambienceFadeOutMs',
  PROP_SECTION_SFX: '@sfx',
  PROP_SECTION_BACKDROP: '@backdrop',
  PROP_SECTION_SHOT: '@shot',
  PROP_SECTION_TEXT_PACING: '@textPacing',

  // choice actions
  PROP_CHOICE_INPUT: '@input',
  PROP_CHOICE_TARGET: '@target',
  PROP_CHOICE_READ: '@read',
  PROP_CHOICE_ACTION: '@action',
  PROP_CHOICE_TARGET_TYPE: '@targetType',
  PROP_CHOICE_WHEN: '@when',
  PROP_CHOICE_ONCE: '@once',
  PROP_CHOICE_DISABLED_TEXT: '@disabledText',
  PROP_CHOICE_SFX: '@choiceSfx',
  PROP_FOCUS_SFX: '@focusSfx',
  PROP_CHOICE_STYLE: '@choiceStyle',

  // boolean
  TRUE: 'true',
  FALSE: 'false',

  // imports
  PROP_REQUIRE: '@require',

  // loops
  WHILE_START: 'while__',
  BREAK: 'break__',
  CONTINUE: 'continue__',

  // functions
  FUNCTION_START: 'function__',
  FUNCTION_END: '__function',
  RETURN: 'return__'
}

export default Keywords
