const introduction = `
settings__
  @storyTitle "Tutorial"
  @fullTimer 100000 1
  @startAt 1
__settings

section__
  @title "Introduction"
  a = 12
  b = 4
"### Welcome to your very first IF-Script game!

\`\`\`Built: ${new Date().toDateString()}
Copyright (c) ${new Date().getUTCFullYear()} The IF-Script Contributors
Author(s): Mihir Jichkar
MIT Licensed\`\`\`

[https://github.com/plytonrexus/if-script-core.git](https://github.com/PlytonRexus/if-script-core.git)

\`Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an AS IS BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\`"
  choice__
    @target "starvation"
    "Next"
  __choice
  choice__
    @target "only_scene"
    @targetType "scene"
    "To war"
  __choice
  if__ (a > 10 && b == 4) {
    choice__
      @target 2
      "Same as the first one"
    __choice
  } else__ {
    b = 10
  }
__section

section__
@title "Starvation"
@id "starvation"

"Your majesty, your people are starving in the streets, and threaten revolution.
Our enemies to the west are weak, but they threaten soon to invade. What will you do?"

  choice__
    @target 3
    "Make pre-emptive war on the western lands."
  __choice
  choice__
    @target 4
    "Beat swords to plowshares and trade food to the westerners for protection."
  __choice
  choice__
    @target 5
    "Abdicate the throne. I have clearly mismanaged this kingdom!"
  __choice
__section


scene__
  @first "war"
  @sections "war" "sword" "chaos"
  @id "only_scene"
__scene

/* 3 */
section__
@id "war"
@title "I choose war"
"If you can seize their territory, your kingdom will flourish.
But your army's morale is low and the kingdom's armory is empty.
How will you win the war?"
  choice__
    @target 6
    "Drive the peasants like slaves; if we work hard enough, we'll win."
  __choice
  choice__
    @target 7
    "Appoint charismatic knights and give them land, peasants, and resources."
  __choice
  choice__
    @target 8
    "Steal food and weapons from the enemy in the dead of night."
  __choice
__section

/* 4 */
section__
  @id "sword"
"The westerners have you at the point of a sword. They demand unfair terms from you."
  choice__
    @target 10
    "Accept their terms for now"
  __choice

  choice__
    @target 11
    "Threaten to salt our fields if they don't offer better terms."
  __choice
__section

/* 5 */
section__
  @id "chaos"
"The kingdom descends into chaos, but you manage to escape with your own hide. Perhaps in time you can return to restore order to this fair land."
  choice__
    @target 9
    "Next ..."
  __choice
__section

/* 6 */
section__
"Unfortunately, morale doesn't work like that. Your army soon turns against you and the kingdom falls to the western barbarians."
  choice__
    @target 9
    "Next ..."
  __choice
__section

/* 7 */
section__
"Your majesty's people are eminently resourceful. Your knights win the day, but take care: they may soon demand a convention of parliament."
  choice__
    @target 9
    "Next ..."
  __choice
__section

/* 8 */
section__
"A cunning plan. Soon your army is a match for the westerners; they choose not to invade for now, but how long can your majesty postpone the inevitable?"
  choice__
    @target 9
    "Next ..."
  __choice
__section

/* 9 */
section__
"That's it. Thank you!"
  choice__
    @target 1
    "Back to information"
  __choice
__section

/* 10 */
section__
  "Eventually, the barbarian westerners conquer you anyway, destroying their bread basket, and the entire region starves."
  choice__
    @target 9
    "Next ..."
  __choice
__section

/* 11 */
section__
  "They blink. Your majesty gets a fair price for wheat."
  choice__
    @target 9
    "Next ..."
  __choice
__section
`

export default introduction
