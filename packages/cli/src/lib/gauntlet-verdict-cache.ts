/**
 * The fs-backed gate-verdict cache + the TOOLCHAIN DIGEST (Slice B, B2 — the HOST
 * half of the content-addressed incremental system).
 *
 * The lean `@liteship/gauntlet` engine DEFINES the cache (the `GateVerdictCache`
 * interface, the pure `gateVerdictKey` / `coverageDigestOf` key builders) and
 * carries NO `fs` and NO crypto. This module — in the CLI, which already owns
 * `fs` + `node:crypto` (the idempotency layer) — supplies the two host-built
 * capabilities the engine consumes:
 *
 * 1. {@link makeFsVerdictCache} — a {@link GateVerdictCache} that stores each
 *    gate's RAW findings as JSON under `.liteship/cache/gauntlet/<keyhash>.json`,
 *    reusing the idempotency `.liteship/cache` layout + an atomic temp-then-rename
 *    write. A read that is absent, unreadable, or malformed returns `null` (a
 *    cache MISS) — a SANCTIONED fallthrough (documented below), never a corrupt
 *    serve and never a silent swallow: it falls through to a re-run, the SAFE
 *    direction (re-run is always sound; a stale/corrupt serve is the lie).
 *
 * 2. {@link gauntletToolchainDigest} — the ANTI-LIE KEYSTONE. A hash over the
 *    BUILT artifacts (the `dist/**.js` bytes + the package version) of EVERY
 *    package whose code computes a gate's verdict OR the IR/facts a gate folds —
 *    `@liteship/gauntlet` (the gates), `@liteship/cli` (the host oracle that mints the
 *    `invariant-regex` facts + the IR-build wiring + this very `repo-ir-gauntlet`
 *    host path), and `@liteship/audit` (the `ts.Program` IR builder + the
 *    LanguageService `symbol-orphan` oracle) — plus the env fingerprint. It
 *    CHANGES when ANY of that fact-producing logic changes (a gate edit OR an
 *    oracle edit → `tsc` rebuild → new dist bytes → new digest → every cached
 *    verdict invalidated). WITHOUT the cli/audit dist folded, editing the ORACLE
 *    logic (the `liteshipRegexOracle` or the LS oracle) while the source bytes +
 *    the gauntlet dist stayed identical would serve a stale verdict — a SECOND,
 *    deeper instance of the exact lie B2's soundness rail exists to prevent (a
 *    "pure-IR" divergence gate folds `ir.facts` whose VALUES the host oracle
 *    computed, so the oracle's code is as load-bearing as the gate's). The
 *    covered-files digest catches a change in the FILES UNDER TEST; the toolchain
 *    digest now catches a change in the GATE doing the testing AND in the ORACLE
 *    producing the facts the gate folds. A sound cache needs all three.
 *
 * @module
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { sha256Hex } from '@liteship/canonical';
import { walkFiles } from '@liteship/core/fs-walk';
import { isFinding, type Finding, type GateVerdictCache } from '@liteship/gauntlet';
import { currentEnvFingerprint } from '@liteship/command/host';
import { normalizeRepoPath, type MutantVerdictCache, type MutantVerdict } from '@liteship/audit';
import { IoError } from '@liteship/error';

/** The cache sub-directory under `.liteship/cache` (sibling to the idempotency receipts). */
const GAUNTLET_CACHE_DIR = ['.liteship', 'cache', 'gauntlet'] as const;

/** The mutation-verdict cache sub-directory under `.liteship/cache` (sibling to gauntlet). */
const MUTATION_CACHE_DIR = ['.liteship', 'cache', 'mutation'] as const;

/** The closed set of mutant-verdict tags a cache file may hold (the only valid values). */
const MUTANT_VERDICT_TAGS: ReadonlySet<MutantVerdict['_tag']> = new Set(['killed', 'survived', 'no-coverage']);

/** The on-disk path for a mutant verdict keyed by the engine's `mutantVerdictKey`. */
function mutantVerdictPath(key: string, cwd: string): string {
  return join(cwd, ...MUTATION_CACHE_DIR, `${keyToSlug(key)}.txt`);
}

