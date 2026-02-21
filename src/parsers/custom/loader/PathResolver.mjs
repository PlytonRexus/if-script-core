/**
 * Resolves import paths to absolute file system paths
 * Handles aliases, relative paths, and extensions
 * @class PathResolver
 */
class PathResolver {
  /**
   * Creates an instance of PathResolver.
   * @param {Object} config - Configuration options
   * @param {Object} config.aliases - Path aliases (e.g., { '@lib': '/story-lib' })
   * @param {string} config.basePath - Base path for absolute imports
   * @param {Array<string>} config.extensions - File extensions to try (default: ['.if', '.partial.if'])
   * @memberof PathResolver
   */
  constructor (config = {}) {
    this.aliases = config.aliases || {}
    this.basePath = config.basePath || ''
    this.extensions = config.extensions || ['.if', '.partial.if']
  }

  /**
   * Resolves an import path to an absolute file system path
   * @param {string} importPath - The import path to resolve
   * @param {string} currentFilePath - The path of the file containing the import
   * @returns {Object} Object with { absolute, relative, normalized } paths
   */
  resolve (importPath, currentFilePath) {
    // 1. Expand aliases
    const expandedPath = this.expandAliases(importPath)

    // 2. Determine if path is relative or absolute
    let resolvedPath
    if (expandedPath.startsWith('./') || expandedPath.startsWith('../')) {
      // Relative path - resolve relative to current file
      resolvedPath = this.resolveRelative(expandedPath, currentFilePath)
    } else if (expandedPath.startsWith('/')) {
      // Absolute path - use as is (or relative to basePath)
      resolvedPath = this.basePath ? this.joinPaths(this.basePath, expandedPath) : expandedPath
    } else {
      // No prefix - treat as relative to current file's directory
      resolvedPath = this.resolveRelative('./' + expandedPath, currentFilePath)
    }

    // 3. Normalize path (remove .., ., etc.)
    const normalized = this.normalizePath(resolvedPath)

    return {
      absolute: normalized,
      relative: importPath,
      normalized: normalized
    }
  }

  /**
   * Expands path aliases (e.g., @lib/file.if -> /story-lib/file.if)
   * @param {string} path - Path that may contain aliases
   * @returns {string} Path with aliases expanded
   */
  expandAliases (path) {
    for (const [alias, target] of Object.entries(this.aliases)) {
      if (path.startsWith(alias)) {
        return path.replace(alias, target)
      }
    }
    return path
  }

  /**
   * Resolves a relative path against the current file path
   * @param {string} relativePath - Relative path (e.g., ./file.if or ../lib/file.if)
   * @param {string} currentFilePath - Path of the file containing the import
   * @returns {string} Absolute path
   */
  resolveRelative (relativePath, currentFilePath) {
    // Get directory of current file
    const currentDir = this.getDirname(currentFilePath)

    // Join paths
    return this.joinPaths(currentDir, relativePath)
  }

  /**
   * Gets directory name from a file path (cross-platform)
   * @param {string} filePath - File path
   * @returns {string} Directory path
   */
  getDirname (filePath) {
    if (filePath === '<inline>' || !filePath) {
      return ''
    }

    const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
    if (lastSlash === -1) {
      return '.'
    }
    return filePath.substring(0, lastSlash)
  }

  /**
   * Joins path segments (cross-platform)
   * @param {...string} segments - Path segments to join
   * @returns {string} Joined path
   */
  joinPaths (...segments) {
    return segments
      .filter(seg => seg && seg !== '.')
      .join('/')
      .replace(/\/+/g, '/') // Remove duplicate slashes
  }

  /**
   * Normalizes a path by resolving . and .. segments
   * @param {string} path - Path to normalize
   * @returns {string} Normalized path
   */
  normalizePath (path) {
    const isAbsolute = path.startsWith('/')
    const parts = path.split('/').filter(p => p && p !== '.')
    const normalized = []

    for (const part of parts) {
      if (part === '..') {
        if (normalized.length > 0 && normalized[normalized.length - 1] !== '..') {
          normalized.pop()
        } else if (!isAbsolute) {
          normalized.push('..')
        }
      } else {
        normalized.push(part)
      }
    }

    let result = normalized.join('/')
    if (isAbsolute) {
      result = '/' + result
    }

    return result || '.'
  }

  /**
   * Tries multiple extensions for a file path
   * @param {string} basePath - Base file path without extension
   * @returns {Array<string>} Array of paths to try
   */
  getPathsWithExtensions (basePath) {
    const paths = [basePath]

    // If path already has an extension, return as-is
    if (this.extensions.some(ext => basePath.endsWith(ext))) {
      return paths
    }

    // Try with each extension
    for (const ext of this.extensions) {
      paths.push(basePath + ext)
    }

    return paths
  }
}

export default PathResolver
