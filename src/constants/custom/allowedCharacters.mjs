const AllowedCharacters = {
  identifierStart: /[a-zA-Z0-9_]/i,
  identifierBody: /_/,
  propStart: /@/,
  propName: /[a-zA-Z0-9]/i
}

export default AllowedCharacters
