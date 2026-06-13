/**
 * `liteship` — the umbrella package for the LiteShip stack.
 *
 * Installing `liteship` brings every publishable `@czap/*` package into
 * your node_modules in one dependency; you still import from the
 * individual scopes (`@czap/core`, `@czap/quantizer`, `@czap/astro`, …)
 * exactly as the docs show. This module deliberately re-exports NOTHING:
 * the host integrations (`@czap/astro`, `@czap/vite`, `@czap/cloudflare`)
 * carry host-specific peer expectations, and a barrel that imported them
 * would force every consumer to satisfy all of them at once. Pick your
 * entry points; this package just makes sure they're installed.
 *
 * @module
 */

/**
 * Every `@czap/*` package this umbrella installs, in dependency order.
 * Consumed by audit/doctor/release tooling that needs the canonical fleet
 * list; app authors never need to import it for layers 1–3.
 */
export const LITESHIP_PACKAGES = [
  '@czap/_spine',
  '@czap/canonical',
  '@czap/core',
  '@czap/genui',
  '@czap/quantizer',
  '@czap/compiler',
  '@czap/web',
  '@czap/detect',
  '@czap/vite',
  '@czap/astro',
  '@czap/edge',
  '@czap/cloudflare',
  '@czap/worker',
  '@czap/remotion',
  '@czap/scene',
  '@czap/assets',
  '@czap/audit',
  '@czap/command',
  '@czap/cli',
  '@czap/mcp-server',
] as const;

/** Union of the package names installed by `liteship`. */
export type LiteshipPackageName = (typeof LITESHIP_PACKAGES)[number];
