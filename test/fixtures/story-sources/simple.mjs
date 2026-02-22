const simple = `
settings__
  @name "IF-Script tester"
  @fullTimer 10
__settings

section__
  @title "sec1"
  "hello if-script" a "been swell!"
    choice__
      @target 1
      @input a
      "Aloha!"
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
      "Rain dance!"
    __choice
__section

section__
  @title "sec2"
  "hello if-script" a "been swell!"
  choice__
    @targetType "scene"
    @target 1
    "Whatcha doin'?!"
  __choice
__section
section__
  @title "sec3"
  "hello if-script" a "been swell!"
__section`

export default simple
