import ModuleRecord from '../../../models/ModuleRecord.mjs'
import ImportException from '../../../exceptions/ImportException.mjs'
import InputStream from '../stream/InputStream.mjs'
import TokenStream from '../stream/TokenStream.mjs'

/**
 * Core module loading system that handles imports with caching and circular dependency detection
 * @class ModuleLoader
 */
class ModuleLoader {
  /**
   * Creates an instance of ModuleLoader.
   * @param {FileAdapter} fileAdapter - File system adapter for the current environment
   * @param {PathResolver} pathResolver - Path resolution service
   * @param {Function} parserFactory - Factory function to create parser instances: (tokenStream, loader) => Parser
   * @param {Object} config - Configuration options
   * @param {number} config.maxImportDepth - Maximum nesting depth for imports (default: 50)
   * @param {boolean} config.enableCache - Whether to cache loaded modules (default: true)
   * @param {boolean} config.circularDetection - Whether to detect circular dependencies (default: true)
   * @memberof ModuleLoader
   */
  constructor (fileAdapter, pathResolver, parserFactory, config = {}) {
    this.fileAdapter = fileAdapter
    this.pathResolver = pathResolver
    this.parserFactory = parserFactory

    this.moduleCache = new Map()
    this.importStack = []

    this.config = {
      maxImportDepth: config.maxImportDepth || 50,
      enableCache: config.enableCache !== false,
      circularDetection: config.circularDetection !== false
    }
  }

  /**
   * Loads a module from a file path
   * @param {string} importPath - Import path as written in source code
   * @param {string} currentFilePath - Path of the file containing the import statement
   * @param {Object} sourceLocation - Location of the import statement
   * @param {number} sourceLocation.line - Line number
   * @param {number} sourceLocation.col - Column number
   * @returns {Promise<ModuleRecord>} Loaded and parsed module
   * @throws {ImportException} If module cannot be loaded
   */
  async loadModule (importPath, currentFilePath, sourceLocation) {
    // 1. Resolve path
    const resolved = this.pathResolver.resolve(importPath, currentFilePath)

    // 2. Check circular dependencies
    if (this.config.circularDetection && this.importStack.includes(resolved.absolute)) {
      throw new ImportException(
        `Circular import detected: ${this.getImportChain(resolved.absolute)}`,
        sourceLocation.line,
        sourceLocation.col,
        importPath
      )
    }

    // 3. Check import depth
    if (this.importStack.length >= this.config.maxImportDepth) {
      throw new ImportException(
        `Maximum import depth (${this.config.maxImportDepth}) exceeded`,
        sourceLocation.line,
        sourceLocation.col,
        importPath
      )
    }

    // 4. Check cache
    if (this.config.enableCache && this.moduleCache.has(resolved.absolute)) {
      return this.moduleCache.get(resolved.absolute)
    }

    // 5. Load and parse
    this.importStack.push(resolved.absolute)
    try {
      const moduleRecord = await this.loadAndParse(resolved, sourceLocation, importPath)

      // Cache the result
      if (this.config.enableCache) {
        this.moduleCache.set(resolved.absolute, moduleRecord)
      }

      return moduleRecord
    } finally {
      this.importStack.pop()
    }
  }

  /**
   * Loads file content and parses it as a module
   * @param {Object} resolved - Resolved path information
   * @param {Object} sourceLocation - Source location for error reporting
   * @param {string} importPath - Original import path
   * @returns {Promise<ModuleRecord>} Parsed module record
   * @throws {ImportException} If file cannot be loaded or parsed
   * @private
   */
  async loadAndParse (resolved, sourceLocation, importPath) {
    // Try path with different extensions
    const pathsToTry = this.pathResolver.getPathsWithExtensions(resolved.absolute)
    let content = null
    let actualPath = null

    for (const path of pathsToTry) {
      if (await this.fileAdapter.exists(path)) {
        try {
          content = await this.fileAdapter.read(path)
          actualPath = path
          break
        } catch (err) {
          throw new ImportException(
            `Failed to read file: ${path}`,
            sourceLocation.line,
            sourceLocation.col,
            importPath,
            err
          )
        }
      }
    }

    // If no file found with any extension
    if (content === null) {
      throw new ImportException(
        `File not found: ${resolved.absolute}${pathsToTry.length > 1 ? ' (tried extensions: ' + this.pathResolver.extensions.join(', ') + ')' : ''}`,
        sourceLocation.line,
        sourceLocation.col,
        importPath
      )
    }

    // Parse the module
    try {
      const inputStream = new InputStream(content)
      inputStream.currentFile = actualPath
      const tokenStream = new TokenStream(inputStream)
      const parser = this.parserFactory(tokenStream, this)

      // Parse as module (sections, scenes, functions only)
      const parsed = await parser.parseModule()

      // Create module record
      return new ModuleRecord({
        path: actualPath,
        content,
        parsed,
        dependencies: this.extractDependencies(parsed),
        timestamp: Date.now()
      })
    } catch (err) {
      throw new ImportException(
        `Failed to parse module: ${actualPath}`,
        sourceLocation.line,
        sourceLocation.col,
        importPath,
        err
      )
    }
  }

  /**
   * Extracts import dependencies from a parsed module
   * @param {Object} parsed - Parsed module content
   * @returns {Array<string>} Array of import paths
   * @private
   */
  extractDependencies (parsed) {
    // TODO: In the future, we could track dependencies from the parsed content
    // For now, return empty array since dependencies are tracked during parsing
    return []
  }

  /**
   * Gets the current import chain for error reporting
   * @param {string} targetPath - Path being imported that causes the cycle
   * @returns {string} Formatted import chain
   * @private
   */
  getImportChain (targetPath) {
    return [...this.importStack, targetPath].join(' → ')
  }

  /**
   * Clears the module cache
   */
  clearCache () {
    this.moduleCache.clear()
  }

  /**
   * Invalidates a specific path in the cache
   * @param {string} path - Absolute path to invalidate
   */
  invalidatePath (path) {
    this.moduleCache.delete(path)
  }

  /**
   * Gets cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats () {
    return {
      size: this.moduleCache.size,
      paths: Array.from(this.moduleCache.keys())
    }
  }
}

export default ModuleLoader
