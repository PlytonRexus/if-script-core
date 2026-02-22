export const ROOT_STORY_PATH = 'test/fixtures/stories/thrones-main.if'
export const MODULE_DIR = 'test/fixtures/stories/thrones'

export const MODULES = [
  { file: '00-prologue-core.partial.if', count: 24, actTag: 'ACT0', sceneName: 'ACT0: Oaths on the Trident' },
  { file: '01-act1-kingsroad.partial.if', count: 24, actTag: 'ACT1', sceneName: 'ACT1: Kingsroad Fractures' },
  { file: '01-act1-court.partial.if', count: 24, actTag: 'ACT1', sceneName: 'ACT1: Red Keep Intrigue' },
  { file: '01-act1-arc-stark-lannister.partial.if', count: 24, actTag: 'ACT1', sceneName: 'ACT1: Wolves and Lions' },
  { file: '02-act2-riverlands.partial.if', count: 24, actTag: 'ACT2', sceneName: 'ACT2: Riverlands Burning' },
  { file: '02-act2-north.partial.if', count: 24, actTag: 'ACT2', sceneName: 'ACT2: Northern Musters' },
  { file: '02-act2-arc-nightwatch.partial.if', count: 24, actTag: 'ACT2', sceneName: 'ACT2: Black Brothers' },
  { file: '03-act3-crownlands.partial.if', count: 24, actTag: 'ACT3', sceneName: 'ACT3: Crownlands Conspiracy' },
  { file: '03-act3-stormlands.partial.if', count: 24, actTag: 'ACT3', sceneName: 'ACT3: Stormlands Oaths' },
  { file: '03-act3-arc-varys-littlefinger.partial.if', count: 24, actTag: 'ACT3', sceneName: 'ACT3: Spiders and Coins' },
  { file: '04-act4-essos.partial.if', count: 24, actTag: 'ACT4', sceneName: 'ACT4: Essosi Bargains' },
  { file: '04-act4-iron-islands.partial.if', count: 24, actTag: 'ACT4', sceneName: 'ACT4: Salt and Iron' },
  { file: '04-act4-arc-targaryen.partial.if', count: 24, actTag: 'ACT4', sceneName: 'ACT4: Dragons and Pretenders' },
  { file: '05-act5-war-council.partial.if', count: 24, actTag: 'ACT5', sceneName: 'ACT5: War Council' },
  { file: '05-act5-battlefront.partial.if', count: 24, actTag: 'ACT5', sceneName: 'ACT5: Field of Crows' },
  { file: '05-act5-arc-sacrifice.partial.if', count: 24, actTag: 'ACT5', sceneName: 'ACT5: The Price of Blood' },
  { file: '06-endgame-allegiances.partial.if', count: 12, actTag: 'ACT6', sceneName: 'ACT6: Allegiance Reckoning' },
  { file: '06-endgame-siege.partial.if', count: 12, actTag: 'ACT6', sceneName: 'ACT6: Siege Lines' },
  { file: '06-endgame-throne.partial.if', count: 12, actTag: 'ACT6', sceneName: 'ACT6: Throne Calculus' },
  { file: '06-endgame-ashes.partial.if', count: 12, actTag: 'ACT6', sceneName: 'ACT6: Last Ashes' }
]

export const ENDING_TITLES = [
  'END-A: The Just Crown',
  'END-B: The Iron Tyrant',
  'END-C: The Hidden Kingmaker',
  'END-D: Exile Across the Narrow Sea',
  'END-E: The Long Night Unchecked',
  'END-F: Ashes of the Seven Kingdoms'
]

const FIRST_TITLE = 'Oath at Riverrun'

const places = [
  'Riverrun',
  'The Kingsroad',
  'The Red Keep',
  'Winterfell',
  'The Twins',
  'Harrenhal',
  'Dragonstone',
  'Blackwater Bay',
  'The Dreadfort',
  'The Eyrie',
  'Pentos',
  'Qarth',
  'The Wall',
  'Castle Black',
  'Moat Cailin',
  'Oldtown',
  'Pyke',
  'Highgarden',
  'Sunspear',
  'The Trident'
]

const verbs = [
  'Broken Oath',
  'Sealed Bargain',
  'Whispered Warning',
  'Blackmail Ledger',
  'Border Muster',
  'Silent Betrayal',
  'Raven Intercept',
  'Crown Ultimatum',
  'Hostage Exchange',
  'Night Council',
  'Harbor Ambush',
  'Siege Promise',
  'Debt Collection',
  'Alliance Split',
  'Prison Confession',
  'Torchlit Census',
  'War Map',
  'Salt Pact',
  'Blood Price',
  'Inheritance Claim'
]

const modifiers = [
  'under rain',
  'before witnesses',
  'at first light',
  'by candle smoke',
  'against old law',
  'behind closed doors',
  'with steel drawn',
  'after the feast',
  'under wolf banners',
  'beneath lion seals',
  'in river fog',
  'under moonless sky',
  'at the broken tower',
  'by the harbor chain',
  'before the sept bell',
  'at the rookery',
  'in crowded galleries',
  'near the godswood',
  'at the gatehouse',
  'in the throne shadow'
]

export function padSection (id) {
  return String(id).padStart(3, '0')
}

export function totalSectionCount () {
  return MODULES.reduce((sum, module) => sum + module.count, 0)
}

export function buildModuleRanges () {
  const ranges = []
  let nextStart = 1
  for (const module of MODULES) {
    const startId = nextStart
    const endId = nextStart + module.count - 1
    ranges.push({ ...module, startId, endId })
    nextStart = endId + 1
  }
  return ranges
}

export function resolveModuleById (id) {
  return buildModuleRanges().find(module => id >= module.startId && id <= module.endId)
}

export function titleForId (id) {
  if (id === 1) return FIRST_TITLE
  if (id >= 427 && id <= 432) return ENDING_TITLES[id - 427]

  const module = resolveModuleById(id)
  if (!module) throw new Error(`No module found for section id ${id}`)

  const place = places[id % places.length]
  const verb = verbs[(id * 3) % verbs.length]
  const modifier = modifiers[(id * 7) % modifiers.length]
  return `T${padSection(id)} - ${module.actTag} - ${place} ${verb} ${modifier}`
}

export function buildSectionIndex () {
  const total = totalSectionCount()
  const sections = []
  for (let id = 1; id <= total; id += 1) {
    const module = resolveModuleById(id)
    sections.push({
      id,
      title: titleForId(id),
      moduleFile: module.file,
      actTag: module.actTag,
      sceneName: module.sceneName,
      isEnding: id >= 427
    })
  }
  return sections
}

export function titleToIdMap () {
  const map = new Map()
  for (const section of buildSectionIndex()) {
    map.set(section.title, section.id)
  }
  return map
}
