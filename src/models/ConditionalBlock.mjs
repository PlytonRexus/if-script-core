class ConditionalBlock {
  constructor ({ cond, then }) {
    this.cond = cond
    this.then = then
    this.else = null
  }

  get type () { return 'if' }
}
export default ConditionalBlock
