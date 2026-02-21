/**
 * Abstract base class for file system adapters
 * Provides a unified interface for file operations across different environments
 * @class FileAdapter
 * @abstract
 */
class FileAdapter {
  /**
   * Checks if a file exists
   * @param {string} path - Absolute path to the file
   * @returns {Promise<boolean>} True if file exists, false otherwise
   * @abstract
   */
  async exists (path) {
    throw new Error('FileAdapter.exists() must be implemented by subclass')
  }

  /**
   * Reads file content
   * @param {string} path - Absolute path to the file
   * @returns {Promise<string>} File content as string
   * @throws {Error} If file cannot be read
   * @abstract
   */
  async read (path) {
    throw new Error('FileAdapter.read() must be implemented by subclass')
  }

  /**
   * Returns the environment name this adapter runs in
   * @returns {string} Environment name ('node' or 'browser')
   * @abstract
   */
  getEnvironment () {
    throw new Error('FileAdapter.getEnvironment() must be implemented by subclass')
  }
}

export default FileAdapter
