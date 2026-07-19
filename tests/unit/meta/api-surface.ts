/**
 * API-surface SNAPSHOT generator (Slice C, the avionics tier).
 *
 * Turns the hand-maintained `api-health.test.ts` registry — a footgun that must
 * be remembered on every export change — into a GENERATED, deterministic
 * serialization of each published `@liteship/*` main barrel's public surface. A
 * committed snapshot (`tests/fixtures/api-surface-snapshot.json`) is the
 * reviewable ground truth; the gate REGENERATES the live surface and DIFFS it,
 * so an accidental public-API change is impossible to miss and a deliberate one
 * is a reviewed snapshot edit.
 *
 * KIND classification is RUNTIME-derived (the same `import * as` approach
 * api-health uses), not a TypeScript AST parse: a barrel's exported VALUES carry
 * their kind in `typeof` + a couple of structural reads. Type-only exports
 * (`export type`) have no runtime footprint and are intentionally OUT of the
 * value surface — a type rename is a source-level review concern, whereas this
 * gate locks the RUNTIME contract a consumer's `import { … }` binds to. The
 * snapshot records export NAME + KIND, plus a cheap structural SIGNATURE for
 * functions (arity) and namespace objects (sorted member names + member kinds) —
 * enough to catch a renamed method or a changed arity (a breaking signature
 * change) without a full type extractor.
 *
 * @module
 */

/** The runtime kind of a single exported binding. */
export type ExportKind = 'function' | 'namespace' | 'const' | 'class' | 'symbol' | 'bigint';

/**
 * One public export's locked descriptor. `signature` is a cheap structural
 * fingerprint: function arity (`(n)`), or a namespace object's sorted
 * `member:kind` list — present only where derivable, name+kind is the floor.
 */
export interface ExportDescriptor {
  readonly name: string;
  readonly kind: ExportKind;
  readonly signature?: string;
}

/** One package's locked surface: its recorded version + the sorted export descriptors. */
export interface PackageSurface {
  readonly version: string;
  readonly exports: readonly ExportDescriptor[];
}

/** The full committed snapshot: a version stamp + per-package surfaces, keyed by package name. */
export interface ApiSurfaceSnapshot {
  /** Snapshot format version — bumped if the descriptor schema itself changes (distinct from package versions). */
  readonly snapshotFormat: 1;
  readonly packages: Readonly<Record<string, PackageSurface>>;
}

