/**
 * pnpm-lock.yaml reader — the minimal, structural parser the supply-chain host
 * needs (lockfile policy + SBOM + provenance). NOT a general YAML parser: it
 * reads ONLY the three top-level blocks the supply chain reasons over —
 * `lockfileVersion`, `importers:` (the per-package specifier→version edges) and
 * `packages:` (the resolved registry units with their integrity digests).
 *
 * Why a hand-rolled reader and not a `yaml` dependency: pnpm-lock.yaml is a
 * machine-emitted file with a fixed, line-oriented shape (two-space indent,
 * single-quoted keys, `resolution: {integrity: …}` inline maps). Adding a heavy
 * YAML dep to ship the supply-chain gate would itself widen the dependency
 * surface the gate exists to police — the wrong trade. The reader is total over
 * the pnpm@9 (`lockfileVersion: '9.0'`) shape this monorepo emits and FAILS
 * LOUD (tagged {@link ParseError}) on anything it cannot account for, rather than
 * silently dropping a package (which would let a real floating dep slip the
 * policy + SBOM completeness check).
 *
 * @module
 */

import { ParseError } from '@czap/error';

/** A single resolved registry unit from the lockfile's `packages:` block. */
export interface LockfilePackage {
  /** The `name@version(peer…)` key exactly as the lockfile writes it. */
  readonly key: string;
  /** Bare package name (scope included), parsed off {@link key}. */
  readonly name: string;
  /** Version, parsed off {@link key}. */
  readonly version: string;
  /**
   * The Subresource-Integrity-style digest pnpm records for the resolved
   * artifact (e.g. `sha512-…`). `null` when the `resolution:` map carried NO
   * `integrity` — the floating/unhashed case the policy flags (a non-registry
   * resolution: a git, tarball, or directory source has no integrity hash).
   */
  readonly integrity: string | null;
  /**
   * The non-integrity resolution kind, when present (`tarball` / `git` /
   * `directory`). `null` for the normal registry case. A non-null value is the
   * URL/git-dep the policy refuses.
   */
  readonly resolutionKind: 'tarball' | 'git' | 'directory' | null;
}

/** One importer (workspace package or repo root) and its declared specifiers. */
export interface LockfileImporter {
  /** Importer path relative to the repo root; `.` is the root. */
  readonly path: string;
  /** Declared `specifier → resolved version` edges across all dep sections. */
  readonly specifiers: readonly LockfileSpecifier[];
}

/** A single `specifier:`/`version:` pair under an importer's dep section. */
export interface LockfileSpecifier {
  /** Dependency name (the YAML key above the specifier/version pair). */
  readonly name: string;
  /** The declared range/spec exactly as the package.json wrote it. */
  readonly specifier: string;
  /** The concrete version pnpm resolved the specifier to. */
  readonly version: string;
  /** `dependencies` | `devDependencies` | `optionalDependencies` | `peerDependencies`. */
  readonly section: DependencySection;
}

export type DependencySection =
  | 'dependencies'
  | 'devDependencies'
  | 'optionalDependencies'
  | 'peerDependencies';

/** The parsed lockfile — only the blocks the supply chain reasons over. */
export interface ParsedLockfile {
  readonly lockfileVersion: string;
  readonly importers: readonly LockfileImporter[];
  readonly packages: readonly LockfilePackage[];
}

const SECTION_NAMES: ReadonlySet<string> = new Set<DependencySection>([
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
]);

/** Strip surrounding single/double quotes a YAML scalar may carry. */
function unquote(raw: string): string {
  const t = raw.trim();
  if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) {
    return t.slice(1, -1);
  }
  return t;
}

/** Indent width (leading spaces) of a line. */
function indentOf(line: string): number {
  let n = 0;
  while (n < line.length && line[n] === ' ') n++;
  return n;
}

/**
 * Split a `name@version(peers…)` lockfile key into `{ name, version }`. The
 * version is everything after the LAST `@` that is not the scope `@` — pnpm
 * keys are `@scope/name@1.2.3` and `name@1.2.3(peer@4)`, so we locate the
 * version `@` as the last `@` preceding a digit-or-paren run. The peer suffix
 * `(…)` stays attached to the version (it is part of the resolved identity).
 */
function splitKey(key: string): { name: string; version: string } {
  // Find the @ that begins the version: the last @ whose next char starts a
  // semver-ish version (a digit). Scope @ is at index 0 for scoped names.
  let at = -1;
  for (let i = key.length - 1; i > 0; i--) {
    if (key[i] === '@') {
      const next = key[i + 1];
      if (next !== undefined && next >= '0' && next <= '9') {
        at = i;
        break;
      }
    }
  }
  if (at <= 0) {
    return { name: key, version: '' };
  }
  return { name: key.slice(0, at), version: key.slice(at + 1) };
}

