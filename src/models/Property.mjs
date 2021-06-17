class Property {
  /**
   * @param {string} name
   * @param {Array|string} value
   * @param {string} type
   */
  constructor ({ name, value }, type = 'property') {
    this.name = name
    this.value = value
    this.type = type
  }
}

export default Property
