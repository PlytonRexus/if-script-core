import AudioAdapter from '../src/runtime/session/AudioAdapter.mjs'
import { pathToFileURL } from 'url'
import {
  assert,
  assertEqual,
  runTestSuite
} from './test-utils.mjs'

class FakeAudio {
  constructor () {
    this.src = ''
    this.currentSrc = ''
    this.loop = true
    this.volume = 1
    this.currentTime = 0
    this.paused = true
    this._listeners = new Map()
  }

  addEventListener (eventName, handler) {
    if (!this._listeners.has(eventName)) this._listeners.set(eventName, [])
    this._listeners.get(eventName).push(handler)
  }

  emit (eventName) {
    const handlers = this._listeners.get(eventName) || []
    handlers.forEach(handler => handler())
  }

  play () {
    this.paused = false
    this.currentSrc = this.src
    this.emit('play')
    return Promise.resolve()
  }

  pause () {
    this.paused = true
  }

  removeAttribute (name) {
    if (name !== 'src') return
    this.src = ''
    this.currentSrc = ''
  }

  load () {}
}

function withFakeAudio (fn) {
  const previous = globalThis.Audio
  globalThis.Audio = FakeAudio
  return Promise.resolve()
    .then(() => fn())
    .finally(() => {
      globalThis.Audio = previous
    })
}

async function testBackgroundPriorityFallbackOrder () {
  await withFakeAudio(() => {
    const audio = new AudioAdapter()

    audio.applyStory({
      storyAmbience: 'story.mp3',
      storyAmbienceVolume: 0.2,
      storyAmbienceLoop: true
    })
    assertEqual(audio.channels.storyAmbience.paused, false, 'story ambience should play when it is the only background source')

    audio.applyScene({
      music: 'scene.mp3',
      musicVolume: 0.4,
      musicLoop: true
    })
    assertEqual(audio.channels.sceneMusic.paused, false, 'scene music should override story ambience')
    assertEqual(audio.channels.storyAmbience.paused, true, 'story ambience should pause when scene music is available')

    audio.applySection({
      ambience: 'section.mp3',
      ambienceVolume: 0.5,
      ambienceLoop: true
    })
    assertEqual(audio.channels.ambience.paused, false, 'section ambience should override scene music')
    assertEqual(audio.channels.sceneMusic.paused, true, 'scene music should pause while section ambience is active')

    audio.applySection({ ambience: null })
    assertEqual(audio.channels.sceneMusic.paused, false, 'scene music should resume when section ambience clears')

    audio.applyScene({ music: null })
    assertEqual(audio.channels.storyAmbience.paused, false, 'story ambience should resume when scene music clears')
  })
}

async function testNaturalEndFallsBackToLowerPriority () {
  await withFakeAudio(() => {
    const audio = new AudioAdapter()

    audio.applyStory({
      storyAmbience: 'story.mp3',
      storyAmbienceLoop: true
    })
    audio.applyScene({
      music: 'scene.mp3',
      musicLoop: false
    })
    audio.applySection({
      ambience: 'section.mp3',
      ambienceLoop: false
    })

    audio.channels.ambience.emit('ended')
    assertEqual(audio.lastState.ambienceUrl, null, 'natural section ambience end should clear ambience state')
    assertEqual(audio.channels.sceneMusic.paused, false, 'scene music should resume after non-looping ambience ends')

    audio.channels.sceneMusic.emit('ended')
    assertEqual(audio.lastState.sceneMusicUrl, null, 'natural scene music end should clear scene music state')
    assertEqual(audio.channels.storyAmbience.paused, false, 'story ambience should resume after non-looping scene music ends')
  })
}

async function testMuteAndPauseRespectPriorityPlayback () {
  await withFakeAudio(() => {
    const audio = new AudioAdapter()

    audio.applyStory({ storyAmbience: 'story.mp3', storyAmbienceLoop: true })
    audio.applyScene({ music: 'scene.mp3', musicLoop: true })
    assertEqual(audio.channels.sceneMusic.paused, false, 'scene music should initially be active')

    audio.setEnabled(false)
    assertEqual(audio.channels.sceneMusic.paused, true, 'mute should pause active scene music')
    assertEqual(audio.channels.storyAmbience.paused, true, 'mute should pause lower-priority story ambience')

    audio.setEnabled(true)
    assertEqual(audio.channels.sceneMusic.paused, false, 'unmute should resume highest-priority available background')
    assertEqual(audio.channels.storyAmbience.paused, true, 'lower-priority background should remain paused after unmute')

    audio.pausePlayback()
    assertEqual(audio.channels.sceneMusic.paused, true, 'pause should stop active background')

    audio.resumePlayback()
    assertEqual(audio.channels.sceneMusic.paused, false, 'play should restore active background according to priority')
  })
}

export async function runAudioAdapterTests () {
  return runTestSuite('Runtime Audio Adapter Tests', [
    { name: 'resolve background priority fallback order', fn: testBackgroundPriorityFallbackOrder },
    { name: 'fallback correctly on natural channel end', fn: testNaturalEndFallsBackToLowerPriority },
    { name: 'mute/pause controls preserve priority', fn: testMuteAndPauseRespectPriorityPlayback }
  ])
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runAudioAdapterTests()
    .then(passed => process.exit(passed ? 0 : 1))
    .catch(err => {
      console.error(err)
      process.exit(1)
    })
}
