import fs from 'fs/promises'
import path from 'path'
import {
  MODULES,
  ROOT_STORY_PATH,
  MODULE_DIR,
  ENDING_TITLES,
  buildModuleRanges,
  buildSectionIndex,
  titleForId
} from './thrones-config.mjs'

const args = new Set(process.argv.slice(2))
const force = args.has('--force')
const filled = args.has('--filled') || args.has('--full')

const moduleProfiles = {
  '00-prologue-core.partial.if': {
    tone: 'fracturing succession',
    sensory: ['rain on stone', 'septa wax', 'wet leather', 'horse sweat', 'cold river mist', 'lamp smoke'],
    locations: ['Riverrun hall', 'the godswood bridge', 'the rookery stair', 'the river gate', 'the old granary'],
    factions: ['Tully bannermen', 'Stark envoys', 'Lannister factors', 'riverland hedge lords', 'silent septons'],
    named: ['Catelyn Stark', 'Ser Brynden Tully', 'Petyr Baelish', 'Varys'],
    honorVar: 'north_trust',
    intrigueVar: 'crown_trust',
    externalVar: 'watch_trust'
  },
  '01-act1-kingsroad.partial.if': {
    tone: 'roadside coercion',
    sensory: ['mud and axle grease', 'wet fur cloaks', 'charcoal smoke', 'cold oat mash', 'blood in straw'],
    locations: ['the kingsroad checkpoint', 'an inn yard', 'a torchlit ford', 'a wagon camp', 'a burned toll post'],
    factions: ['northern outriders', 'goldcloak couriers', 'Lannister outriders', 'deserter bands', 'riverland scouts'],
    named: ['Yoren', 'Jory Cassel', 'Sandor Clegane', 'Jaime Lannister'],
    honorVar: 'north_trust',
    intrigueVar: 'leverage',
    externalVar: 'essos_ties'
  },
  '01-act1-court.partial.if': {
    tone: 'capital poison',
    sensory: ['perfume over rot', 'warm wine dregs', 'ink and incense', 'orange peel and candle soot', 'salt drafts from Blackwater'],
    locations: ['the Red Keep gallery', 'the small council antechamber', 'Maegor\'s steps', 'the black cells corridor', 'the counting room'],
    factions: ['court whisperers', 'the queen\'s household', 'the master of coin\'s scribes', 'the city watch command', 'crown petitioners'],
    named: ['Cersei Lannister', 'Tyrion Lannister', 'Varys', 'Grand Maester Pycelle'],
    honorVar: 'crown_trust',
    intrigueVar: 'secrecy',
    externalVar: 'essos_ties'
  },
  '01-act1-arc-stark-lannister.partial.if': {
    tone: 'wolf-lion escalation',
    sensory: ['fresh blood and rainwater', 'splintered shields', 'horse foam', 'iron and mud', 'fletching resin'],
    locations: ['a river crossing', 'a seized watchtower', 'a roadside sept', 'a looted granary', 'a command pavilion'],
    factions: ['Stark household guards', 'Lannister levy captains', 'riverland levies', 'mercenary free riders', 'frightened townsfolk'],
    named: ['Robb Stark', 'Tywin Lannister', 'Theon Greyjoy', 'Brienne of Tarth'],
    honorVar: 'north_trust',
    intrigueVar: 'ruthlessness',
    externalVar: 'war_readiness'
  },
  '02-act2-riverlands.partial.if': {
    tone: 'civilian collapse',
    sensory: ['burned wheat', 'grave soil', 'stale ale', 'river algae', 'wet wool shrouds'],
    locations: ['a flooded hamlet', 'a ferry hold', 'a ruined mill', 'a burial field', 'a commandeered sept'],
    factions: ['hungry peasants', 'broken men', 'lordly tax riders', 'refugee caravans', 'vigilant septas'],
    named: ['Edmure Tully', 'Sandor Clegane', 'Arya Stark', 'Beric Dondarrion'],
    honorVar: 'honor',
    intrigueVar: 'ruthlessness',
    externalVar: 'wealth'
  },
  '02-act2-north.partial.if': {
    tone: 'distance and duty',
    sensory: ['pine smoke', 'old snow', 'frozen leather', 'wolf musk', 'cold iron'],
    locations: ['Winterfell\'s outer yard', 'a longhall firepit', 'the Wolfswood track', 'a frozen ford', 'the rookery loft'],
    factions: ['northmen lords', 'Karstark riders', 'Mormont retainers', 'household stewards', 'green boys with spears'],
    named: ['Robb Stark', 'Maester Luwin', 'Catelyn Stark', 'Roose Bolton'],
    honorVar: 'north_trust',
    intrigueVar: 'secrecy',
    externalVar: 'war_readiness'
  },
  '02-act2-arc-nightwatch.partial.if': {
    tone: 'frontier attrition',
    sensory: ['old pine tar', 'stale salt pork', 'frozen latrines', 'damp wool', 'torch pitch'],
    locations: ['Castle Black yard', 'the Wall lift', 'a northern gate tunnel', 'a rangers\' barracks', 'the ice stores'],
    factions: ['black brothers', 'new recruits', 'steward officers', 'rangers', 'northern donors'],
    named: ['Jon Snow', 'Jeor Mormont', 'Samwell Tarly', 'Alliser Thorne'],
    honorVar: 'watch_trust',
    intrigueVar: 'secrecy',
    externalVar: 'war_readiness'
  },
  '03-act3-crownlands.partial.if': {
    tone: 'regime maintenance',
    sensory: ['brine air', 'hot iron braziers', 'wax drippings', 'horse dung', 'sour beer'],
    locations: ['King\'s Landing dockside', 'the city walls', 'the mint quarter', 'the guild row', 'the mud gate'],
    factions: ['gold cloaks', 'dock guilds', 'street priests', 'coin lenders', 'court agents'],
    named: ['Joffrey Baratheon', 'Cersei Lannister', 'Bronn', 'Varys'],
    honorVar: 'crown_trust',
    intrigueVar: 'leverage',
    externalVar: 'wealth'
  },
  '03-act3-stormlands.partial.if': {
    tone: 'banner rivalry',
    sensory: ['storm spray', 'wet chainmail', 'smoke from green wood', 'horse liniment', 'sea salt'],
    locations: ['Storm\'s End yard', 'a cliffside road', 'a siege trench', 'a watch fire ring', 'a broken quay'],
    factions: ['Baratheon loyalists', 'siege engineers', 'stormland levies', 'coastal smugglers', 'feuding household knights'],
    named: ['Stannis Baratheon', 'Renly Baratheon', 'Davos Seaworth', 'Brienne of Tarth'],
    honorVar: 'war_readiness',
    intrigueVar: 'crown_trust',
    externalVar: 'dragon_factor'
  },
  '03-act3-arc-varys-littlefinger.partial.if': {
    tone: 'information warfare',
    sensory: ['damp vellum', 'perfumed oil', 'mouse droppings', 'cheap lamp oil', 'inked fingers'],
    locations: ['the spider\'s passage', 'a counting cellar', 'a hidden stair', 'a brothel office', 'a map room'],
    factions: ['whisper networks', 'coin brokers', 'blackmail targets', 'minor clerks', 'anonymous informants'],
    named: ['Varys', 'Petyr Baelish', 'Tyrion Lannister', 'Sansa Stark'],
    honorVar: 'leverage',
    intrigueVar: 'secrecy',
    externalVar: 'essos_ties'
  },
  '04-act4-essos.partial.if': {
    tone: 'foreign leverage',
    sensory: ['spiced air', 'camel sweat', 'tarred rope', 'sea rot', 'sun-baked stone'],
    locations: ['Pentos harbor', 'a merchant court', 'a caravanserai', 'a slavers\' quay', 'a moneylender garden'],
    factions: ['merchant princes', 'sellsword captains', 'ship factors', 'exiled retainers', 'slave brokers'],
    named: ['Illyrio Mopatis', 'Jorah Mormont', 'Daenerys Targaryen', 'Daario Naharis'],
    honorVar: 'essos_ties',
    intrigueVar: 'wealth',
    externalVar: 'dragon_factor'
  },
  '04-act4-iron-islands.partial.if': {
    tone: 'raider calculus',
    sensory: ['salt spray', 'fish rot', 'wet hemp', 'coal smoke', 'rusted iron'],
    locations: ['Pyke bridge', 'a reaver longhall', 'a saltwife market', 'a sea tower', 'a wave-cut dock'],
    factions: ['ironborn captains', 'shipwright clans', 'salt priests', 'thralls', 'coastal raiders'],
    named: ['Balon Greyjoy', 'Yara Greyjoy', 'Theon Greyjoy', 'Victarion Greyjoy'],
    honorVar: 'war_readiness',
    intrigueVar: 'ruthlessness',
    externalVar: 'wealth'
  },
  '04-act4-arc-targaryen.partial.if': {
    tone: 'dragon question',
    sensory: ['char and spice', 'horse leather', 'sour milk', 'hot brass', 'blood and dust'],
    locations: ['a khalasar camp', 'a burned courtyard', 'a bronze gate', 'a trader\'s terrace', 'a slave pit edge'],
    factions: ['Dothraki riders', 'freedmen militias', 'city brokers', 'Targaryen loyalists', 'mercenary envoys'],
    named: ['Daenerys Targaryen', 'Jorah Mormont', 'Missandei', 'Grey Worm'],
    honorVar: 'dragon_factor',
    intrigueVar: 'essos_ties',
    externalVar: 'war_readiness'
  },
  '05-act5-war-council.partial.if': {
    tone: 'coalition strain',
    sensory: ['sweat over parchment', 'stale trench stew', 'tallow candles', 'horse blood', 'wet wool cloaks'],
    locations: ['the war tent', 'a command ridge', 'a baggage yard', 'a signal tower', 'a surgeon\'s awning'],
    factions: ['council lords', 'quartermasters', 'field captains', 'ravencall scribes', 'hostage keepers'],
    named: ['Robb Stark', 'Stannis Baratheon', 'Tyrion Lannister', 'Davos Seaworth'],
    honorVar: 'war_readiness',
    intrigueVar: 'leverage',
    externalVar: 'survival_clock'
  },
  '05-act5-battlefront.partial.if': {
    tone: 'attritional violence',
    sensory: ['mud and blood', 'shattered ash wood', 'smoke and sulfur', 'fear sweat', 'wet ash'],
    locations: ['a shield wall breach', 'a river crossing', 'a hill redoubt', 'a torchline trench', 'a broken gate'],
    factions: ['frontline spears', 'archer companies', 'reserve horse', 'camp followers', 'wounded stragglers'],
    named: ['Jaime Lannister', 'Brienne of Tarth', 'Sandor Clegane', 'Gendry'],
    honorVar: 'war_readiness',
    intrigueVar: 'ruthlessness',
    externalVar: 'survival_clock'
  },
  '05-act5-arc-sacrifice.partial.if': {
    tone: 'cost accounting',
    sensory: ['funeral ash', 'boiled linen', 'fresh grave earth', 'rain on canvas', 'medicinal spirits'],
    locations: ['a field chapel', 'a casualty pit', 'a family crypt', 'a command ledger table', 'a burned manor'],
    factions: ['bereaved bannermen', 'maesters', 'healers', 'vengeful kin', 'witness scribes'],
    named: ['Catelyn Stark', 'Arya Stark', 'Sansa Stark', 'Brienne of Tarth'],
    honorVar: 'honor',
    intrigueVar: 'secrecy',
    externalVar: 'survival_clock'
  },
  '06-endgame-allegiances.partial.if': {
    tone: 'final alignments',
    sensory: ['storm air', 'wax and smoke', 'stale bread', 'wine vinegar', 'wet banners'],
    locations: ['the final oath hall', 'a hostage vault', 'a raven court', 'a supply gate', 'a treaty table'],
    factions: ['remaining lords', 'hostage households', 'city delegates', 'northern captains', 'watch envoys'],
    named: ['Tyrion Lannister', 'Varys', 'Robb Stark', 'Davos Seaworth'],
    honorVar: 'honor',
    intrigueVar: 'leverage',
    externalVar: 'survival_clock'
  },
  '06-endgame-siege.partial.if': {
    tone: 'terminal siege',
    sensory: ['pitch smoke', 'collapsed stone dust', 'boiling oil', 'burnt grain', 'fear sweat'],
    locations: ['a breached wall', 'a battered gate', 'a signal tower', 'a granary hold', 'a command parapet'],
    factions: ['siege crews', 'defenders', 'desperate civilians', 'city watch remnants', 'foreign sellswords'],
    named: ['Cersei Lannister', 'Jaime Lannister', 'Sandor Clegane', 'Arya Stark'],
    honorVar: 'war_readiness',
    intrigueVar: 'ruthlessness',
    externalVar: 'dragon_factor'
  },
  '06-endgame-throne.partial.if': {
    tone: 'succession settlement',
    sensory: ['cold iron', 'throne room dust', 'spilled wine', 'wax smoke', 'metal polish'],
    locations: ['the Iron Throne dais', 'the king\'s solar', 'the white sword tower', 'the court gallery', 'the map chamber'],
    factions: ['claimant houses', 'crown guards', 'silent scribes', 'foreign envoys', 'faith delegates'],
    named: ['Daenerys Targaryen', 'Tyrion Lannister', 'Sansa Stark', 'Varys'],
    honorVar: 'crown_trust',
    intrigueVar: 'secrecy',
    externalVar: 'dragon_factor'
  },
  '06-endgame-ashes.partial.if': {
    tone: 'terminal reckoning',
    sensory: ['wet ash', 'charred grain', 'smoke-clogged lungs', 'rust and rain', 'burning pitch'],
    locations: ['the blackened market', 'an empty keep', 'a dead quay', 'a ruined sept', 'a refugee road'],
    factions: ['survivor bands', 'orphaned squires', 'exhausted guards', 'grave crews', 'last envoys'],
    named: ['Brienne of Tarth', 'Davos Seaworth', 'Arya Stark', 'Jon Snow'],
    honorVar: 'honor',
    intrigueVar: 'ruthlessness',
    externalVar: 'survival_clock'
  }
}

