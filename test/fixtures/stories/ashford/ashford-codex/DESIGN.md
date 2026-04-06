# SHADOWS OF THE HALF-BLOOD PRINCE
### Story Design Document — The Ashford Codex
**Setting:** Harry Potter Universe — 1996–1997 (Year Six)
**Engine:** IF-Script v0.5.8+
**Total scope:** ~810 sections, ~207,000 words across all branches

---

## PART ONE: HIGH-LEVEL OVERVIEW

### Premise

You are **[Name] Ashford**, a sixth-year student at Hogwarts School of Witchcraft and Wizardry. Your parent — Auror **Avery Ashford** — vanished three months ago during a classified investigation. The Ministry ruled it a voluntary disappearance. You know better.

Hidden among your school supplies is Avery's encrypted field journal. Its pages describe a dark artifact Voldemort has been quietly seeking: **the Resonance Mirror**, an ancient object capable of amplifying a caster's killing intent across multiple targets simultaneously — a weapon of mass dark magic. Avery got too close. Now they're gone.

Hogwarts has never felt more dangerous. The Dark Mark scarred the sky over Diagon Alley. Dumbledore disappears on mysterious errands. A pale, hollow-eyed Draco Malfoy moves through the corridors like a ghost with a deadline. And someone at Hogwarts — student or staff — is feeding information to the Death Eaters.

You must decode your parent's journal, protect the Mirror's location, navigate wartime loyalties, survive sixth year, and maybe — *maybe* — find out whether Avery Ashford is still alive.

---

### Themes

- **Identity and legacy** — Who are you beyond your parent's name? Beyond your house?
- **Moral ambiguity** — Good intentions and dark methods. The war doesn't care about your conscience.
- **Love in wartime** — Attachment as strength and vulnerability.
- **Institutional betrayal** — Dumbledore keeps secrets. The Ministry lies. Even Hogwarts has shadows.
- **Complicity** — At what point does knowing something make you responsible for it?

---

### Tone

Blends: mystery and dread (the artifact investigation) + warmth and humour (house life, Slug Club) + romance (slow-burn, earned) + emotional gut-punches (betrayal, loss) + action (duels, the tower sequence).

---

### Protagonist Design

- **House**: Player-chosen at start (affects starting relationships, some exclusive scenes, early dialogue — not the main arc)
- **Parent**: Avery Ashford, Auror, missing. Protagonist's own name is player-chosen.
- **Blood status**: Half-blood
- **Starting stat**: All primaries at 40, morality at 50 (neutral)

---

## PART TWO: SYSTEMS DESIGN

### 2.1 Core Stats (0–100, displayed via @statusBar)

| Stat | Variable | Description | Unlocks |
|------|----------|-------------|---------|
| Courage | `courage` | Boldness under fear | Confrontational, heroic, self-sacrificial choices |
| Cunning | `cunning` | Strategy, manipulation, lateral thinking | Deceptive, analytical, politically shrewd options |
| Empathy | `empathy` | Emotional intelligence | Relationship choices, de-escalation, romance depth |
| Knowledge | `knowledge` | Academic/magical skill | Spell-based solutions, research shortcuts, cipher decoding |
| Light/Dark | `morality` | 0=dark, 100=light, starts at 50 | Primary ending driver; gates faction choices |
| House Rep | `house_rep` | Standing within your house | Peer relationships, house-specific access |

**Stat thresholds for @when gates:**
- Low: < 35
- Moderate: 35–64
- High: ≥ 65
- Morality: "Light" = ≥ 60, "Neutral" = 40–59, "Dark" = ≤ 40

---

### 2.2 Relationship Stats (0–100, hidden)

Starting values:
- `rel_harry = 20`, `rel_hermione = 35`, `rel_ron = 30`
- `rel_draco = 15`, `rel_snape = 20`, `rel_mcgonagall = 40`
- `rel_dumbledore = 25`, `rel_luna = 40`, `rel_neville = 35`, `rel_ginny = 30`
- `rel_elara = 20` (Ravenclaw romance option)
- `rel_marcus = 20` (Slytherin romance option)
- `rel_jade = 35` (Gryffindor romance option)
- `rel_sebastian = 40` (Hufflepuff romance option)

