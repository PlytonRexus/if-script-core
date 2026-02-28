const AUTHORING_SCHEMA = {
  version: 1,
  contexts: {
    story: {
      title: 'Story',
      properties: [
        {
          keyword: '@fullTimer',
          field: 'fullTimer',
          type: 'timerTarget',
          defaultValue: null,
          description: 'Global story timer in seconds with target section.'
        },
        {
          keyword: '@fullTimerOutcome',
          field: 'fullTimerOutcome',
          type: 'string',
          defaultValue: null,
          description: 'Player-facing text shown when the story timer elapses.'
        },
        {
          keyword: '@storyAmbience',
          field: 'storyAmbience',
          type: 'string',
          defaultValue: null,
          description: 'Fallback ambience URL for the whole story.'
        },
        {
          keyword: '@storyAmbienceVolume',
          field: 'storyAmbienceVolume',
          type: 'number',
          min: 0,
          max: 1,
          defaultValue: 1,
          description: 'Story ambience volume from 0 to 1.'
        },
        {
          keyword: '@storyAmbienceLoop',
          field: 'storyAmbienceLoop',
          type: 'boolean',
          defaultValue: true,
          description: 'Whether story ambience loops.'
        },
        {
          keyword: '@storyAmbienceFadeInMs',
          field: 'storyAmbienceFadeInMs',
          type: 'number',
          defaultValue: 0,
          description: 'Story ambience fade-in metadata in milliseconds.'
        },
        {
          keyword: '@storyAmbienceFadeOutMs',
          field: 'storyAmbienceFadeOutMs',
          type: 'number',
          defaultValue: 0,
          description: 'Story ambience fade-out metadata in milliseconds.'
        },
        {
          keyword: '@presentationMode',
          field: 'presentationMode',
          type: 'enum',
          enumValues: ['literary', 'cinematic'],
          defaultValue: 'literary',
          description: 'Preferred runtime presentation mode.'
        },
        {
          keyword: '@allowUndo',
          field: 'allowUndo',
          type: 'boolean',
          defaultValue: true,
          description: 'Enable undo in runtime UI.'
        },
        {
          keyword: '@animations',
          field: 'animations',
          type: 'boolean',
          defaultValue: true,
          description: 'Enable runtime animations.'
        },
        {
          keyword: '@autoSave',
          field: 'autoSave',
          type: 'boolean',
          defaultValue: false,
          description: 'Persist autosave snapshots in browser storage.'
        }
      ]
    },
    scene: {
      title: 'Scene',
      properties: [
        {
          keyword: '@name',
          field: 'name',
          type: 'string',
          defaultValue: 'Untitled',
          description: 'Scene display name used in scene targets.'
        },
        {
          keyword: '@first',
          field: 'first',
          type: 'sectionTarget',
          defaultValue: null,
          description: 'First section ref entered when scene is targeted.'
        },
        {
          keyword: '@sections',
          field: 'sections',
          type: 'sectionTargetList',
          repeatable: true,
          defaultValue: [],
          description: 'Section refs that belong to this scene.'
        },
        {
          keyword: '@sceneAmbience',
          field: 'music',
          type: 'string',
          defaultValue: null,
          description: 'Scene music/ambience URL.'
        },
        {
          keyword: '@sceneAmbienceVolume',
          field: 'musicVolume',
          type: 'number',
          min: 0,
          max: 1,
          defaultValue: 1,
          description: 'Scene ambience volume from 0 to 1.'
        },
        {
          keyword: '@sceneAmbienceLoop',
          field: 'musicLoop',
          type: 'boolean',
          defaultValue: true,
          description: 'Whether scene ambience loops.'
        },
        {
          keyword: '@sceneAmbienceFadeInMs',
          field: 'musicFadeInMs',
          type: 'number',
          defaultValue: 0,
          description: 'Scene ambience fade-in metadata in milliseconds.'
        },
        {
          keyword: '@sceneAmbienceFadeOutMs',
          field: 'musicFadeOutMs',
          type: 'number',
          defaultValue: 0,
          description: 'Scene ambience fade-out metadata in milliseconds.'
        },
        {
          keyword: '@sceneTransition',
          field: 'sceneTransition',
          type: 'enum',
          enumValues: ['cut', 'fade', 'dissolve', 'slide'],
          defaultValue: 'cut',
          description: 'Cinematic transition hint.'
        }
      ],
      deprecated: [
        { keyword: '@music', replacement: '@sceneAmbience' },
        { keyword: '@musicVolume', replacement: '@sceneAmbienceVolume' },
        { keyword: '@musicLoop', replacement: '@sceneAmbienceLoop' },
        { keyword: '@musicFadeInMs', replacement: '@sceneAmbienceFadeInMs' },
        { keyword: '@musicFadeOutMs', replacement: '@sceneAmbienceFadeOutMs' }
      ]
    },
    section: {
      title: 'Section',
      properties: [
        {
          keyword: '@timer',
          field: 'timer',
          type: 'timerTarget',
          defaultValue: null,
          description: 'Section timer in seconds with target section.'
        },
        {
          keyword: '@timerOutcome',
          field: 'timerOutcome',
          type: 'string',
          defaultValue: null,
          description: 'Player-facing text shown when section timer elapses.'
        },
        {
          keyword: '@ambience',
          field: 'ambience',
          type: 'string',
          defaultValue: null,
          description: 'Section ambience URL.'
        },
        {
          keyword: '@ambienceVolume',
          field: 'ambienceVolume',
          type: 'number',
          min: 0,
          max: 1,
          defaultValue: 1,
          description: 'Section ambience volume from 0 to 1.'
        },
        {
          keyword: '@ambienceLoop',
          field: 'ambienceLoop',
          type: 'boolean',
          defaultValue: true,
          description: 'Whether section ambience loops.'
        },
        {
          keyword: '@ambienceFadeInMs',
          field: 'ambienceFadeInMs',
          type: 'number',
          defaultValue: 0,
          description: 'Section ambience fade-in metadata in milliseconds.'
        },
        {
          keyword: '@ambienceFadeOutMs',
          field: 'ambienceFadeOutMs',
          type: 'number',
          defaultValue: 0,
          description: 'Section ambience fade-out metadata in milliseconds.'
        },
        {
          keyword: '@sfx',
          field: 'sfx',
          type: 'stringList',
          repeatable: true,
          defaultValue: [],
          description: 'One-shot SFX URL(s) played when section is entered.'
        },
        {
          keyword: '@backdrop',
          field: 'backdrop',
          type: 'string',
          defaultValue: null,
          description: 'Backdrop URL hint for cinematic renderers.'
        },
        {
          keyword: '@shot',
          field: 'shot',
          type: 'enum',
          enumValues: ['wide', 'medium', 'close', 'extreme_close'],
          defaultValue: 'medium',
          description: 'Cinematic framing hint.'
        },
        {
          keyword: '@textPacing',
          field: 'textPacing',
          type: 'enum',
          enumValues: ['instant', 'typed', 'cinematic'],
          defaultValue: 'instant',
          description: 'Text pacing hint.'
        }
      ]
    },
    choice: {
      title: 'Choice',
      properties: [
        {
          keyword: '@targetType',
          field: 'targetType',
          type: 'enum',
          enumValues: ['section', 'scene'],
          defaultValue: 'section',
          description: 'Target type for this choice.'
        },
        {
          keyword: '@target',
          field: 'target',
          type: 'targetRef',
          defaultValue: null,
          description: 'Target section/scene ref.'
        },
        {
          keyword: '@choiceSfx',
          field: 'choiceSfx',
          type: 'string',
          defaultValue: null,
          description: 'SFX URL played on selection.'
        },
        {
          keyword: '@focusSfx',
          field: 'focusSfx',
          type: 'string',
          defaultValue: null,
          description: 'SFX URL played on focus/hover.'
        },
        {
          keyword: '@choiceStyle',
          field: 'choiceStyle',
          type: 'enum',
          enumValues: ['default', 'primary', 'subtle', 'danger'],
          defaultValue: 'default',
          description: 'Renderer style hint for the choice row.'
        }
      ]
    }
  }
}

function deepClone (value) {
  return JSON.parse(JSON.stringify(value))
}

export function getAuthoringSchema () {
  return deepClone(AUTHORING_SCHEMA)
}

export default AUTHORING_SCHEMA
