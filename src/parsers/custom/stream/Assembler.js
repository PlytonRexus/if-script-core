if (typeof module === 'object' && module.exports) {
	const path = require('path')
	const File = require('./File')

	Array.prototype.empty = function() {
		return this.length == 0
	}

	Array.prototype.back = function() {
		return this[this.length - 1]
	}

	Array.prototype.front = function() {
		return this[0]
	}

	class Assembler {

		constructor(completePath) {
			this.completePath = completePath
			this.mainFile = new File(completePath, '')
		}

		async assemble() {
			const assembled = await (this.mainFile.assemble(this.mainFile.path))
			// console.log(assembled)
			return assembled
		}
	}

	module.exports = {Assembler}
} else {
	module.exports = { Assembler: class Assembler {} }
}