/** Is this exported value a constructor (a function whose `prototype` has its own members)? */
const looksLikeClass = (value: (...args: readonly unknown[]) => unknown): boolean => {
  // A `class` declaration's source starts with `class`; an arrow/plain function
  // does not. This is the cheap, robust discriminator (the brand FACTORIES in
  // @liteship/core are plain functions, NOT classes, and must read as `function`).
  return /^class[\s{]/.test(Function.prototype.toString.call(value));
};

/** Classify the runtime KIND of an exported value. */
export const classifyExport = (value: unknown): ExportKind => {
  const t = typeof value;
  if (t === 'function') {
    return looksLikeClass(value as (...args: readonly unknown[]) => unknown) ? 'class' : 'function';
  }
  if (t === 'symbol') return 'symbol';
  if (t === 'bigint') return 'bigint';
  if (t === 'object' && value !== null) {
    // A "namespace" export is a non-null, non-array object whose members include
    // at least one function (the `Boundary`/`Receipt`/`GraphPatch` idiom). A
    // plain data object (a frozen const record, a branded value-object) is a
    // `const`. The distinction matters: a namespace's MEMBERS are part of the
    // surface (a removed method is breaking), a const's internals are opaque.
    if (Array.isArray(value)) return 'const';
    const members = Object.values(value as Record<string, unknown>);
    if (members.some((m) => typeof m === 'function')) return 'namespace';
    return 'const';
  }
  // string | number | boolean | undefined | null → a plain constant value.
  return 'const';
};

/**
 * Derive the cheap structural signature for a value, or `undefined` when name+kind
 * is the floor. Functions → arity; namespace objects → sorted `member:kind` list.
 */
export const deriveSignature = (kind: ExportKind, value: unknown): string | undefined => {
  if (kind === 'function' || kind === 'class') {
    return `(${(value as (...args: readonly unknown[]) => unknown).length})`;
  }
  if (kind === 'namespace') {
    const obj = value as Record<string, unknown>;
    const members = Object.keys(obj)
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
      .map((key) => `${key}:${classifyExport(obj[key])}`);
    return members.join(',');
  }
  return undefined;
};

const codeUnitCompare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Generate one package's surface from its imported module namespace + recorded
 * version. Internal `_`-prefixed exports are excluded (the api-health convention).
 * Exports are sorted by name in deterministic UTF-16 code-unit order so the
 * serialization is byte-stable across machines.
 */
export const generatePackageSurface = (version: string, moduleNamespace: Record<string, unknown>): PackageSurface => {
  const exports: ExportDescriptor[] = [];
  for (const name of Object.keys(moduleNamespace)) {
    if (name.startsWith('_')) continue;
    const value = moduleNamespace[name];
    const kind = classifyExport(value);
    const signature = deriveSignature(kind, value);
    exports.push(signature === undefined ? { name, kind } : { name, kind, signature });
  }
  exports.sort((a, b) => codeUnitCompare(a.name, b.name));
  return { version, exports };
};

/**
 * Serialize a snapshot to its CANONICAL JSON string: keys are emitted in a fixed
 * order (package names sorted; each descriptor's `name`→`kind`→`signature`), with
 * a trailing newline, so a committed snapshot is byte-reproducible and diffs are
 * minimal + reviewable.
 */
export const serializeSnapshot = (snapshot: ApiSurfaceSnapshot): string => {
  const packageNames = Object.keys(snapshot.packages).sort(codeUnitCompare);
  const packages: Record<string, PackageSurface> = {};
  for (const pkg of packageNames) {
    const surface = snapshot.packages[pkg]!;
    packages[pkg] = {
      version: surface.version,
      exports: surface.exports.map((descriptor) =>
        descriptor.signature === undefined
          ? { name: descriptor.name, kind: descriptor.kind }
          : { name: descriptor.name, kind: descriptor.kind, signature: descriptor.signature },
      ),
    };
  }
  return `${JSON.stringify({ snapshotFormat: snapshot.snapshotFormat, packages }, null, 2)}\n`;
};

/** A single classified difference between a prior and a current package surface. */
export interface SurfaceDiff {
  readonly pkg: string;
  /** `added` = minor-compatible; `removed`/`signature-changed` = breaking. */
  readonly changeClass: 'added' | 'removed' | 'signature-changed';
  readonly name: string;
  readonly detail: string;
}

/** Diff two package surfaces, classifying each change. Order-independent (keyed by export name). */
export const diffPackageSurface = (
  pkg: string,
  prior: PackageSurface,
  current: PackageSurface,
): readonly SurfaceDiff[] => {
  const diffs: SurfaceDiff[] = [];
  const priorByName = new Map(prior.exports.map((descriptor) => [descriptor.name, descriptor]));
  const currentByName = new Map(current.exports.map((descriptor) => [descriptor.name, descriptor]));

  for (const [name, currentDescriptor] of currentByName) {
    const priorDescriptor = priorByName.get(name);
    if (!priorDescriptor) {
      diffs.push({ pkg, changeClass: 'added', name, detail: `export ${name} (${currentDescriptor.kind}) added` });
      continue;
    }
    if (priorDescriptor.kind !== currentDescriptor.kind) {
      diffs.push({
        pkg,
        changeClass: 'signature-changed',
        name,
        detail: `export ${name} kind changed ${priorDescriptor.kind} → ${currentDescriptor.kind}`,
      });
      continue;
    }
    if ((priorDescriptor.signature ?? '') !== (currentDescriptor.signature ?? '')) {
      diffs.push({
        pkg,
        changeClass: 'signature-changed',
        name,
        detail: `export ${name} signature changed "${priorDescriptor.signature ?? ''}" → "${currentDescriptor.signature ?? ''}"`,
      });
    }
  }
  for (const [name, priorDescriptor] of priorByName) {
    if (!currentByName.has(name)) {
      diffs.push({ pkg, changeClass: 'removed', name, detail: `export ${name} (${priorDescriptor.kind}) removed` });
    }
  }
  diffs.sort((a, b) => codeUnitCompare(`${a.pkg} ${a.name}`, `${b.pkg} ${b.name}`));
  return diffs;
};

/** A parsed semver core (`major.minor.patch`), prerelease/build tags ignored for the bump check. */
export interface SemverParts {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

/** Parse a `major.minor.patch[-pre][+build]` version, or `undefined` if it is not a valid core triple. */
export const parseSemver = (version: string): SemverParts | undefined => {
  const core = version.split('+')[0]!.split('-')[0]!;
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(core);
  if (!match) return undefined;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
};

/** The observed bump going from `prior` to `current`. */
export type ObservedBump = 'none' | 'patch' | 'minor' | 'major';

/**
 * Classify the bump between two versions. `none` when equal; `patch`/`minor`/`major`
 * for the highest-order component that increased; `undefined` when `current` is a
 * DOWNGRADE (a lower version than `prior`) — a distinct, always-failing condition.
 */
export const classifyBump = (prior: SemverParts, current: SemverParts): ObservedBump | undefined => {
  if (current.major > prior.major) return 'major';
  if (current.major < prior.major) return undefined;
  if (current.minor > prior.minor) return 'minor';
  if (current.minor < prior.minor) return undefined;
  if (current.patch > prior.patch) return 'patch';
  if (current.patch < prior.patch) return undefined;
  return 'none';
};

/** Rank a bump for `>=` comparison against a required minimum. */
const BUMP_RANK: Record<ObservedBump, number> = { none: 0, patch: 1, minor: 2, major: 3 };

/** Does the observed bump satisfy (meet or exceed) the required minimum bump? */
export const bumpSatisfies = (observed: ObservedBump, required: ObservedBump): boolean =>
  BUMP_RANK[observed] >= BUMP_RANK[required];
