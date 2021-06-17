const mega = `
settings__
  @storyTitle "Introduction"
  @startAt 1
__settings

scene__
  @first 1
  @sections 1 2 3
  @name "Wakarimashita"
  @music "https://google.com"
__scene

section__
  @title "sec1"
  a = " really "
  b = 10
  "_hello if-script_" a "been swell!"
  if__ (a+b > 0) then__ a = a+1
  else b = b+1
    choice__
      @target 2
      @input leadName
      @action lambda = 10
      @action gamma = lambda * 1000
      "So?"
      if__ (intel > 1000) then__ rock_it = true
    __choice
    choice__
      @target 2
      "Mamma mia!"
    __choice
    choice__
      @target 3
      "Indigo!"
    __choice
    choice__
    @target 4
      "Rain dance! Antiochus X Eusebes (113 BC – 92 or 88 BC) was a king of Syria during the Hellenistic period.
      _During his lifetime Seleucid Syria was beset by civil wars, interference by Ptolemaic Egypt and incursions by the Parthians.
      In 95 BC, Seleucus VI killed his own half-uncle Antiochus IX, the father of Antiochus X, who took revenge by defeating Seleucus VI and driving him to his death in 94 BC._
      Antiochus X did not enjoy a stable reign as he had to fight three of Seleucus VI's brothers, Antiochus XI, Philip I and Demetrius III. Antiochus XI defeated Antiochus X and expelled him in 93 BC from Antioch, the capital. A few months later, Antiochus X regained his position and killed Antiochus XI. The civil war continued but its final outcome is uncertain. Antiochus X married his stepmother Cleopatra Selene, and had several children with her, including a future king, Antiochus XIII. He probably died fighting against the Parthians in 88 BC."
    __choice
__section

section__
  @title "sec2"
  "hello if-script" a "been swell!"
  choice__
    @targetType "scene"
    @target 1
    "Whatcha doin'?!"
    if__ (lambda == 10) then__ b = "qwerty"
    else__ c = "random"
  __choice
__section
section__
  @title "sec3"
  "hello if-script" a "been swell!"
__section`

export default mega