/**
 * Build an fs-backed {@link MutantVerdictCache} rooted at `cwd` — the production half
 * of the B2 content-addressed mutant-verdict store the avionics mutation run keys
 * against (`mutantVerdictKey` = `mutant.id + coveringTestsDigest + toolchainDigest`).
 * It stores ONLY the verdict TAG (a single line) under
 * `.liteship/cache/mutation/<keyhash>.txt`, mirroring the gauntlet verdict cache's
 * sound-MISS discipline:
 *
 * `read` returns `null` (a MISS → re-run, the SAFE direction) for ANY uncertain case
 * — absent file, unreadable file, or a value that is not one of the three sanctioned
 * tags — so a corrupt/stale/hand-edited entry can never be served as a real verdict
 * (a stale "killed" hiding a now-surviving mutant is the worst lie this layer could
 * tell). `write` is ATOMIC (temp + rename) so a crash mid-write never leaves a half
 * file. The toolchain digest folded into the key (by the engine) invalidates every
 * cached verdict when the runner logic or the covering tests change.
 */
export function makeFsMutantVerdictCache(cwd: string = process.cwd()): MutantVerdictCache {
  return {
    read(key: string): MutantVerdict['_tag'] | null {
      const path = mutantVerdictPath(key, cwd);
      if (!existsSync(path)) return null;
      let raw: string;
      try {
        raw = readFileSync(path, 'utf8');
      } catch (err) {
        // The file existed at the existsSync check, so a read failure is a perms
        // issue or a delete/replace race ⇒ a designed MISS (re-run, the SAFE
        // direction). A read failure with no recognized best-effort code (e.g. EIO,
        // a real disk fault) surfaces as a tagged IoError rather than a silent miss.
        const code = (err as NodeJS.ErrnoException).code;
        if (code === 'ENOENT' || code === 'EACCES' || code === 'EISDIR' || code === 'EPERM') {
          return null;
        }
        throw IoError('mutant-verdict-cache.read', `unreadable cache entry (${String(code ?? 'unknown')})`, {
          path,
          cause: err,
        });
      }
      const tag = raw.trim();
      // Only one of the three sanctioned tags is a valid serve — anything else
      // (a partial write, a schema drift, a hand-edit) is a MISS, never a guess.
      return MUTANT_VERDICT_TAGS.has(tag as MutantVerdict['_tag']) ? (tag as MutantVerdict['_tag']) : null;
    },
    write(key: string, tag: MutantVerdict['_tag']): void {
      const path = mutantVerdictPath(key, cwd);
      mkdirSync(dirname(path), { recursive: true });
      // Atomic: a unique temp file, then a rename over the target (atomic on one
      // filesystem) so a concurrent reader sees the old file or the complete new one.
      const tmp = `${path}.${process.pid}.${sha256Hex(key).slice(0, 8)}.tmp`;
      writeFileSync(tmp, `${tag}\n`, 'utf8');
      renameSync(tmp, path);
    },
  };
}

/** Hash the engine's stable verdict KEY into a short filesystem-safe slug. */
function keyToSlug(key: string): string {
  return sha256Hex(key).slice(0, 32);
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
 * `.liteship/cache/gauntlet/<keyhash>.json`.
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
      const tmp = `${path}.${process.pid}.${sha256Hex(key).slice(0, 8)}.tmp`;
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
  // The shared `@liteship/core/fs-walk` walker (all dirs, `.js` files); the explicit
  // repo-relative localeCompare sort is preserved so the digest fold stays byte-stable.
  return walkFiles(dir, { suffixes: ['.js'] }).sort((a, b) => relTo(root, a).localeCompare(relTo(root, b)));
}

/**
 * POSIX-normalized path of `abs` relative to `root` (stable across platforms).
 * Slash normalization routes through `@liteship/audit`'s single `normalizeRepoPath`
 * home (the B5b one-normalizer cage), never an inline `\\→/` copy.
 */
function relTo(root: string, abs: string): string {
  return normalizeRepoPath(abs.slice(root.length)).replace(/^\/+/, '');
}

/**
 * The fact-producing packages whose BUILT `dist` the toolchain digest folds, in a
 * FIXED, sorted order so the fold is deterministic regardless of host. Each is a
 * package whose CODE affects a cached gate's raw verdict:
 *  - `@liteship/gauntlet` — the gate logic itself (a gate edit changes a verdict).
 *  - `@liteship/cli` — the HOST oracle that mints the `invariant-regex` facts the
 *    divergence gates fold (`liteshipRegexOracle` in `repo-ir-gauntlet.ts`), the
 *    IR-build wiring, and the host fact-builders; its dist is fact-producing code.
 *  - `@liteship/audit` — the `ts.Program` IR builder + the LanguageService
 *    `symbol-orphan` oracle whose facts the symbol-orphan-divergence gate folds.
 *
 * `@liteship/gauntlet` + `@liteship/audit` are dependencies of `@liteship/cli` (this module's
 * own package) and so resolve via `import.meta.resolve`; `@liteship/cli` resolves to
 * ITSELF (this module's own dist), located by walking up from `import.meta.url` to
 * the package root rather than self-resolving (a package's `exports` need not name
 * itself). The order is sorted so {@link gauntletToolchainDigest} folds them
 * identically every run.
 */
