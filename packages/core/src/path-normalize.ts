/**
 * Path normalization — the single backslash→forward-slash repo-path normalizer
 * (the [DUP] owner behind audit's B5b one-normalizer cage). Pure + browser-safe:
 * a string rewrite only, no `node:path` import, so it rides the main index.
 * @module
 */

/**
 * Rewrite every backslash to a forward slash — the one POSIX repo-path form used
 * for stable, platform-independent ids. A distinct op from `node:path` joins: it
 * only canonicalizes separators, it does not resolve `.`/`..` or absolutize.
 */
export function normalizeRepoPath(p: string): string {
  return p.replace(/\\/g, '/');
}