const honorChoiceTemplates = [
  'Call witnesses, swear the terms aloud, and tie House Valehart to an enforceable public oath',
  'Pay the cost in open daylight and make your allies answerable before their own banners',
  'Take the lawful road, absorb the immediate loss, and force both rivals to honor signed terms',
  'Give the north what was promised, even if it weakens your leverage in the short war',
  'Refuse the hidden dagger, choose public accountability, and let your name carry the risk'
]

const intrigueChoiceTemplates = [
  'Seal the chamber, trade favors in whispers, and move the board before honorable rivals can react',
  'Use blackmail ledgers and selective truths to fracture opposition from inside its own command',
  'Buy silence, plant deniable rumors, and convert uncertainty into leverage for Valehart',
  'Accept a dirty compromise that secures position today and postpones moral cost for later',
  'Pressure the weaker witness, force a quiet concession, and keep your fingerprints off the decree'
]

const externalChoiceTemplates = [
  'Spend coin on speed, reopen your Essosi channels, and outsource pressure to distant partners',
  'Commit scarce treasury to ships and scouts, gambling that mobility matters more than pride',
  'Expand foreign ties now, knowing every new ally also imports a new debt to collect later',
  'Fund contingency routes across sea and snow, preparing an exit if the mainland collapses',
  'Trade immediate wealth for long-range survival options your rivals cannot yet see'
]

