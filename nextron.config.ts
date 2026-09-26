import path from 'path'
import type { Configuration } from 'webpack'

const config = {
  webpack: (defaultConfig: Configuration, env: 'development' | 'production') => {
    // Add the SMTC worker as a second entry so webpack compiles it to app/smtc-worker.js.
    // Without this the worker is never compiled and "now playing" silently fails in the build.
    const entry = defaultConfig.entry as Record<string, string>
    entry['smtc-worker'] = path.join(process.cwd(), 'main', 'smtc-worker.ts')
    return defaultConfig
  },
}

export default config
