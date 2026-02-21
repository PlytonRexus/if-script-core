import FileAdapter from './FileAdapter.mjs'
import { readFile, access } from 'fs/promises'
import { resolve, dirname } from 'path'

/**
 * File system adapter for Node.js environment
 * Uses fs/promises for async file operations
 * @class NodeFileAdapter
 * @extends FileAdapter
 */
class NodeFileAdapter extends FileAdapter {
  /**
   * Creates an instance of NodeFileAdapter.
   * @param {Object} config - Configuration options
   * @param {string} config.basePath - Optional base path for resolving relative paths
   * @memberof NodeFileAdapter
   */
  constructor (config = {}) {
    super()
    this.basePath = config.basePath || process.cwd()
  }

  /**
   * Checks if a file exists
   * @param {string} filePath - Path to the file
   * @returns {Promise<boolean>} True if file exists and is accessible
   */
  async exists (filePath) {
    try {
      await access(filePath)
      return true
    } catch (err) {
      return false
    }
  }

  /**
   * Reads file content as UTF-8 string
   * @param {string} filePath - Path to the file
   * @returns {Promise<string>} File content
   * @throws {Error} If file cannot be read
   */
  async read (filePath) {
    try {
      return await readFile(filePath, 'utf-8')
    } catch (err) {
      throw new Error(`Failed to read file: ${filePath}\n${err.message}`)
    }
  }

  /**
   * Returns the environment name
   * @returns {string} 'node'
   */
  getEnvironment () {
    return 'node'
  }

  /**
   * Resolves a path to absolute path
   * @param {string} filePath - Path to resolve
   * @returns {string} Absolute path
   */
  resolvePath (filePath) {
    return resolve(this.basePath, filePath)
  }

  /**
   * Gets directory name from a file path
   * @param {string} filePath - File path
   * @returns {string} Directory path
   */
  getDirname (filePath) {
    return dirname(filePath)
  }
}

export default NodeFileAdapter
