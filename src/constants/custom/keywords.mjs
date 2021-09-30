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
  IF_BLOCK_END: '__if',
  THEN: 'then__',
  ELSE_BLOCK_START: 'else__',
  ELSE_BLOCK_END: '__else',

  // global settings
  PROP_START_AT: '@startAt',
  PROP_REFERRABLE: '@referrable',
  PROP_FULL_TIMER: '@fullTimer',
  PROP_IF_TITLE: '@storyTitle',

  // scene properties
  PROP_SCENE_FIRST: '@first',
  PROP_SCENE_MUSIC: '@music',
  PROP_SCENE_SECTIONS: '@sections',
  PROP_SCENE_NAME: '@name',

  // section properties
  PROP_SECTION_TITLE: '@title',
  PROP_SECTION_TIMER: '@timer',

  // choice actions
  PROP_CHOICE_INPUT: '@input',
  PROP_CHOICE_TARGET: '@target',
  PROP_CHOICE_READ: '@read',
  PROP_CHOICE_ACTION: '@action',
  PROP_CHOICE_TARGET_TYPE: '@targetType',

  // boolean
  TRUE: 'true',
  FALSE: 'false',

  // imports
  PROP_REQUIRE: '@require'
}

export default Keywords