const consequenceTemplates = [
  'A divided banner house demands proof before sunrise and threatens to break ranks if you hedge again.',
  'Quartermasters start rationing grain by loyalty, turning every speech into a logistical referendum.',
  'Raven chains mutate the story before supper, and your enemies now quote your words with edits.',
  'Hostage politics harden: each delay risks one more execution and one fewer negotiable ally.',
  'Your captains report rising desertion, not from fear of battle, but from fear of incoherent command.',
  'The cost of neutrality spikes; by dawn, every neutral lord expects payment in coin, blood, or marriage.'
]

function sectionWordCountHint (text) {
  return text.split(/\s+/).filter(Boolean).length
}

function profileForModule (module) {
  return moduleProfiles[module.file] || moduleProfiles['00-prologue-core.partial.if']
}

function storyboardLabel (id) {
  return `S${String(id).padStart(3, '0')}`
}

function shotForId (id) {
  const shots = ['wide', 'medium', 'close']
  return shots[id % shots.length]
}

function backdropFor (id, module) {
  const slug = module.file.replace('.partial.if', '').replace(/[^a-z0-9-]/gi, '-')
  return `https://example.com/thrones/${slug}/frame-${String(id).padStart(3, '0')}.jpg`
}

function pick (list, seed) {
  return list[seed % list.length]
}

