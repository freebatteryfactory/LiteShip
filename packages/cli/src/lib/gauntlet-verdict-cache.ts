/**
 * The fs-backed gate-verdict cache + the TOOLCHAIN DIGEST (Slice B, B2 — the HOST
 * half of the content-addressed incremental system).
 *
 * The lean `@czap/gauntlet` engine DEFINES the cache (the `GateVerdictCache`
 * interface, the pure `gateVerdictKey` / `coverageDigestOf` key builders) and
 * carries NO `fs` and NO crypto. This module — in the CLI, which already owns
 * `fs` + `node:crypto` (the idempotency layer) — supplies the two host-built
 * capabilities the engine consumes:
 *
 * 1. {@link makeFsVerdictCache} — a {@link GateVerdictCache} that stores each
 *    gate's RAW findings as JSON under `.czap/cache/gauntlet/<keyhash>.json`,
 *    reusing the idempotency `.czap/cache` layout + an atomic temp-then-rename
 *    write. A read that is absent, unreadable, or malformed returns `null` (a
 *    cache MISS) — a SANCTIONED fallthrough (documented below), never a corrupt
 *    serve and never a silent swallow: it falls through to a re-run, the SAFE
 *    direction (re-run is always sound; a stale/corrupt serve is the lie).
 *
 * 2. {@link gauntletToolchainDigest} — the ANTI-LIE KEYSTONE. A hash over the
 *    `@czap/gauntlet` BUILT artifact (its `dist/**.js` bytes) + the gauntlet
 *    package version + the env fingerprint. It CHANGES when the gauntlet's gate
 *    logic changes (a gate edit → `tsc` rebuild → new dist bytes → new digest →
 *    every cached verdict invalidated). WITHOUT it, editing a gate's logic while
 *    its covered files are unchanged would serve a stale verdict — the exact lie
 *    B2's soundness rail exists to prevent. The covered-files digest catches a
 *    code change in the FILES UNDER TEST; the toolchain digest catches a code
 *    change in the GATE doing the testing. A sound cache needs both.
 *
 * @module
 */

import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { isFinding, type Finding, type GateVerdictCache } from '@czap/gauntlet';
import { currentEnvFingerprint } from '@czap/command/host';
import { normalizeRepoPath } from '@czap/audit';
import { IoError } from '@czap/error';

/** The cache sub-directory under `.czap/cache` (sibling to the idempotency receipts). */
const GAUNTLET_CACHE_DIR = ['.czap', 'cache', 'gauntlet'] as const;

/** Hash the engine's stable verdict KEY into a short filesystem-safe slug. */
function keyToSlug(key: string): string {
  return createHash('sha256').update(key, 'utf8').digest('hex').slice(0, 32);
}

/** The on-disk path for a verdict keyed by the engine's `gateVerdictKey`. */
function verdictPath(key: string, cwd: string): string {
  return join(cwd, ...GAUNTLET_CACHE_DIR, `${keyToSlug(key)}.json`);
}

/**
 * Parse a cache file's JSON into a `Finding[]`, or return `null` when it is not a
 * well-formed array of findings. This is the structural guard behind the
 * malformed-MISS fallthrough: a half-written file, a hand-edited file, or a
 * schema drift parses to `null` (→ re-run), never to a partial/garbage verdict
 * that could be served as if real. Every element is checked with the engine's own
 * {@link isFinding} guard, so a JSON array of the wrong shape is a MISS, not a
 * corrupt serve.
 */
function parseFindings(raw: string): readonly Finding[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    // JSON.parse throws ONLY SyntaxError ⇒ malformed cache contents ⇒ a designed MISS
    // (re-run is the SAFE direction — never serve a guess). The binding is CONSUMED by
    // discriminating it: anything that is NOT a SyntaxError is an impossible VM-level
    // fault, surfaced loud rather than silently degraded into a miss that masks it.
    if (!(err instanceof SyntaxError)) throw err;
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  for (const el of parsed) {
    if (!isFinding(el)) return null;
  }
  return parsed as readonly Finding[];
}

/**
 * Build an fs-backed {@link GateVerdictCache} rooted at `cwd` (defaults to
 * `process.cwd()`). Stores each gate's RAW findings as pretty JSON under
 * `.czap/cache/gauntlet/<keyhash>.json`.
 *
 * `read` returns `null` (a MISS → re-run) for ANY uncertain case — absent file,
 * unreadable file, or malformed contents — the documented fallthrough that keeps
 * the cache sound: re-running is always correct; serving a corrupt/stale value is
 * the lie. `write` is ATOMIC (temp file + rename) so a crash mid-write never
 * leaves a half-file that a later read could mistake for a real verdict.
 */
export function makeFsVerdictCache(cwd: string = process.cwd()): GateVerdictCache {
  return {
    read(key: string): readonly Finding[] | null {
      const path = verdictPath(key, cwd);
      if (!existsSync(path)) return null;
      let raw: string;
      try {
        raw = readFileSync(path, 'utf8');
      } catch (err) {
        // The file existed at the existsSync check, so a read failure here is a perms
        // issue or a delete/replace race ⇒ a designed MISS (re-run, the SAFE direction).
        // The binding is CONSUMED by discriminating the fs error code: a read failure
        // with NO recognized best-effort code (e.g. EIO — a real disk fault) is
        // surfaced as a tagged IoError rather than silently masked behind a miss.
        const code = (err as NodeJS.ErrnoException).code;
        if (code === 'ENOENT' || code === 'EACCES' || code === 'EISDIR' || code === 'EPERM') {
          return null;
        }
        throw IoError('verdict-cache.read', `unreadable cache entry (${String(code ?? 'unknown')})`, {
          path,
          cause: err,
        });
      }
      return parseFindings(raw);
    },
    write(key: string, findings: readonly Finding[]): void {
      const path = verdictPath(key, cwd);
      mkdirSync(dirname(path), { recursive: true });
      // Atomic: write a unique temp file, then rename over the target. A rename is
      // atomic on a single filesystem, so a concurrent reader sees either the old
      // file or the complete new one — never a partial write.
      const tmp = `${path}.${process.pid}.${createHash('sha256').update(key).digest('hex').slice(0, 8)}.tmp`;
      writeFileSync(tmp, JSON.stringify(findings, null, 2), 'utf8');
      renameSync(tmp, path);
    },
  };
}

