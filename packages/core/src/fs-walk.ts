/**
 * Filesystem walk — the single recursive `readdirSync` file walker (the [DUP]
 * owner for the ~15 hand-rolled walkers across astro / cli / command / vite /
 * scripts). NODE-ONLY: it imports `node:fs`/`node:path`, so it rides a dedicated
 * `@liteship/core/fs-walk` subpath export and is DELIBERATELY absent from the
 * browser-safe main index (the bundle boundary).
 *
 * The design folds the divergent copies into one option surface: a skip-dirs set,
 * suffix/extension filters, and symlink-cycle safety via a `realpath` visited-set
 * (a self-referencing link — `dir/loop -> dir` — terminates, never loops).
 *
 * @module
 */

import { readdirSync, realpathSync, statSync, type Dirent } from 'node:fs';
import { join, resolve } from 'node:path';

/** Options for {@link walkFiles}. All optional — the empty options walk every file. */
export interface WalkFilesOptions {
  /**
   * Directory names never descended into (matched by basename), e.g.
   * `['node_modules', 'dist', '.git']`. A `Set` or an array — both are accepted.
   */
  readonly skipDirs?: ReadonlySet<string> | readonly string[];
  /** Keep only files whose name ends with one of these suffixes (e.g. `['.test.ts']`, `['boundaries.ts']`). */
  readonly suffixes?: readonly string[];
  /** Keep only files with one of these extensions (leading dot optional — `'js'` and `'.js'` both match `*.js`). */
  readonly extensions?: readonly string[];
  /**
   * Follow symbolic links to their targets (linked dirs/files walk like real ones).
   * Default `false` (symlinked entries are skipped). Either way a `realpath`
   * visited-set makes the walk cycle-safe by construction — a circular link can
   * never recurse forever.
   */
  readonly followSymlinks?: boolean;
}

/**
 * Recursively collect every file under `root` matching the filters, depth-first in
 * DETERMINISTIC order (each directory's entries are visited name-sorted, so the
 * result is stable across hosts regardless of `readdirSync` order).
 *
 * With no `suffixes`/`extensions` every file is returned; with both, a file matches
 * if it satisfies EITHER list. Directories named in `skipDirs` are pruned. An
 * unreadable directory is skipped (a vanished/permission-denied subtree never aborts
 * the whole walk).
 *
 * Returned paths are `root` joined with each entry — ABSOLUTE when `root` is absolute
 * (the majority need: vite's `scanProject` and the cli's `collectJsFiles`). A caller
 * wanting repo-relative POSIX ids slices off the root and routes through
 * `normalizeRepoPath` (as the cli walkers already do).
 */
export function walkFiles(root: string, options: WalkFilesOptions = {}): string[] {
  const skip = new Set(options.skipDirs ?? []);
  const suffixes = options.suffixes ?? [];
  const extensions = (options.extensions ?? []).map((e) => (e.startsWith('.') ? e : `.${e}`));
  const follow = options.followSymlinks ?? false;
  const filtered = suffixes.length > 0 || extensions.length > 0;

  const matches = (name: string): boolean => {
    if (!filtered) return true;
    for (const s of suffixes) if (name.endsWith(s)) return true;
    for (const e of extensions) if (name.endsWith(e)) return true;
    return false;
  };

  const out: string[] = [];
  // Physical (realpath) identity of every directory already walked — a symlinked
  // dir followed below would otherwise let a circular link (`dir/loop -> dir`)
  // recurse forever. The set guards the walk even when `followSymlinks` is false.
  const visited = new Set<string>();

  const walk = (dir: string): void => {
    let real: string;
    try {
      real = realpathSync(dir);
    } catch {
      real = resolve(dir);
    }
    if (visited.has(real)) return;
    visited.add(real);

    let entries: Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      // Broken link, vanished dir, or permission denied — skip its subtree.
      return;
    }
    // Name-sorted for deterministic, host-independent traversal order.
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

    for (const entry of entries) {
      const entryPath = join(dir, entry.name);
      let isDir = entry.isDirectory();
      let isFile = entry.isFile();
      if (entry.isSymbolicLink()) {
        if (!follow) continue;
        try {
          const st = statSync(entryPath);
          isDir = st.isDirectory();
          isFile = st.isFile();
        } catch {
          continue; // Dangling symlink — nothing to walk.
        }
      }
      if (isDir) {
        if (!skip.has(entry.name)) walk(entryPath);
      } else if (isFile && matches(entry.name)) {
        out.push(entryPath);
      }
    }
  };

  walk(root);
  return out;
}