function templateVar (name) {
  return '$' + `{${name}}`
}

function sectionNarrative (section, module) {
  if (!filled) {
    return [
      `TODO [${storyboardLabel(section.id)}]: Write 120-220 words for ${section.title}.`,
      'Must include one vivid sensory anchor, one strategic consequence, and distinct player intent in each choice.'
    ].join(' ')
  }

  const profile = profileForModule(module)
  const location = pick(profile.locations, section.id)
  const sensory = pick(profile.sensory, section.id * 2)
  const faction = pick(profile.factions, section.id * 3)
  const namedA = pick(profile.named, section.id * 5)
  const namedB = pick(profile.named, section.id * 7 + 1)
  const consequence = pick(consequenceTemplates, section.id * 11)

  const paragraph1 = `${location.charAt(0).toUpperCase() + location.slice(1)} smells of ${sensory}, and the torchlight turns every noble face into a mask. House Valehart is no longer a minor footnote in someone else's war; today, your decision can redirect riders, grain, and hostages across three regions. ${namedA} tests your posture in public while ${namedB} studies your pauses for weakness, and ${faction} wait to see whether your promises are law or theater.`

  const paragraph2 = `The conflict in this chapter is ${profile.tone}: one move taken cleanly may cost influence tomorrow, while one hidden bargain can rot your coalition from inside. ${consequence} If you overreach, your enemies will call you reckless. If you hesitate, your allies will call you dead weight. Either way, this is the point where polite politics ends and enforceable power begins.`

  const paragraph3 = `Your ledger narrows to hard numbers: honor=${templateVar('honor')}, ruthlessness=${templateVar('ruthlessness')}, secrecy=${templateVar('secrecy')}, leverage=${templateVar('leverage')}, war_readiness=${templateVar('war_readiness')}, wealth=${templateVar('wealth')}, north_trust=${templateVar('north_trust')}, crown_trust=${templateVar('crown_trust')}, watch_trust=${templateVar('watch_trust')}, essos_ties=${templateVar('essos_ties')}, dragon_factor=${templateVar('dragon_factor')}, survival_clock=${templateVar('survival_clock')}. You can still choose what kind of ruler-history remembers, but not whether history is already recording you.`

  const text = `${paragraph1}\n\n${paragraph2}\n\n${paragraph3}`
  const words = sectionWordCountHint(text)

  if (words < 120) {
    return `${text}\n\nYou steady your breathing, decide which cost you can survive, and give the order.`
  }

  return text
}