/** Stable string fold of a file's `(relPath, sha256-of-bytes)` — sorted, separator-delimited. */
function hashFileInto(hash: ReturnType<typeof createHash>, relPath: string, absPath: string): void {
  // Hash the path AND the bytes: a renamed-but-identical file is a different
  // toolchain (the dist layout changed), and changed bytes are a changed gate.
  hash.update(relPath, 'utf8');
  hash.update('\0', 'utf8');
  hash.update(readFileSync(absPath));
  hash.update('\0', 'utf8');
}

/** Recursively collect `*.js` files under `dir`, repo-relative to `root`, SORTED. */
function collectJsFiles(dir: string, root: string): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const abs = join(d, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        out.push(abs);
      }
    }
  };
  walk(dir);
  // Sort by the repo-relative path so the fold is order-independent across hosts.
  return out.sort((a, b) => relTo(root, a).localeCompare(relTo(root, b)));
}

/**
 * POSIX-normalized path of `abs` relative to `root` (stable across platforms).
 * Slash normalization routes through `@czap/audit`'s single `normalizeRepoPath`
 * home (the B5b one-normalizer cage), never an inline `\\→/` copy.
 */
function relTo(root: string, abs: string): string {
  return normalizeRepoPath(abs.slice(root.length)).replace(/^\/+/, '');
}

/**
 * Compute the TOOLCHAIN DIGEST — the anti-lie keystone. A sha256 over:
 * - the gauntlet package VERSION (a published-version bump is a logic change), then
 * - every `dist/**.js` byte of the BUILT `@czap/gauntlet` (a gate edit → rebuilt
 *   dist → changed bytes → changed digest), folded in sorted repo-relative order,
 * - the env fingerprint (node / platform / arch / pm — the same toolchain identity
 *   the idempotency layer folds, so a verdict cached under one runtime is never
 *   served to another).
 *
 * The gauntlet's dist directory is located via `import.meta.resolve`
 * (the ESM resolver), then walking up to its `dist`. `import.meta.resolve` — NOT
 * `createRequire(...).resolve` — because `@czap/gauntlet`'s `exports` are
 * import-only (no `require`/`default` condition), so the CJS resolver throws
 * `ERR_PACKAGE_PATH_NOT_EXPORTED` even when the package is correctly built and
 * installed (the same ESM-only-exports trap the vite wasm resolver already documents
 * — `wasm-package-resolve.ts`). If the dist cannot be found or read, this THROWS a
 * tagged {@link IoError} (a build-resolver must never throw on the happy path, but
 * here a MISSING built gauntlet is a real misconfiguration the caller must see —
 * caching against a digest we could not compute would be unsound, so we fail loud
 * rather than degrade to a constant).
 */
export function gauntletToolchainDigest(env: Readonly<Record<string, string>> = currentEnvFingerprint()): string {
  let entry: string;
  try {
    entry = fileURLToPath(import.meta.resolve('@czap/gauntlet'));
  } catch (cause) {
    throw IoError(
      'gauntletToolchainDigest',
      'cannot resolve @czap/gauntlet to compute the toolchain digest — the gauntlet must be installed/built for the verdict cache to be sound',
      { cause },
    );
  }
  // entry is .../@czap/gauntlet/dist/index.js → its directory is the dist root.
  const distDir = dirname(entry);
  if (!existsSync(distDir) || !statSync(distDir).isDirectory()) {
    throw IoError(
      'gauntletToolchainDigest',
      `the resolved @czap/gauntlet dist directory "${distDir}" is absent — run \`pnpm --filter @czap/gauntlet build\` before a cached gauntlet run`,
      { path: distDir },
    );
  }

  const hash = createHash('sha256');
  hash.update(gauntletPackageVersion(distDir), 'utf8');
  hash.update('\0', 'utf8');
  for (const abs of collectJsFiles(distDir, distDir)) {
    hashFileInto(hash, relTo(distDir, abs), abs);
  }
  // Fold the env fingerprint LAST (sorted keys → order-independent).
  for (const k of Object.keys(env).sort()) {
    hash.update(`${k}=${env[k] ?? ''}\0`, 'utf8');
  }
  return `tc-sha256:${hash.digest('hex').slice(0, 32)}`;
}

/** Read the gauntlet package version from its manifest (a sibling of `dist`). */
function gauntletPackageVersion(distDir: string): string {
  const manifestPath = join(dirname(distDir), 'package.json');
  if (!existsSync(manifestPath)) return 'unknown-version';
  const parsed: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (typeof parsed === 'object' && parsed !== null && 'version' in parsed) {
    const v = (parsed as { version: unknown }).version;
    if (typeof v === 'string') return v;
  }
  return 'unknown-version';
}
