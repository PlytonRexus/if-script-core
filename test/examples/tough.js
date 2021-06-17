const tough = `
section__
  @name "name"
  "hello if-script" a "been swell!"
  if__ (a+b > 0) then__ a = a+1
  else__ b = b+1
    choice__
      @target 1
      "Hi!" if__ (a > 0) then__ b = "random"
    __choice
__section`

export default tough
