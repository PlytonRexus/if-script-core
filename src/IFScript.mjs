import { getAuthoringSchema as resolveAuthoringSchema } from './authoring/authoringSchema.mjs'
import { getLegacyAuthoringEmitters } from './authoring/legacyEmitters.mjs'

class IFScript {
  /**
   * @param {Object} config - Configuration for the parser (paths, browser settings, etc.)
   */
  constructor (config = {}) {
    this.config = config
  }

  async init () {
    const { default: InputStream } = await import('./parsers/custom/stream/InputStream.mjs')
    const { default: TokenStream } = await import('./parsers/custom/stream/TokenStream.mjs')
    const { default: Parser } = await import('./parsers/custom/parser/Parser.mjs')
    const { default: ModuleLoader } = await import('./parsers/custom/loader/ModuleLoader.mjs')
    const { default: PathResolver } = await import('./parsers/custom/loader/PathResolver.mjs')

    // Determine environment and create file adapter
    let fileAdapter
    // Check for Node.js environment (works in both CommonJS and ESM)
    const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null
    if (isNode) {
      const { default: NodeFileAdapter } = await import('./parsers/custom/loader/NodeFileAdapter.mjs')
      fileAdapter = new NodeFileAdapter(this.config?.node || {})
    } else {
      const { default: BrowserFileAdapter } = await import('./parsers/custom/loader/BrowserFileAdapter.mjs')
      fileAdapter = new BrowserFileAdapter(this.config?.browser || {})
    }

    // Create path resolver
    const pathResolver = new PathResolver(this.config?.paths || {})

    // Create parser factory
    const parserFactory = (tokenStream, loader) => {
      return new Parser(tokenStream, loader, this.config?.parseMetadata || {})
    }

    // Create module loader
    const moduleLoader = new ModuleLoader(
      fileAdapter,
      pathResolver,
      parserFactory,
      this.config?.loader || {}
    )

    this.moduleLoader = moduleLoader

    // Update parse method to use module loader
    this.parse = async (text, filePath = '<inline>', parseMetadata = null) => {
      const is = new InputStream(text)
      is.currentFile = filePath
      const ts = new TokenStream(is)
      const metadataOptions = parseMetadata && typeof parseMetadata === 'object'
        ? { ...this.config?.parseMetadata, ...parseMetadata }
        : (this.config?.parseMetadata || {})
      return await new Parser(ts, moduleLoader, metadataOptions).parseStory()
    }

    this.Parser = Parser
  }

  async createRuntime (options = {}) {
    const { default: RuntimeManager } = await import('./runtime/session/RuntimeManager.mjs')
    return new RuntimeManager(options)
  }

  getAuthoringSchema () {
    return resolveAuthoringSchema()
  }

  static getAuthoringSchema () {
    return resolveAuthoringSchema()
  }

  getAuthoringEmitters () {
    return getLegacyAuthoringEmitters()
  }

  static getAuthoringEmitters () {
    return getLegacyAuthoringEmitters()
  }
}

export default IFScript