function endingNarrative (title) {
  const endings = {
    [ENDING_TITLES[0]]: [
      'The realm does not call it peace at first. It calls it exhaustion with signatures. You hold the line long enough to force oaths into public record, to make grain shipments more valuable than vengeance speeches, and to keep three rival councils in the same room until dawn. No one leaves happy, but they leave bound.',
      'House Valehart becomes the hinge of a hard settlement: watch garrisons are funded, northern grievances are acknowledged, and crown policy finally answers to measurable obligations. You are celebrated in one hall and cursed in the next, yet caravans move and winter stores fill. In a broken age, that is close enough to justice.'
    ].join('\n\n'),
    [ENDING_TITLES[1]]: [
      'You centralize power with terrifying efficiency. Dissent shrinks because dissenters disappear, and the court learns to read your face before speaking. Taxes arrive. Roads clear. Armies obey. The machine works exactly as designed, because fear is a cheap fuel and you never let the reservoir run dry.',
      'But the realm under your order is brittle. Houses kneel without loyalty, captains salute without trust, and every son raised under your reign learns patience as revenge. House Valehart keeps the throne. It may not keep the century.'
    ].join('\n\n'),
    [ENDING_TITLES[2]]: [
      'You decline the visible crown and keep the hidden levers. Claimants rise and fall in public while your couriers decide who eats, who pays, and who receives warning before an arrest. The spiderweb outlives each individual ruler because it is fed by logistics, ledgers, and carefully rationed truth.',
      'Official histories barely mention Valehart. Unofficially, every faction checks your response before committing troops. You do not rule by decree. You rule by indispensability.'
    ].join('\n\n'),
    [ENDING_TITLES[3]]: [
      'You leave the continent alive, solvent, and hated by precisely the people who expected you to die usefully. In Essos, no one cares about your old titles unless your ships arrive on time and your coin clears in full. You adapt quickly.',
      'House Valehart survives as a maritime power running contracts, intelligence, and emergency extraction routes across the Narrow Sea. The Seven Kingdoms remain unfinished business, but now they must negotiate on your timetable.'
    ].join('\n\n'),
    [ENDING_TITLES[4]]: [
      'You won every argument except the one that mattered. Warnings from the Wall were treated as bargaining posture until scouts stopped returning and whole roads vanished under unnatural cold. By the time the south accepted the threat, mobilization windows had already closed.',
      'The Long Night advances through the holes politics left behind. House Valehart is remembered not as traitorous, but fatally misprioritized: brilliant at court war, late to existential war.'
    ].join('\n\n'),
    [ENDING_TITLES[5]]: [
      'The final offensives burn the supply grid that kept the realm alive. Cities hold for weeks, then starve. Castles survive sieges only to collapse under winter debt. Victory loses meaning because infrastructure dies faster than dynasties can celebrate.',
      'House Valehart endures in records and scattered bloodlines, but the kingdom map dissolves into fortified enclaves trading ash for grain. The age does not end with a coronation. It ends with smoke.'
    ].join('\n\n')
  }

  return endings[title] || 'No chronicler agrees on the final years, only that the decisions made here changed what remained of the realm.'
}

