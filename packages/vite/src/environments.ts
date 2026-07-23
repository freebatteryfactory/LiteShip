/**
 * Vite 8 Environment API configuration.
 *
 * Provides environment-specific resolve conditions and optimisation
 * settings for browser, server, and shader build targets.
 *
 * @module
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Named liteship build environment. */
export type LiteshipEnvironmentName = 'browser' | 'server' | 'shader';

/**
 * Subset of a Vite `Environment` config that liteship touches: resolve
 * conditions plus `optimizeDeps` include/exclude lists. Returned by
 * {@link getEnvironmentConfig} and merged into the host Vite config
 * via {@link buildEnvironments}.
 */
export interface LiteshipEnvironmentConfig {
  readonly resolve: {
    readonly conditions: string[];
    readonly extensions: string[];
  };
  readonly optimizeDeps: {
    readonly include: string[];
    readonly exclude: string[];
  };
}

// ---------------------------------------------------------------------------
// Environment Definitions
// ---------------------------------------------------------------------------

const BROWSER_ENV: LiteshipEnvironmentConfig = {
  resolve: {
    conditions: ['browser', 'import', 'module', 'default'],
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.css'],
  },
  optimizeDeps: {
    // Let Vite discover transitive LiteShip modules from their physical
    // importers. Naming them here forces app-root resolution and breaks the
    // one-install facade under pnpm's default isolated linker.
    include: [],
    exclude: [],
  },
} as const;

const SERVER_ENV: LiteshipEnvironmentConfig = {
  resolve: {
    conditions: ['node', 'import', 'module', 'default'],
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  optimizeDeps: {
    include: [],
    exclude: ['@liteship/core', '@liteship/detect'],
  },
} as const;

const SHADER_ENV: LiteshipEnvironmentConfig = {
  resolve: {
    conditions: ['browser', 'import', 'module', 'default'],
    extensions: ['.ts', '.js', '.glsl', '.wgsl', '.vert', '.frag'],
  },
  optimizeDeps: {
    include: [],
    exclude: ['@liteship/detect'],
  },
} as const;

const ENVIRONMENT_MAP: Record<LiteshipEnvironmentName, LiteshipEnvironmentConfig> = {
  browser: BROWSER_ENV,
  server: SERVER_ENV,
  shader: SHADER_ENV,
} as const;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the Vite environment configuration for a specific liteship target.
 */
export function getEnvironmentConfig(name: LiteshipEnvironmentName): LiteshipEnvironmentConfig {
  return ENVIRONMENT_MAP[name];
}

/**
 * Build the Vite environments configuration object from a list of
 * requested environment names.
 */
export function buildEnvironments(
  names: readonly LiteshipEnvironmentName[],
): Record<string, LiteshipEnvironmentConfig> {
  const result: Record<string, LiteshipEnvironmentConfig> = {};
  for (const name of names) {
    result[name] = getEnvironmentConfig(name);
  }
  return result;
}