export const TOOLCHAIN_PACKAGES = ['@liteship/audit', '@liteship/cli', '@liteship/gauntlet'] as const;

/**
 * Locate the BUILT `dist` directory + the manifest version of one fact-producing
 * package. `@liteship/cli` is THIS module's own package, resolved by walking up from
 * `import.meta.url` to the nearest `package.json` named `@liteship/cli` (a package's own
 * `exports` map need not expose a self-import condition, so `import.meta.resolve`
 * is not reliable for self-resolution). Every OTHER package is a declared dependency
 * resolved via `import.meta.resolve` (the ESM resolver — NOT `createRequire`, because
 * the `@liteship/*` `exports` are import-only and the CJS resolver throws
 * `ERR_PACKAGE_PATH_NOT_EXPORTED` even on a correct build; the same ESM-only-exports
 * trap `wasm-package-resolve.ts` documents). A package that cannot be resolved or
 * whose `dist` is absent THROWS a tagged {@link IoError} — caching against a digest
 * we could not compute over ALL fact-producing code would be unsound, so we fail loud
 * rather than degrade to a constant (a build-resolver must not throw on the happy
 * path, but a MISSING built dependency here is a real misconfiguration the caller
 * must see).
 */
function resolvePackageDist(pkg: string): { distDir: string; version: string } {
  let packageRoot: string;
  if (pkg === '@liteship/cli') {
    packageRoot = ownPackageRoot();
  } else {
    let entry: string;
    try {
      entry = fileURLToPath(import.meta.resolve(pkg));
    } catch (cause) {
      throw IoError(
        'gauntletToolchainDigest',
        `cannot resolve ${pkg} to compute the toolchain digest — every fact-producing package (the gates, the host oracle, the IR builder) must be installed/built for the verdict cache to be sound`,
        { cause },
      );
    }
    // entry is .../<pkg>/dist/index.js → up one is the dist root, up two is the package root.
    packageRoot = dirname(dirname(entry));
  }
  const distDir = join(packageRoot, 'dist');
  if (!existsSync(distDir) || !statSync(distDir).isDirectory()) {
    throw IoError(
      'gauntletToolchainDigest',
      `the ${pkg} dist directory "${distDir}" is absent — run \`pnpm --filter ${pkg} build\` before a cached gauntlet run (the verdict cache folds it to stay sound against a fact-producing code change)`,
      { path: distDir },
    );
  }
  return { distDir, version: packageManifestVersion(packageRoot) };
}

/**
 * Walk up from THIS module's URL to the nearest `package.json` named `@liteship/cli` —
 * the package root of the CLI host. The host oracle, the IR-build wiring, and this
 * very module all live under that root's `dist`. Throws a tagged {@link IoError}
 * if the walk runs out of parents without finding the manifest (an impossible
 * layout — this module IS inside `@liteship/cli`).
 */
function ownPackageRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  // Bound the walk by the filesystem root (basename(dir) === dir at the root).
  while (basename(dir) !== dir) {
    const manifestPath = join(dir, 'package.json');
    if (existsSync(manifestPath)) {
      const parsed: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));
      if (typeof parsed === 'object' && parsed !== null && (parsed as { name?: unknown }).name === '@liteship/cli') {
        return dir;
      }
    }
    dir = dirname(dir);
  }
  throw IoError(
    'gauntletToolchainDigest',
    'cannot locate the @liteship/cli package root from this module — the toolchain digest cannot fold the host oracle dist',
    { path: fileURLToPath(import.meta.url) },
  );
}