function buildChoiceTexts (id) {
  return {
    honor: pick(honorChoiceTemplates, id),
    intrigue: pick(intrigueChoiceTemplates, id * 3),
    external: pick(externalChoiceTemplates, id * 5)
  }
}

function buildDeltaActions (orderedDeltas) {
  const totals = new Map()
  const order = []

  for (const [name, delta] of orderedDeltas) {
    if (typeof delta !== 'number' || delta === 0) continue
    if (!totals.has(name)) order.push(name)
    totals.set(name, (totals.get(name) || 0) + delta)
  }

  return order
    .map(name => [name, totals.get(name)])
    .filter(([, delta]) => delta !== 0)
    .map(([name, delta]) => {
      const expression = delta > 0
        ? `${name} + ${delta}`
        : `${name} - ${Math.abs(delta)}`
      return `@action ${name} = clampStat(${expression}, 0, 30)`
    })
}

function buildRegularChoices (id, module) {
  const profile = profileForModule(module)
  const targetA = titleForId(Math.min(id + 1, 426))
  const targetB = titleForId(Math.min(id + 2, 426))
  const targetC = titleForId(Math.min(id + 3, 426))

  const texts = buildChoiceTexts(id)
  const gateA = 5 + (id % 4)
  const gateB = 7 + (id % 5)

  const honorActions = buildDeltaActions([
    ['honor', 1],
    [profile.honorVar, 1],
    ['war_readiness', 1],
    ['survival_clock', -1]
  ])

  const intrigueActions = buildDeltaActions([
    ['ruthlessness', 1],
    ['secrecy', 1],
    [profile.intrigueVar, 1],
    ['leverage', 1],
    ['survival_clock', -1]
  ])

  const externalActions = buildDeltaActions([
    ['wealth', -1],
    [profile.externalVar, 1],
    ['essos_ties', 1],
    ['dragon_factor', 1],
    ['survival_clock', -1]
  ])

  const choiceA = [
    '  choice__',
    `    @target "${targetA}"`,
    ...honorActions.map(action => `    ${action}`),
    `    "${texts.honor}"`,
    '  __choice'
  ].join('\n')

  const choiceB = [
    '  choice__',
    `    @target "${targetB}"`,
    ...(id % 2 === 0 ? [`    @when ((secrecy + leverage) >= ${gateA})`] : []),
    ...intrigueActions.map(action => `    ${action}`),
    `    "${texts.intrigue}"`,
    '  __choice'
  ].join('\n')

  const withThirdChoice = id % 5 === 0 || id % 7 === 0
  if (!withThirdChoice) return [choiceA, choiceB].join('\n\n')

  const choiceC = [
    '  choice__',
    `    @target "${targetC}"`,
    `    @when ((wealth + essos_ties + dragon_factor) >= ${gateB})`,
    ...externalActions.map(action => `    ${action}`),
    `    "${texts.external}"`,
    '  __choice'
  ].join('\n')

  return [choiceA, choiceB, choiceC].join('\n\n')
}

