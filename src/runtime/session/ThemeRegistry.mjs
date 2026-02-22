const BUILTIN_THEME_MANIFESTS = [
  {
    id: 'literary-default',
    name: 'Literary Default',
    version: '1.0.0',
    runtimeApi: '2.x',
    entryCss: '/src/runtime/themes/literary-default.css',
    renderers: ['literary', 'cinematic'],
    tokens: {},
    features: {
      supportsBackdrop: true,
      supportsHighMotion: false
    },
    author: 'IF-Script'
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    version: '1.0.0',
    runtimeApi: '2.x',
    entryCss: '/src/runtime/themes/cinematic.css',
    renderers: ['cinematic', 'literary'],
    tokens: {},
    features: {
      supportsBackdrop: true,
      supportsHighMotion: true
    },
    author: 'IF-Script'
  }
]

class ThemeRegistry {
  constructor () {
    this.themes = new Map()
    this.loaded = new Set()
    BUILTIN_THEME_MANIFESTS.forEach(theme => this.register(theme))
  }

  validateManifest (manifest) {
    if (!manifest || typeof manifest !== 'object') return false
    if (typeof manifest.id !== 'string' || manifest.id.trim() === '') return false
    if (typeof manifest.name !== 'string' || manifest.name.trim() === '') return false
    if (typeof manifest.version !== 'string' || manifest.version.trim() === '') return false
    if (manifest.runtimeApi !== '2.x') return false
    if (typeof manifest.entryCss !== 'string' || manifest.entryCss.trim() === '') return false
    if (!Array.isArray(manifest.renderers) || manifest.renderers.length === 0) return false
    return true
  }

  register (manifest) {
    if (!this.validateManifest(manifest)) return false
    this.themes.set(manifest.id, manifest)
    return true
  }

  get (themeId) {
    return this.themes.get(themeId) || null
  }

  getAvailableThemes () {
    return Array.from(this.themes.values()).map(t => ({
      id: t.id,
      name: t.name,
      renderers: t.renderers
    }))
  }

  getStylesheetId (themeId) {
    return `if_v2_theme_${themeId}`
  }

  ensureStylesheet (manifest) {
    if (typeof document === 'undefined') return true
    if (!manifest || !manifest.entryCss) return false
    if (this.loaded.has(manifest.id)) return true

    const id = this.getStylesheetId(manifest.id)
    if (document.getElementById(id)) {
      this.loaded.add(manifest.id)
      return true
    }

    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = manifest.entryCss
    document.head.appendChild(link)
    this.loaded.add(manifest.id)
    return true
  }

  applyTheme (root, requestedThemeId, rendererName = 'literary') {
    const requested = this.get(requestedThemeId)
    const fallback = this.get('literary-default')
    let theme = requested
    if (!theme || !theme.renderers.includes(rendererName)) {
      theme = fallback
    }
    if (!theme) return null

    this.ensureStylesheet(theme)
    if (typeof document !== 'undefined') {
      for (const knownThemeId of this.themes.keys()) {
        const link = document.getElementById(this.getStylesheetId(knownThemeId))
        if (link) link.disabled = knownThemeId !== theme.id
      }
    }
    if (root && typeof root.setAttribute === 'function') {
      root.setAttribute('data-if-theme', theme.id)
    }
    return theme
  }
}

export default ThemeRegistry