---

### 2.3 Hidden Flags (Boolean unless noted)

**Allegiance:**
- `order_member` — joined Order youth network
- `dark_network_access` — access to Death Eater student network
- `dark_arts_practiced` — used an Unforgivable or Dark hex
- `snape_bargain` — made a deal with Snape
- `snape_bargain_modified` — negotiated a modified version of the deal
- `dumbledore_trusted` — shared journal with Dumbledore
- `allegiance_track` (string: "order"/"dark"/"solo") — set in Ch.10

**Journal / Mirror:**
- `journal_decoded` (int 0–5) — sections deciphered
- `mirror_location_known` — knows Mirror-key location in Room of Hidden Things
- `mirror_key_held` — physically has the obsidian shard
- `mirror_destroyed` — Mirror-key destroyed (requires Dark Arts or special conditions)
- `mirror_voldemort` — Mirror-key surrendered to Voldemort's agents
- `key_given_order` / `key_given_dumbledore` / `key_hidden_again` — Mirror-key disposition in Ch.15

**Parent:**
- `avery_alive` — Avery Ashford survived
- `avery_note_found` — found and decoded final journal coordinates
- `rescue_planned` — protagonist is actively planning to help Avery

**Spy subplot:**
- `spy_known`, `spy_exposed`, `spy_confronted`
- `spy_trap_set` — planted false info to identify the spy
- `spy_leveraged` — blackmailed spy into working for protagonist
- `spy_protected` — shielded spy from consequences (morally costly)
- `spy_investigation_started` — began formal tracking

**Draco thread:**
- `draco_followed` — followed Draco to Room of Requirement
- `draco_helped` — actively helped Draco's mission
- `draco_betrayed` — reported Draco to authority
- `draco_stayed_with` — stayed with Draco at his breaking point
- `draco_bargain` — counter-offered: info in exchange for help
- `draco_mirror_hint` — knows Draco has information about the Mirror
- `cabinet_sabotaged` — tampered with Vanishing Cabinet

**Romance:**
- `romance_active` (string: "elara"/"marcus"/"jade"/"sebastian"/"")
- `romance_consummated` — romance reached emotional peak/commitment
- `elara_secret_known` — knows Elara's father is a Death Eater informant
- `marcus_defection` — helped Marcus make contact with the Order

**Player state:**
- `house` (string: "gryffindor"/"ravenclaw"/"hufflepuff"/"slytherin")
- `threat_noted` — noted the threatening note on the Express
- `l_theory` (string: "luna"/"lupin"/"snape"/"") — who protagonist suspects "L." is
- `fled_hogwarts` — ran during the climax

---

### 2.4 Stat Gates — Key Examples

```
@when courage >= 70    → confront Draco directly in corridor
@when knowledge >= 65  → decode cipher section without help
@when cunning >= 70    → leverage spy instead of exposing them
@when empathy >= 75    → push romance partner away to protect them
@when morality >= 60   → Order allegiance choices fully open
@when morality <= 40   → Dark allegiance choices fully open
@when knowledge >= 65 && cunning >= 65 → sabotage the Vanishing Cabinet
@when rel_draco >= 50  → Draco responds when you call his name at the Tower
```

Disabled choices (with @disabledText) should show the threshold hint so players understand what to build toward.

---

## PART THREE: ROMANCE ARCS

Each romance is woven through chapters 4–17. Only one can reach full commitment per playthrough. Romance phase structure: **Spark (Ch.4) → Tension (Ch.8/11) → Commitment or Fracture (Ch.13) → Resolution (Ch.17)**.

### Elara Voss (Ravenclaw, F)
- **Arc**: Intellectual rivals → reluctant allies → slow-burn confession → devastating secret → choice to forgive or walk away
- **Her secret**: Her father passes information to Death Eaters under duress. She's been protecting him. She's been lying.
- **Complicates with**: Mirror plotline — her family commissioned a study of the Resonance Mirror in 1947
- **Key flag**: `elara_secret_known` — discovered in Ch.13. Without it, romance can't fully commit.
- **Ch.13 choice**: Expose her father (helps Order, destroys relationship) / protect him (morality -15, relationship saved) / find third way (`@when knowledge >= 65`)
- **Full romance**: Requires `elara_secret_known` AND protective/third-way choice AND `rel_elara >= 80`

