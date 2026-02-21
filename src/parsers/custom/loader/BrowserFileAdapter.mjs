import FileAdapter from './FileAdapter.mjs'

/**
 * File system adapter for browser environment
 * Supports both dynamic fetching and preloaded file caches
 * @class BrowserFileAdapter
 * @extends FileAdapter
 */
class BrowserFileAdapter extends FileAdapter {
  /**
   * Creates an instance of BrowserFileAdapter.
   * @param {Object} config - Configuration options
   * @param {string} config.baseUrl - Base URL for fetching files (default: window.location.origin)
   * @param {Object} config.preloadedFiles - Map of file paths to content (for bundled files)
   * @param {boolean} config.allowFetch - Whether to allow dynamic fetching (default: true)
   * @memberof BrowserFileAdapter
   */
  constructor (config = {}) {
    super()
    this.baseUrl = config.baseUrl || (typeof window !== 'undefined' ? window.location.origin : '')
    this.preloadedFiles = config.preloadedFiles || {}
    this.allowFetch = config.allowFetch !== false
  }

  /**
   * Checks if a file exists (checks preloaded cache or attempts fetch)
   * @param {string} filePath - Path to the file
   * @returns {Promise<boolean>} True if file exists
   */
  async exists (filePath) {
    // Check preloaded files first
    if (this.preloadedFiles[filePath]) {
      return true
    }

    // If fetching is not allowed, return false
    if (!this.allowFetch) {
      return false
    }

    // Try a HEAD request to check existence
    try {
      const url = this.resolveUrl(filePath)
      const response = await fetch(url, { method: 'HEAD' })
      return response.ok
    } catch (err) {
      return false
    }
  }

  /**
   * Reads file content
   * @param {string} filePath - Path to the file
   * @returns {Promise<string>} File content
   * @throws {Error} If file cannot be read
   */
  async read (filePath) {
    // Check preloaded files first
    if (this.preloadedFiles[filePath]) {
      return this.preloadedFiles[filePath]
    }

    // If fetching is not allowed, throw error
    if (!this.allowFetch) {
      throw new Error(`File not preloaded and fetch is disabled: ${filePath}`)
    }

    // Fetch dynamically
    try {
      const url = this.resolveUrl(filePath)
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.text()
    } catch (err) {
      throw new Error(`Failed to fetch file: ${filePath}\n${err.message}`)
    }
  }

  /**
   * Returns the environment name
   * @returns {string} 'browser'
   */
  getEnvironment () {
    return 'browser'
  }

  /**
   * Resolves a file path to a full URL
   * @param {string} filePath - File path
   * @returns {string} Full URL
   */
  resolveUrl (filePath) {
    try {
      return new URL(filePath, this.baseUrl).href
    } catch (err) {
      // Fallback for invalid URLs
      return this.baseUrl + (filePath.startsWith('/') ? '' : '/') + filePath
    }
  }

  /**
   * Preloads file content into the cache
   * @param {string} filePath - File path
   * @param {string} content - File content
   */
  preload (filePath, content) {
    this.preloadedFiles[filePath] = content
  }

  /**
   * Preloads multiple files at once
   * @param {Object} files - Map of file paths to content
   */
  preloadMultiple (files) {
    Object.assign(this.preloadedFiles, files)
  }
}

export default BrowserFileAdapter