function buildFinalGateChoices () {
  return [
    [
      '  choice__',
      `    @target "${ENDING_TITLES[0]}"`,
      '    @when ((honor >= ruthlessness) && ((north_trust + watch_trust) >= 14) && (war_readiness >= 12))',
      '    "Codify peace through public law, shared grain guarantees, and northern security compacts"',
      '  __choice'
    ].join('\n'),
    [
      '  choice__',
      `    @target "${ENDING_TITLES[1]}"`,
      '    @when ((ruthlessness >= honor + 2) && ((crown_trust + leverage) >= 15) && (dragon_factor < 8))',
      '    "Centralize power through fear, debt enforcement, and military command"',
      '  __choice'
    ].join('\n'),
    [
      '  choice__',
      `    @target "${ENDING_TITLES[2]}"`,
      '    @when (((secrecy + leverage) >= 18) && (survival_clock >= 3))',
      '    "Rule invisibly through logistics, intelligence routes, and deniable patronage"',
      '  __choice'
    ].join('\n'),
    [
      '  choice__',
      `    @target "${ENDING_TITLES[3]}"`,
      '    @when ((essos_ties >= 10) && (dragon_factor >= 8))',
      '    "Withdraw to Essos with fleet, treasury, and selected loyal houses"',
      '  __choice'
    ].join('\n'),
    [
      '  choice__',
      `    @target "${ENDING_TITLES[4]}"`,
      '    @when ((watch_trust <= 3) && (war_readiness <= 8))',
      '    "Delay northern defense and prioritize throne politics one season too long"',
      '  __choice'
    ].join('\n'),
    [
      '  choice__',
      `    @target "${ENDING_TITLES[5]}"`,
      '    "Force a final military settlement, even if the realm burns in the process"',
      '  __choice'
    ].join('\n')
  ].join('\n\n')
}

function buildSectionBlock (section, module) {
  if (section.isEnding) {
    return [
      'section__',
      `  @title "${section.title}"`,
      '  @textPacing "cinematic"',
      '  @shot "close"',
      `  @backdrop "${backdropFor(section.id, module)}"`,
      '',
      `  "${endingNarrative(section.title)}"`,
      '__section'
    ].join('\n')
  }

  const text = sectionNarrative(section, module)
  const choices = section.id === 426 ? buildFinalGateChoices() : buildRegularChoices(section.id, module)

  return [
    'section__',
    `  @title "${section.title}"`,
    '  @textPacing "cinematic"',
    `  @shot "${shotForId(section.id)}"`,
    `  @backdrop "${backdropFor(section.id, module)}"`,
    '',
    `  "${text}"`,
    '',
    choices,
    '__section'
  ].join('\n')
}