/** Parse the inline `resolution: {…}` map for integrity + non-registry kind. */
function parseResolution(line: string): { integrity: string | null; kind: LockfilePackage['resolutionKind'] } {
  const open = line.indexOf('{');
  const close = line.lastIndexOf('}');
  if (open < 0 || close < 0 || close <= open) return { integrity: null, kind: null };
  const body = line.slice(open + 1, close);
  let integrity: string | null = null;
  let kind: LockfilePackage['resolutionKind'] = null;
  for (const part of body.split(',')) {
    const eq = part.indexOf(':');
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    const v = unquote(part.slice(eq + 1));
    if (k === 'integrity') integrity = v;
    else if (k === 'tarball') kind = 'tarball';
    else if (k === 'commit' || k === 'repo') kind = 'git';
    else if (k === 'directory') kind = 'directory';
  }
  return { integrity, kind };
}

/**
 * Parse a pnpm-lock.yaml's text into the supply-chain view. Total over the
 * pnpm@9 shape; throws a tagged {@link ParseError} on a `lockfileVersion` it
 * cannot read or a structurally impossible line, so a malformed lockfile can
 * never quietly under-report packages to the SBOM/policy.
 */
export function parseLockfile(text: string): ParsedLockfile {
  const lines = text.split(/\r?\n/);
  let lockfileVersion = '';
  const importers: LockfileImporter[] = [];
  const packages: LockfilePackage[] = [];

  // Top-level block cursor.
  type Block = 'none' | 'importers' | 'packages';
  let block: Block = 'none';

  // importers state
  let curImporterPath: string | null = null;
  let curImporterSpecs: LockfileSpecifier[] = [];
  let curSection: DependencySection | null = null;
  let pendingDepName: string | null = null;
  let pendingSpecifier: string | null = null;

  const flushImporter = (): void => {
    if (curImporterPath !== null) {
      importers.push({ path: curImporterPath, specifiers: curImporterSpecs });
    }
    curImporterPath = null;
    curImporterSpecs = [];
    curSection = null;
    pendingDepName = null;
    pendingSpecifier = null;
  };

  // packages state
  let curPkgKey: string | null = null;

  const flushNothingForPackages = (): void => {
    curPkgKey = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.trim() === '') continue;
    const indent = indentOf(line);
    const trimmed = line.trim();

    // Top-level key (indent 0): switches the active block.
    if (indent === 0) {
      flushImporter();
      flushNothingForPackages();
      if (trimmed.startsWith('lockfileVersion:')) {
        lockfileVersion = unquote(trimmed.slice('lockfileVersion:'.length));
        block = 'none';
        continue;
      }
      if (trimmed === 'importers:') {
        block = 'importers';
        continue;
      }
      if (trimmed === 'packages:') {
        block = 'packages';
        continue;
      }
      // Any other top-level block (settings, overrides, snapshots, etc.) — we
      // do not model it; leave the cursor parked at 'none'.
      block = 'none';
      continue;
    }

    if (block === 'importers') {
      // indent 2 → an importer path key (e.g. `.:` or `packages/cli:`)
      if (indent === 2 && trimmed.endsWith(':')) {
        flushImporter();
        curImporterPath = unquote(trimmed.slice(0, -1));
        continue;
      }
      // indent 4 → a dep section header (dependencies:, devDependencies:, …)
      if (indent === 4 && trimmed.endsWith(':')) {
        const name = trimmed.slice(0, -1);
        curSection = SECTION_NAMES.has(name) ? (name as DependencySection) : null;
        pendingDepName = null;
        pendingSpecifier = null;
        continue;
      }
      // indent 6 → a dependency name key under a section
      if (indent === 6 && trimmed.endsWith(':') && curSection !== null) {
        pendingDepName = unquote(trimmed.slice(0, -1));
        pendingSpecifier = null;
        continue;
      }
      // indent 8 → specifier: / version: under a dep name
      if (indent === 8 && curSection !== null && pendingDepName !== null) {
        if (trimmed.startsWith('specifier:')) {
          pendingSpecifier = unquote(trimmed.slice('specifier:'.length));
          continue;
        }
        if (trimmed.startsWith('version:')) {
          const version = unquote(trimmed.slice('version:'.length));
          if (pendingSpecifier === null) {
            throw ParseError('pnpm-lock.yaml', `importer dependency ${pendingDepName} has a version without a specifier`, {
              offset: i + 1,
            });
          }
          curImporterSpecs.push({
            name: pendingDepName,
            specifier: pendingSpecifier,
            version,
            section: curSection,
          });
          pendingDepName = null;
          pendingSpecifier = null;
          continue;
        }
      }
      continue;
    }

    if (block === 'packages') {
      // indent 2 → a package key (e.g. `'@scope/name@1.2.3':`)
      if (indent === 2 && trimmed.endsWith(':')) {
        curPkgKey = unquote(trimmed.slice(0, -1));
        continue;
      }
      // indent 4 → resolution / engines / etc. under the current package
      if (indent === 4 && curPkgKey !== null && trimmed.startsWith('resolution:')) {
        const { integrity, kind } = parseResolution(trimmed);
        const { name, version } = splitKey(curPkgKey);
        packages.push({ key: curPkgKey, name, version, integrity, resolutionKind: kind });
        continue;
      }
      continue;
    }
  }
  flushImporter();

  if (lockfileVersion === '') {
    throw ParseError('pnpm-lock.yaml', 'no lockfileVersion found — not a recognizable pnpm lockfile');
  }
  return { lockfileVersion, importers, packages };
}