### Marcus Calloway (Slytherin, M)
- **Arc**: Hostile rival → uneasy truce → dangerous trust → parallel defection → impossible stakes
- **His situation**: From a Death Eater family, quietly trying to defect. Parallel to protagonist's own position.
- **Complicates with**: Draco thread — Marcus and Draco have complicated Slytherin history
- **Key flag**: `marcus_defection` — set in Ch.13 when protagonist helps him contact the Order
- **Ch.13 choice**: Stand with him (requires `courage >= 70`) / help him disappear (`@when cunning >= 65`) / sacrifice his location (morality -20)
- **Full romance**: Requires `marcus_defection` AND standing-with or hiding choice AND `rel_marcus >= 80`

### Jade Okafor (Gryffindor, F)
- **Arc**: Bright friendship → warm affection → confession → wartime separation → reunion or loss
- **Her situation**: Quidditch captain. Selected for a dangerous Order-adjacent mission by her older sibling.
- **Complicates with**: Order membership — if protagonist is Order, Jade trusts them more but is also more drawn into danger
- **Ch.13 choice**: Let her go (she's in danger in Ch.16 if she went) / convince her to stay (she resents it until Ch.16 validates you)
- **Full romance**: Requires `rel_jade >= 80` AND protective choice. Most emotionally reliable across good endings.

### Sebastian Thorne (Hufflepuff, M)
- **Arc**: Gentle comfort → unexpected courage → the test of loyalty → his heart vs. his principles
- **His quality**: Unconditional staying. He doesn't push. He just stays.
- **Complicates with**: Morality system — Sebastian notices dark choices and reacts with fear, not judgment
- **Ch.13 choice**: Come clean completely (he becomes Ch.16 anchor, morality +10) / keep lying (relationship collapses in Ch.16) / push him away to protect him (`@when empathy >= 75`)
- **Full romance**: Most stable across all endings. Only romance still possible in Ending 5 (bittersweet).

---

## PART FOUR: MAJOR STORY BRANCHES

### Branch 1: The Allegiance Path (crystallises Ch.10)
| Track | Entry condition | Variable set |
|-------|----------------|-------------|
| Order | `morality >= 50` by Ch.10 | `allegiance_track = "order"`, `order_member = true` |
| Solo | `morality 40–59`, no strong flags | `allegiance_track = "solo"` |
| Dark | `morality <= 40` OR `dark_arts_practiced` | `allegiance_track = "dark"`, `dark_network_access = true` |

### Branch 2: The Parent's Trail (resolves Ch.9)
| Discovery | Method | Sets |
|-----------|--------|------|
| Avery is alive, imprisoned | Decoded coordinates + any route | `avery_alive = true` |
| Avery's fate unknown | Did not decode coordinates | `avery_alive = false` |
| Avery faked disappearance | `knowledge >= 70 && cunning >= 60` only | Special lore flag, bitter revelation |

### Branch 3: The Mirror's Fate (resolves Ch.15)
| Choice | Requirements | Ending gate |
|--------|-------------|-------------|
| Destroy | `knowledge >= 75 && dark_arts_practiced` | Enables E1, E2, E3 |
| Give to Order | `order_member` | Enables E1, E3 |
| Give to Dumbledore | `dumbledore_trusted` | Enables E1 |
| Hide again | Any | Enables E3, E5a |
| Give to Voldemort | `morality <= 40` | E5b only |

---

## PART FIVE: ENDING CONDITIONS

### Ending 1 — "The Bright Constant"
**Requirements:** `morality >= 70`, `order_member == true`, `spy_exposed == true`, `avery_alive == true`, Mirror destroyed or given to Order/Dumbledore
**Tone:** Hopeful, bittersweet. The war is not over, but this chapter was survived with integrity.
**Function:** `canReachEnding1()`

Epilogue: Battle of Hogwarts flash-forward. Avery recovered from captivity. Mirror was destroyed three months prior. You fight alongside the Order knowing what it cost to get here.

---

### Ending 2 — "The Redeemed Shadow"
**Requirements:** `dark_arts_practiced == true`, `draco_helped == true`, but `morality >= 50` by Ch.17 (recovery arc), Mirror not given to Voldemort, `rel_draco >= 50`
**Tone:** Hard-won redemption. The protagonist did real harm and chose differently when it mattered.
**Function:** `canReachEnding2()`

Epilogue: Draco finds the protagonist in Diagon Alley months later. Buys them coffee without saying why. They both pretend it's nothing.

---

### Ending 3 — "The Brilliant Alone"
**Requirements:** `allegiance_track == "solo"`, `knowledge >= 70`, `cunning >= 70`, Mirror hidden or destroyed solo
**Tone:** Cool, isolated, arguably effective. Right about almost everything. No one to tell.
**Function:** `canReachEnding3()`

Epilogue: Effective in the Battle of Hogwarts. Alone. Post-war consultant for the Ministry. Never talks about the Mirror. Fine with that, mostly, most days.

---

### Ending 4 — "The Long Way Back"
**Requirements:** `morality <= 40`, `dark_arts_practiced == true`, `fled_hogwarts == false`, `mirror_voldemort == false`
**Tone:** Dark but not irredeemable. Stood at the line long enough to change.
**Function:** `canReachEnding4()`

Epilogue: Years of voluntary, quiet exile. Returns for the Battle of Hogwarts because they can't not. The start of something. The story doesn't give a clean answer.

---

### Ending 5 — "The Vanishing Point"
**Requirements (5A):** `fled_hogwarts == true`
**Requirements (5B):** `mirror_voldemort == true`
**Tone:** Loss. The cost of the furthest-dark choices.
**Function:** `canReachEnding5()`

5A — Fled: Protagonist survives because of it. Avery never found. Reads about the Battle of Hogwarts in a French newspaper from Lyon.
5B — Mirror Given: Voldemort's use fails (he can't genuinely sacrifice himself) but kills two Order members. Protagonist lives with two names on the Memorial.