/**
 * Compute the TOOLCHAIN DIGEST — the anti-lie keystone. A sha256 over, for EACH
 * fact-producing package ({@link TOOLCHAIN_PACKAGES}, in sorted order):
 * - the package id + its manifest VERSION (a published-version bump is a logic
 *   change), then
 * - every `dist/**.js` byte of the BUILT package (a gate OR oracle edit → rebuilt
 *   dist → changed bytes → changed digest), folded in sorted repo-relative order,
 * then finally:
 * - the env fingerprint (node / platform / arch / pm — the same toolchain identity
 *   the idempotency layer folds, so a verdict cached under one runtime is never
 *   served to another).
 *
 * Folding `@liteship/cli` + `@liteship/audit` alongside `@liteship/gauntlet` closes the deeper
 * soundness hole: a "pure-IR" divergence gate folds `ir.facts`/`ir.refs` whose
 * VALUES are computed by the host's `liteshipRegexOracle` (`@liteship/cli`) and the
 * audit LanguageService oracle (`@liteship/audit`); their code is therefore as
 * load-bearing on the verdict as the gate's own. An oracle-logic change with
 * byte-identical source + an unchanged gauntlet dist now still flips the digest →
 * no stale hit.
 *
 * If ANY package cannot be resolved or its `dist` read, this THROWS a tagged
 * {@link IoError} (see {@link resolvePackageDist}) — a missing built dependency is
 * a real misconfiguration; caching against a digest we could not compute over all
 * fact-producing code would be unsound, so we fail loud rather than degrade.
 */
export function gauntletToolchainDigest(env: Readonly<Record<string, string>> = currentEnvFingerprint()): string {
  const resolved = TOOLCHAIN_PACKAGES.map((pkg) => {
    const { distDir, version } = resolvePackageDist(pkg);
    return { label: pkg, distDir, version };
  });
  return toolchainDigestOf(resolved, env);
}

/** One fact-producing package's BUILT segment, as folded by {@link toolchainDigestOf}. */
export interface ToolchainPackageSegment {
  /** The package id — namespaces this segment so two dist trees can never alias. */
  readonly label: string;
  /** The absolute path of the package's BUILT `dist` directory (every `*.js` byte folded). */
  readonly distDir: string;
  /** The package's manifest version (a published-version bump is a logic change). */
  readonly version: string;
}

/**
 * The PURE digest core (extracted so the soundness law can be proven WITHOUT
 * perturbing a real built `dist`). Folds, for each `segment` IN THE GIVEN ORDER:
 * its `label@version`, then every `dist/**.js` byte (sorted repo-relative). Then
 * the env fingerprint (sorted keys → order-independent). Returns the
 * `tc-sha256:<32hex>` digest.
 *
 * Because EVERY segment's bytes fold in, a change to ANY fact-producing package's
 * dist (the gates in `@liteship/gauntlet`, the host oracle in `@liteship/cli`, the IR
 * builder / LS oracle in `@liteship/audit`) flips the digest — the keystone that makes
 * an oracle-logic change invalidate every cached verdict even when the source bytes
 * + the other packages' dist are byte-identical. {@link gauntletToolchainDigest}
 * resolves the real packages and delegates here.
 */
export function toolchainDigestOf(
  segments: readonly ToolchainPackageSegment[],
  env: Readonly<Record<string, string>>,
): string {
  const hash = createHash('sha256');
  for (const { label, distDir, version } of segments) {
    // Namespace each package's segment by its id so two packages' dist trees can
    // never alias, and fold the version (a bump is a logic change).
    hash.update(`pkg:${label}@${version}`, 'utf8');
    hash.update('\0', 'utf8');
    for (const abs of collectJsFiles(distDir, distDir)) {
      hashFileInto(hash, relTo(distDir, abs), abs);
    }
    // A record-separator double-NUL between packages so the boundary is unambiguous.
    hash.update('\0\0', 'utf8');
  }
  // Fold the env fingerprint LAST (sorted keys → order-independent).
  for (const k of Object.keys(env).sort()) {
    hash.update(`${k}=${env[k] ?? ''}\0`, 'utf8');
  }
  return `tc-sha256:${hash.digest('hex').slice(0, 32)}`;
}

/** Read a package's version from its manifest (the root of `dist`). */
function packageManifestVersion(packageRoot: string): string {
  const manifestPath = join(packageRoot, 'package.json');
  if (!existsSync(manifestPath)) return 'unknown-version';
  const parsed: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (typeof parsed === 'object' && parsed !== null && 'version' in parsed) {
    const v = (parsed as { version: unknown }).version;
    if (typeof v === 'string') return v;
  }
  return 'unknown-version';
}
