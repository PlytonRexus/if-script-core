if (typeof module === 'object' && module.exports) {
	const fs = require('fs')
	const path = require('path')

	const IOException = require('../../../exceptions/IOException')

	class File {
		constructor(relativePath, baseFilePath) {
			// Check existence: (await exists(relativePath))
			if (!relativePath) {
				throw new IOException('File not found')
			}
			this.relativePath = relativePath
			this.baseFilePath = baseFilePath
			this.path = path.resolve(baseFilePath, '..', relativePath)
		}

		static exists(filePath) {
			return new Promise((resolve, reject) => {
	    	fs.access(filePath, fs.constants.F_OK, err => {
	    		if (err) resolve(false)
	    		else resolve(true)
	    	})
	    })
		}

		read() {
		  return new Promise((resolve, reject) => {
		    fs.readFile(this.path, (err, buffer) => {
		      if (err) {
		        console.error(err)
		        reject(err)
		      }
		      resolve(buffer)
		    })
		  })
		}

		write(str) {
			return new Promise((function (resolve, reject) {
				fs.writeFile(this.path, str, e => {
		      if (e)
		        reject(new IOException(e.message));
		      resolve(this.path);
		    })
			}).bind(this))
		}

		append(str) {
			return new Promise((resolve, reject) => {
				fs.writeFile(this.path, buffer, function(e) {
		      if (e)
		        reject(new IOException(e.message));
		      resolve(this.path);
		    })
			})
		}

		async extractRequire() {
			let content = (await this.read()).toString()
			return new Promise((resolve, reject) => {
				let requirements = (content.match(/import__".*"__import/g) || [])
				try {
					requirements = requirements.map(r => {
						r = r.replace(/import__/, "")
						r = r.replace(/__import/, "")
						r = r.trim()
						r = r.replaceAll('"', '')
						return r
					})
					requirements = new Set(requirements)
					// console.log(requirements)
					resolve(requirements)
				} catch (err) {
					reject(err)
				}
			})
		}

		replaceRequire(str, name, value) {
			const then = Date.now()
			const importStatementLiteral ='import__"' + name + '"__import'
	    let j = 0
	    while (j >= 0 && Date.now() - then < 10000) {
	      j = str.indexOf(importStatementLiteral, j > 0 ? j + 1 : 0)
	      if (j === -1 || (j > 0 && str[j - 1] === '\\')) {
	      	break
	      } else {
	        const first = str.substring(0, j)
	        const last = str.substring(j + name.length + 18)
	    //     console.log(first)
	    //     console.log("\n")
					// console.log(last)
	    //     console.log("\n")
					// console.log(value)
	    //     console.log("\n")

	        str = first + value + last
	      }
	    }

	    // console.log(str)

	    return str
		}

		async assemble(main) {
			let str = (await this.read()).toString()
			const requirements = new Array(...(await this.extractRequire()))

			// console.log(requirements)

			const assembledFiles = await Promise.all(requirements.map(async v => {
				let file = new File(v, main)
				return await file.assemble(main)
			}))

			assembledFiles.forEach((assembled, idx) => {
				str = this.replaceRequire(str, requirements[idx], assembled)
			})

			return str
		}

	}

	module.exports = File
} else {
	module.exports = class File {}
}