---

## PART SIX: CHAPTER-BY-CHAPTER BREAKDOWN

*(For detailed scene tables and section-by-section mechanics, see the implementation plan at ~/.claude/plans/shimmering-herding-minsky.md)*

### Chapter Structure Summary

| Chapter | Title | Act | Key Pivot |
|---------|-------|-----|-----------|
| 1 | The Leaky Cauldron | 1 | House selection; journal found |
| 2 | The Hogwarts Express | 1 | Romance sparks; threatening note |
| 3 | Returning to the Castle | 1 | Snape's first look; Avery's hidden note |
| 4 | First Week | 1 | DADA; Slug Club; romance spark deepened |
| 5 | The Journal Speaks | 2a | First decode; "L." identified; McGonagall |
| 6 | The Draco Thread | 2a | Vanishing Cabinet; Draco offer |
| 7 | Quidditch and Quandaries | 2a | Order youth network; second decode |
| 8 | Slug Club and Other Disasters | 2b | Spy leak discovered; romance tension |
| 9 | The Parent's Trail | 2b | Third decode; Snape's bargain; Avery alive? |
| 10 | Allegiances | 3a | **MAJOR PIVOT** — allegiance locked; spy resolved |
| 11 | The Secret at the Heart | 3b | Fourth decode; Mirror-key location; Dark Arts choice |
| 12 | Midwinter Revelations | 3b | Mirror-key found; Draco through the wall |
| 13 | Hearts and Hexes | 3b | Spy subplot closes; Luna's hint; romance climax |
| 14 | The Weapon Revealed | 4a | Fifth decode; Mirror's true function; Draco's breaking point |
| 15 | Betrayal and Choices | 4a | Mirror-key fate; ending gates activate |
| 16 | The Astronomy Tower | 4b | Canonical events; protagonist's pivotal position |
| 17 | Aftermath | End | Distributor to endings |
| E1–E5 | Five Endings | End | Distinct resolutions |

---

## PART SEVEN: KEY CANON TOUCHPOINTS

The story runs *adjacent* to Harry Potter and the Half-Blood Prince's main plot:

- **Dumbledore's weakened hand / dying**: Protagonist notices but doesn't know why (unless `dumbledore_trusted = true`)
- **Draco's mission (Vanishing Cabinet)**: Core to the Draco thread. Protagonist may help, sabotage, expose, or ignore.
- **Harry's Potions success / Half-Blood Prince's book**: Observable. Protagonist doesn't get the book, but notices Harry's anomalous performance.
- **Slughorn's Slug Club**: Fully integrated social subplot.
- **The Katie Bell necklace / Ron's poisoning**: Background events. Can be referenced, create atmosphere of escalating danger.
- **Dumbledore and Harry's cave mission**: Not directly witnessed, but Dumbledore's absence is felt. `dumbledore_trusted` players may know more.
- **The Astronomy Tower**: Protagonist is present in some capacity. Their position and ability to act is entirely determined by prior choices.
- **Snape as Half-Blood Prince**: Not revealed in-story (this is the protagonist's story, not Harry's). But players who pursued the Snape track may piece together that Snape's loyalties are more complex than they appear.

The protagonist should never overshadow Harry's arc — they run *parallel*, with the Resonance Mirror as their own plot that intersects the main plot at Dumbledore (who knew about it), Snape (who also knew), and the Tower.

---

## PART EIGHT: REPLAYABILITY DESIGN

**What changes substantially across playthroughs:**

1. **House choice** — Different starting friendships, vantage points, and early scenes
2. **The spy's identity** — Drawn from a shortlist based on relationship levels; feels personal
3. **Romance path** — ~40 unique scenes + 3 major moments per path
4. **The "L." identity** — Multiple theories, all partially supported; one confirmed only via Snape track
5. **Draco's arc** — From "never engaged" to "protagonist saved him"
6. **Avery's survival** — Requires three separate unlocking conditions; missed by most players on first run
7. **Mirror function** — Players who skip Luna never learn Mirror's true purpose; changes what endings they can reach
8. **Ending availability** — No single playthrough can see all five endings; some are structurally incompatible

**Across all paths, target word counts (estimated):**

| Content Type | ~Sections | ~Words |
|---|---|---|
| Shared/convergence scenes | ~120 | 34,000 |
| House-variant content (×4) | ~80 | 90,000 |
| Romance paths (×4) | ~60 | 68,000 |
| Allegiance branches | ~100 | 28,000 |
| Draco thread variants | ~60 | 17,000 |
| Spy subplot variants | ~50 | 14,000 |
| Endings + epilogues (×5) | ~40 | 56,000 |
| **Total** | **~810** | **~207,000** |

---

## PART NINE: WRITING GUIDELINES

### Voice and Prose Style
- **Second person, present tense** throughout ("You stand in the corridor. The door opens.")
- **No internal monologue attribution** — don't write "You think that..." or "You feel angry" — show it through action and observation
- **The protagonist can be sarcastic, warm, cold, or cunning** — their voice should flex based on recent stat activity
- **High EMP sections** get more emotional interiority. **High CUN sections** get more tactical observation.
- **Morality should inflect the narrator subtly** — at morality ≤ 40, descriptions of violence or manipulation are slightly colder; at morality ≥ 70, the narrative is warmer and more empathetic

### Choice Design Rules
- Every section should offer 2–4 choices
- 2 are always available (base choices)
- 1–2 are stat-gated (visible but disabled, with hint text)
- Choices should feel meaningfully different, not just cosmetically different
- Avoid "good/neutral/evil" labelling — choices should all be reasonable from some perspective
- Delayed consequences: choices in Ch.1–5 that surface again in Ch.10–15 with full weight

### Pacing
- Ch.1–4: ~250 words per section (shorter, establishing)
- Ch.5–10: ~275 words per section (building)
- Ch.11–16: ~300+ words per section (heavier, slower)
- Endings: ~350 words per section (generous, earned)

### IF-Script Implementation Notes
- Use `adj(stat, delta)` for all stat changes (never raw `stat = stat + n`)
- Use `clampStat()` for any manual clamping needed
- Section titles must be globally unique across all partial files
- Use string targets always (never numeric) for cross-file sections
- Romance variants in the same section: gate with `@when romance_active == "elara"` etc.
- All five ending gate functions (`canReachEndingN()`) live in `00-system.partial.if`

---

*Design document version 1.0 — created April 2026*
*Protagonist's name: player-defined. Avery's name: fixed. All other NPCs: as per HP canon or original design above.*
