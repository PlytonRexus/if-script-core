class IFScript {
  /**
   * @param {Object} config - Configuration for the parser (paths, browser settings, etc.)
   */
  constructor (config = {}) {
    this.config = config
  }

  async init () {
    const InputStream = await import('./parsers/custom/stream/InputStream.mjs')
    const TokenStream = await import('./parsers/custom/stream/TokenStream.mjs')
    const Parser = await import('./parsers/custom/parser/Parser.mjs')
    const ModuleLoader = await import('./parsers/custom/loader/ModuleLoader.mjs')
    const PathResolver = await import('./parsers/custom/loader/PathResolver.mjs')

    // Determine environment and create file adapter
    let fileAdapter
    // Check for Node.js environment (works in both CommonJS and ESM)
    const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null
    if (isNode) {
      const NodeFileAdapter = await import('./parsers/custom/loader/NodeFileAdapter.mjs')
      fileAdapter = new NodeFileAdapter.default(this.config?.node || {})
    } else {
      const BrowserFileAdapter = await import('./parsers/custom/loader/BrowserFileAdapter.mjs')
      fileAdapter = new BrowserFileAdapter.default(this.config?.browser || {})
    }

    // Create path resolver
    const pathResolver = new PathResolver.default(this.config?.paths || {})

    // Create parser factory
    const parserFactory = (tokenStream, loader) => {
      return new Parser.default(tokenStream, loader)
    }

    // Create module loader
    const moduleLoader = new ModuleLoader.default(
      fileAdapter,
      pathResolver,
      parserFactory,
      this.config?.loader || {}
    )

    this.moduleLoader = moduleLoader

    // Update parse method to use module loader
    this.parse = async (text, filePath = '<inline>') => {
      const is = new InputStream.default(text)
      is.currentFile = filePath
      const ts = new TokenStream.default(is)
      return await new Parser.default(ts, moduleLoader).parseStory()
    }

    this.Parser = Parser
  }

  async createRuntime (options = {}) {
    const RuntimeManager = await import('./runtime/session/RuntimeManager.mjs')
    return new RuntimeManager.default(options)
  }
}

export default IFScript