function buildModuleContent (module, sections) {
  const firstTitle = sections[0].title
  const sectionRefs = sections.map(section => `"${section.title}"`).join(' ')
  const blocks = sections.map(section => buildSectionBlock(section, module)).join('\n\n')

  return [
    `/* Thrones module: ${module.file} */`,
    'scene__',
    `  @name "${module.sceneName}"`,
    `  @first "${firstTitle}"`,
    `  @sections ${sectionRefs}`,
    '__scene',
    '',
    blocks,
    ''
  ].join('\n')
}

function buildRootStory () {
  const imports = MODULES.map(module => `import__"thrones/${module.file}"__import`).join('\n')

  return [
    'settings__',
    '  @storyTitle "Thrones"',
    '  @startAt "T001 - ACT0 - Oath at Riverrun"',
    '  @maxIterations 20000',
    '  @maxCallDepth 2000',
    '  @theme "cinematic"',
    '  @presentationMode "cinematic"',
    '  @allowUndo true',
    '  @showTurn true',
    '  @animations true',
    '  @autoSave true',
    '  @statusBar honor true "Honor"',
    '  @statusBar ruthlessness true "Ruthlessness"',
    '  @statusBar secrecy true "Secrecy"',
    '  @statusBar leverage true "Leverage"',
    '  @statusBar war_readiness true "War Readiness"',
    '  @statusBar survival_clock true "Survival"',
    '__settings',
    '',
    'honor = 7',
    'ruthlessness = 4',
    'secrecy = 5',
    'leverage = 6',
    'war_readiness = 5',
    'wealth = 7',
    'north_trust = 6',
    'crown_trust = 5',
    'watch_trust = 4',
    'essos_ties = 3',
    'dragon_factor = 2',
    'survival_clock = 18',
    'house_name = "Valehart"',
    'player_title = "Heir of House Valehart"',
    '',
    'function__ clampStat(value, minValue, maxValue) {',
    '  if__ (value < minValue) {',
    '    return__ minValue',
    '  }',
    '  if__ (value > maxValue) {',
    '    return__ maxValue',
    '  }',
    '  return__ value',
    '}',
    '',
    'function__ pressureIndex() {',
    '  return__ (ruthlessness + secrecy + leverage + dragon_factor) - honor',
    '}',
    '',
    'function__ allianceIndex() {',
    '  return__ north_trust + crown_trust + watch_trust + essos_ties',
    '}',
    '',
    imports,
    ''
  ].join('\n')
}

async function writeMaybe (filePath, content) {
  try {
    await fs.access(filePath)
    if (!force) return { state: 'skipped' }
  } catch (_) {
    // Missing file. Continue.
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content, 'utf-8')
  return { state: 'written' }
}

async function run () {
  const rootPath = path.resolve(process.cwd(), ROOT_STORY_PATH)
  const moduleDirPath = path.resolve(process.cwd(), MODULE_DIR)
  const ranges = buildModuleRanges()
  const sectionIndex = buildSectionIndex()

  await fs.mkdir(moduleDirPath, { recursive: true })

  const rootResult = await writeMaybe(rootPath, buildRootStory())
  let written = rootResult.state === 'written' ? 1 : 0
  let skipped = rootResult.state === 'skipped' ? 1 : 0

  for (const range of ranges) {
    const filePath = path.join(moduleDirPath, range.file)
    const sections = sectionIndex.filter(section => section.id >= range.startId && section.id <= range.endId)
    const result = await writeMaybe(filePath, buildModuleContent(range, sections))
    if (result.state === 'written') written += 1
    if (result.state === 'skipped') skipped += 1
  }

  process.stdout.write(`Thrones scaffold complete. written=${written}, skipped=${skipped}, force=${force}, filled=${filled}\n`)
}

run().catch(error => {
  process.stderr.write(`thrones scaffold failed: ${error.stack || error.message}\n`)
  process.exit(1)
})
