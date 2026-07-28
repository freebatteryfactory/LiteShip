/**
 * package-smoke pure helpers — the branch-heavy, spawn-FREE logic extracted from
 * the `package-smoke` subprocess-orchestration command so it can be unit-tested
 * directly (the ship.ts precedent: a pure-orchestration command earns coverage
 * exclusion ONLY once its composable pure helpers are extracted + tested).
 *
 * These helpers are the real decision logic the orchestrator composes:
 *  - {@link resolvePackageManagerInvocation} — the platform launcher resolution.
 *  - {@link tarballFileUrl} — the cross-platform `file://` URL for a tarball path
 *    (the Windows 8.3 short-path realpath fix-up).
 *  - {@link packedLiteshipBin} — the facade-owned executable inside a packed
 *    consumer tree.
 *  - {@link peerDependenciesOnly} — `PEER_INSTALLS` → a `{name: version}` map,
 *    splitting on the LAST `@` so scoped specifiers (`@scope/pkg@1.0.0`) parse.
 *  - {@link findConsumerDependencyRoot} — the three-strategy pnpm resolution
 *    (direct → hoisted `.pnpm/node_modules` → `.pnpm/<pkg>@ver/...` store scan).
 *
 * The remaining package-smoke.ts logic is pure subprocess orchestration
 * (`pnpm pack` ×N → `pnpm install` → `node smoke.mjs` → `liteship describe`) plus
 * `tar`-spawning manifest reads, so that file stays coverage-excluded.
 *
 * @module
 */
import { existsSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import type * as TypeScript from 'typescript';
import { quoteWindowsArg } from '@liteship/command/host';
import { IntegrityError } from '@liteship/error';

export interface ExecutableInvocation {
  readonly command: string;
  readonly args: readonly string[];
  readonly windowsVerbatimArguments: boolean;
}

const PACKAGE_SMOKE_PROCESS_TAIL_CHARS = 4_096;

function boundedProcessTail(raw: string | null | undefined): string {
  const normalized = (raw ?? '')
    .replace(/\u001B\[[0-?]*[ -/]*[@-~]/gu, '')
    .replaceAll('\r\n', '\n')
    .trimEnd();
  if (normalized.length === 0) return '(empty)';
  if (normalized.length <= PACKAGE_SMOKE_PROCESS_TAIL_CHARS) return normalized;
  const omitted = normalized.length - PACKAGE_SMOKE_PROCESS_TAIL_CHARS;
  return `[... ${omitted} earlier chars omitted ...]\n${normalized.slice(-PACKAGE_SMOKE_PROCESS_TAIL_CHARS)}`;
}

/**
 * Preserve the bounded stdout/stderr evidence for a failed package-smoke child.
 * Package managers may write their actionable error to either stream; exit
 * status alone is never enough to classify a release-gate failure.
 */
export function packageSmokeProcessFailure(
  command: PackageSmokeExecutable,
  status: number | null,
  stdout: string | null | undefined,
  stderr: string | null | undefined,
): string {
  return [
    `${command} exited with status ${status ?? 'unknown'}`,
    `stdout tail:\n${boundedProcessTail(stdout)}`,
    `stderr tail:\n${boundedProcessTail(stderr)}`,
  ].join('\n');
}

/** Executables owned by the package-smoke orchestration contract. */
export type PackageSmokeExecutable = 'node' | 'pnpm';

function synchronousInvocation(
  command: string,
  args: readonly string[],
  platform: NodeJS.Platform,
): ExecutableInvocation {
  if (platform !== 'win32' || /\.(?:exe|com)$/iu.test(command)) {
    return { command, args, windowsVerbatimArguments: false };
  }
  return {
    command: 'cmd.exe',
    args: ['/d', '/s', '/c', [command, ...args].map(quoteWindowsArg).join(' ')],
    windowsVerbatimArguments: true,
  };
}

/**
 * Resolve a package-smoke-owned executable through the canonical platform law.
 * The executable identity is a closed union owned by this command; inherited
 * environment such as `npm_execpath` may configure pnpm internals but cannot
 * replace the process we execute. Windows `.cmd`/`.bat` shims are routed through
 * `cmd.exe`; POSIX resolves the literal tool name through the ordinary PATH.
 */
export function resolvePackageManagerInvocation(
  command: PackageSmokeExecutable,
  args: readonly string[],
  options: {
    readonly platform?: NodeJS.Platform;
  } = {},
): ExecutableInvocation {
  return synchronousInvocation(command, args, options.platform ?? process.platform);
}

/**
 * Tarball path → package-manager-readable `file://` URL for the same physical
 * tarball. Windows CI profiles often live under 8.3 short paths (`RUNNER~1`);
 * resolving the physical path may canonicalize that alias to its long spelling.
 * Any `~` that remains must stay literal because npm/pnpm do not open `%7E` as
 * the same Windows path segment.
 */
export function tarballFileUrl(absolutePath: string): string {
  const resolved = process.platform === 'win32' ? realpathSync.native(absolutePath) : absolutePath;
  // RFC 3986 treats `~` as an unreserved path character, but Node's
  // `pathToFileURL()` encodes it as `%7E`. npm and pnpm do not decode that
  // spelling when the URL points through a Windows 8.3 segment such as
  // `RUNNER~1`; they attempt to open a literal `%7E` path instead. Preserve any
  // remaining unreserved tilde while leaving every reserved character encoded.
  return pathToFileURL(resolved).href.replaceAll(/%7E/gi, '~');
}

/** Resolve the one public executable owner inside a packed consumer install. */
export function packedLiteshipBin(consumerDir: string): string {
  return join(consumerDir, 'node_modules', 'liteship', 'bin', 'liteship.mjs');
}

/**
 * `PEER_INSTALLS` specifiers → a `{name: version}` map. The separator follows npm
 * package-name grammar, so scoped names and alias specs both remain intact.
 */
export function peerDependenciesOnly(peerInstalls: readonly string[]): Record<string, string> {
  return Object.fromEntries(
    peerInstalls.map((specifier) => {
      const packageEnd = specifier.startsWith('@') ? specifier.indexOf('/') + 1 : 0;
      const atIndex = specifier.indexOf('@', packageEnd);
      if (atIndex <= 0 || atIndex === specifier.length - 1) {
        throw IntegrityError('package-smoke peer installs', `Invalid pinned peer install specifier: ${specifier}`);
      }
      return [specifier.slice(0, atIndex), specifier.slice(atIndex + 1)];
    }),
  );
}

/**
 * Project the exact host graph qualified by every packed-consumer authority.
 *
 * Public peer ranges stay broad, but a release receipt must not change meaning
 * when a transitive package is published after its source SHA. Vite 8.1.0
 * admits Rolldown `~1.1.2`, while both Rolldown's optional WASI binding and
 * Astro's compiler binding admit `@napi-rs/wasm-runtime ^1.1.6`. Runtime 1.2.0
 * changed to the incompatible `@emnapi/*` 2.0-alpha peer line and made fresh
 * strict-peer installs fail. The repository lock has qualified Rolldown 1.1.3
 * with the WASM runtime at 1.1.6, so every packed proof projects that graph.
 */
export function qualifiedHostOverrides(peerInstalls: readonly string[]): Readonly<Record<string, string>> {
  const peers = peerDependenciesOnly(peerInstalls);
  const vite = peers['vite'];
  if (vite === undefined || !/^\d+\.\d+\.\d+$/u.test(vite)) {
    throw IntegrityError('package-smoke host graph', 'Qualified host graph requires an exact Vite install.');
  }
  return Object.freeze({ vite, rolldown: '1.1.3', '@napi-rs/wasm-runtime': '1.1.6' });
}

/**
 * Resolve `packageName`'s install root under `consumerDir`, trying (1) the direct
 * `node_modules/<pkg>`, (2) the hoisted `node_modules/.pnpm/node_modules/<pkg>`,
 * then (3) a scan of the `.pnpm` store for a `<pkg>@ver/node_modules/<pkg>` entry.
 * Returns `undefined` when none resolve.
 */
export function findConsumerDependencyRoot(consumerDir: string, packageName: string): string | undefined {
  const segments = packageName.split('/');
  const direct = join(consumerDir, 'node_modules', ...segments);
  if (existsSync(join(direct, 'package.json'))) {
    return direct;
  }

  const hoisted = join(consumerDir, 'node_modules', '.pnpm', 'node_modules', ...segments);
  if (existsSync(join(hoisted, 'package.json'))) {
    return hoisted;
  }

  const store = join(consumerDir, 'node_modules', '.pnpm');
  if (!existsSync(store)) {
    return undefined;
  }

  const folderPrefix = `${packageName.replace('/', '+')}@`;
  for (const entry of readdirSync(store)) {
    if (!entry.startsWith(folderPrefix)) {
      continue;
    }
    const candidate = join(store, entry, 'node_modules', ...segments);
    if (existsSync(join(candidate, 'package.json'))) {
      return candidate;
    }
  }

  return undefined;
}

/**
 * Assert `packageName` resolves under `consumerDir` after install; throws a tagged
 * {@link IntegrityError} naming the package + node_modules when it does not (the
 * import-smoke could not otherwise resolve it).
 */
export function assertConsumerDependencyInstalled(consumerDir: string, packageName: string): void {
  if (!findConsumerDependencyRoot(consumerDir, packageName)) {
    throw IntegrityError(
      'package-smoke',
      `${packageName} missing from ${join(consumerDir, 'node_modules')} after install — import-smoke cannot resolve it.`,
    );
  }
}

/** The export-map facts needed to decide which public module paths execute. */
export interface ClosureSubpath {
  readonly packageName: string;
  readonly specifier: string;
  readonly runtimeTarget: string | null;
}

/** The package-catalog classification projected into package-smoke. */
export interface ClosurePackageSurface {
  readonly name: string;
  readonly runtimeSurface: 'module' | 'types-only';
}

/** Runtime paths split into positive imports and deliberate type-only refusals. */
export interface RuntimeClosurePartition {
  readonly imports: readonly string[];
  readonly refusals: readonly {
    readonly packageName: string;
    readonly specifier: string;
  }[];
}

/**
 * Partition export-map runtime targets by the package catalog's declared runtime
 * surface. A type-only package may ship a default refusal stub for a useful error;
 * that stub is a negative runtime contract, not a positive module import.
 */
export function partitionRuntimeClosureSpecifiers(
  subpaths: readonly ClosureSubpath[],
  packages: readonly ClosurePackageSurface[],
): RuntimeClosurePartition {
  const surfaces = new Map(packages.map((pkg) => [pkg.name, pkg.runtimeSurface] as const));
  const imports: string[] = [];
  const refusals: { packageName: string; specifier: string }[] = [];
  for (const entry of subpaths) {
    if (entry.runtimeTarget === null) continue;
    const surface = surfaces.get(entry.packageName);
    if (surface === undefined) {
      throw IntegrityError('package-smoke', `public subpath ${entry.specifier} has no package-catalog runtime surface`);
    }
    if (surface === 'types-only') {
      refusals.push({ packageName: entry.packageName, specifier: entry.specifier });
    } else {
      imports.push(entry.specifier);
    }
  }
  return { imports, refusals };
}

/** One differing file in a pair of semantic tarball closures. */
export interface SemanticClosurePathDiff {
  readonly path: string;
  readonly firstHash: string | null;
  readonly secondHash: string | null;
}

/** Bounded but count-complete semantic closure differences. */
export interface SemanticClosureDiff {
  readonly total: number;
  readonly paths: readonly SemanticClosurePathDiff[];
  readonly truncated: boolean;
}

/**
 * Compare two `{relative path -> content hash}` closures. The count covers every
 * difference while `paths` is deterministically bounded for receipts and CI logs.
 */
export function diffSemanticClosures(
  first: ReadonlyMap<string, string>,
  second: ReadonlyMap<string, string>,
  limit = 12,
): SemanticClosureDiff {
  const boundedLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
  const differing = [...new Set([...first.keys(), ...second.keys()])]
    .sort((a, b) => a.localeCompare(b))
    .filter((path) => first.get(path) !== second.get(path));
  return {
    total: differing.length,
    paths: differing.slice(0, boundedLimit).map((path) => ({
      path,
      firstHash: first.get(path) ?? null,
      secondHash: second.get(path) ?? null,
    })),
    truncated: differing.length > boundedLimit,
  };
}

/** Bounded evidence for one side of a JSON field comparison. */
export interface JsonFieldValueSnapshot {
  readonly present: boolean;
  readonly preview: string | null;
  readonly sha256: string | null;
  readonly truncated: boolean;
}

/** One differing leaf (or type boundary) in two JSON documents. */
export interface JsonFieldPathDiff {
  readonly path: string;
  readonly first: JsonFieldValueSnapshot;
  readonly second: JsonFieldValueSnapshot;
}

/** Bounded but count-complete field differences for a JSON document pair. */
export interface JsonFieldDiff {
  readonly total: number;
  readonly fields: readonly JsonFieldPathDiff[];
  readonly truncated: boolean;
}

const MISSING_JSON_FIELD = Symbol('missing-json-field');

/**
 * Node evaluates conditional exports/imports in insertion order. Ordinary
 * package-manifest maps are semantic maps and remain key-order independent, but
 * sorting a condition object would silently change which target wins (for
 * example `node` before `default`).
 */
function isPackageConditionObject(path: readonly string[], record: Readonly<Record<string, unknown>>): boolean {
  const root = path[0];
  if (root !== 'exports' && root !== 'imports') return false;
  if (path.length > 1) return true;

  const subpathPrefix = root === 'exports' ? '.' : '#';
  const keys = Object.keys(record);
  return keys.length === 0 || !keys.every((key) => key.startsWith(subpathPrefix));
}

function stableJson(value: unknown, path: readonly string[] = []): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'undefined';
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry, index) => stableJson(entry, [...path, String(index)])).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  const canonicalKeys = isPackageConditionObject(path, record) ? keys : keys.sort((a, b) => a.localeCompare(b));
  return `{${canonicalKeys
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key], [...path, key])}`)
    .join(',')}}`;
}

/**
 * Hash one packed file for the semantic closure. Package manifests are JSON
 * documents, so insignificant formatting and semantically-unordered map order
 * are normalized. Conditional objects under `exports` / `imports` preserve key
 * order because Node uses first-match semantics. Every other packed file remains
 * byte-sensitive. Artifact reproducibility is measured separately from the raw
 * tarball bytes and is intentionally unchanged.
 */
export function semanticClosureFileHash(path: string, content: Uint8Array): string {
  const bytes = Buffer.from(content);
  const semanticBytes = path === 'package/package.json' ? stableJson(JSON.parse(bytes.toString('utf8'))) : bytes;
  return createHash('sha256').update(semanticBytes).digest('hex');
}

function jsonValueSnapshot(
  value: unknown | typeof MISSING_JSON_FIELD,
  valueLimit: number,
  path: readonly string[] = [],
): JsonFieldValueSnapshot {
  if (value === MISSING_JSON_FIELD) {
    return { present: false, preview: null, sha256: null, truncated: false };
  }
  const serialized = stableJson(value, path);
  return {
    present: true,
    preview: serialized.slice(0, valueLimit),
    sha256: createHash('sha256').update(serialized).digest('hex'),
    truncated: serialized.length > valueLimit,
  };
}

function jsonPointerSegment(segment: string): string {
  return segment.replaceAll('~', '~0').replaceAll('/', '~1');
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Compare two parsed JSON documents at field granularity. Paths use JSON Pointer;
 * field count and value previews are bounded independently, while per-value hashes
 * retain exact evidence when a preview is truncated. Object key order is ignored,
 * so a changed manifest with zero field differences is identifiable as formatting-
 * or ordering-only drift rather than a semantic field change.
 */
export function diffJsonFields(first: unknown, second: unknown, fieldLimit = 24, valueLimit = 512): JsonFieldDiff {
  const boundedFieldLimit = Number.isFinite(fieldLimit) ? Math.max(0, Math.floor(fieldLimit)) : 0;
  const boundedValueLimit = Number.isFinite(valueLimit) ? Math.max(0, Math.floor(valueLimit)) : 0;
  const differing: JsonFieldPathDiff[] = [];

  const visit = (
    left: unknown | typeof MISSING_JSON_FIELD,
    right: unknown | typeof MISSING_JSON_FIELD,
    path: string,
    segments: readonly string[],
  ): void => {
    if (left !== MISSING_JSON_FIELD && right !== MISSING_JSON_FIELD) {
      if (Array.isArray(left) && Array.isArray(right)) {
        const length = Math.max(left.length, right.length);
        for (let index = 0; index < length; index += 1) {
          visit(
            index < left.length ? left[index] : MISSING_JSON_FIELD,
            index < right.length ? right[index] : MISSING_JSON_FIELD,
            `${path}/${index}`,
            [...segments, String(index)],
          );
        }
        return;
      }
      if (isJsonRecord(left) && isJsonRecord(right)) {
        if (isPackageConditionObject(segments, left) || isPackageConditionObject(segments, right)) {
          const leftOrder = Object.keys(left);
          const rightOrder = Object.keys(right);
          if (leftOrder.join('\u0000') !== rightOrder.join('\u0000')) {
            differing.push({
              path: path || '/',
              first: jsonValueSnapshot(left, boundedValueLimit, segments),
              second: jsonValueSnapshot(right, boundedValueLimit, segments),
            });
          }
        }
        const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort((a, b) => a.localeCompare(b));
        for (const key of keys) {
          visit(
            Object.hasOwn(left, key) ? left[key] : MISSING_JSON_FIELD,
            Object.hasOwn(right, key) ? right[key] : MISSING_JSON_FIELD,
            `${path}/${jsonPointerSegment(key)}`,
            [...segments, key],
          );
        }
        return;
      }
    }

    const firstSnapshot = jsonValueSnapshot(left, boundedValueLimit, segments);
    const secondSnapshot = jsonValueSnapshot(right, boundedValueLimit, segments);
    if (firstSnapshot.present === secondSnapshot.present && firstSnapshot.sha256 === secondSnapshot.sha256) {
      return;
    }
    differing.push({ path: path || '/', first: firstSnapshot, second: secondSnapshot });
  };

  visit(first, second, '', []);
  return {
    total: differing.length,
    fields: differing.slice(0, boundedFieldLimit),
    truncated: differing.length > boundedFieldLimit,
  };
}

/** One public type condition that must resolve to its exact packed declaration. */
export interface PackedTypeClosureEntry {
  readonly packageName: string;
  readonly specifier: string;
  readonly typesTarget: string;
}

/** TypeScript resolution modes promised by the packed public type closure. */
export type PackedTypeClosureMode = 'node16' | 'bundler';

function compilerOptionsForTypeClosure(ts: typeof TypeScript, mode: PackedTypeClosureMode): TypeScript.CompilerOptions {
  const resolution =
    mode === 'node16'
      ? { module: ts.ModuleKind.Node16, moduleResolution: ts.ModuleResolutionKind.Node16 }
      : { module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler };
  return {
    ...resolution,
    target: ts.ScriptTarget.ES2022,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    strict: true,
    noEmit: true,
    types: [],
  };
}

function pathIsInside(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel));
}

function normalizedRealpath(path: string): string {
  return realpathSync.native(path);
}

function diagnosticText(ts: typeof TypeScript, diagnostic: TypeScript.Diagnostic): string {
  const point =
    diagnostic.file !== undefined && diagnostic.start !== undefined
      ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
      : undefined;
  const location =
    diagnostic.file === undefined
      ? ''
      : `${diagnostic.file.fileName}${point === undefined ? '' : `:${point.line + 1}:${point.character + 1}`} `;
  return `${location}TS${diagnostic.code} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`;
}

function boundedDiagnosticReport(
  ts: typeof TypeScript,
  diagnostics: readonly TypeScript.Diagnostic[],
  limit = 12,
  characterLimit = 12_000,
): string {
  const lines = diagnostics.slice(0, limit).map((diagnostic) => diagnosticText(ts, diagnostic));
  if (diagnostics.length > limit) lines.push(`... ${diagnostics.length - limit} more diagnostics`);
  const report = lines.join('\n');
  return report.length <= characterLimit
    ? report
    : `${report.slice(0, characterLimit)}\n... diagnostic report truncated at ${characterLimit} characters`;
}

/**
 * Prove every public `types` condition against a physical packed consumer tree.
 * Resolution alone is insufficient: TypeScript may fall back to JavaScript, a
 * workspace symlink, or a malformed declaration. This assertion requires the
 * exact declared target, containment beneath the consumer's real node_modules,
 * and a diagnostic-free LiteShip-owned public graph under both Node16 and
 * Bundler. Third-party declaration internals remain their package owners'
 * authority; errors they cause at a LiteShip import edge still point into the
 * LiteShip declaration (and remain blocking here).
 */
export function assertPackedTypeClosure(
  ts: typeof TypeScript,
  consumerDir: string,
  entries: readonly PackedTypeClosureEntry[],
  modes: readonly PackedTypeClosureMode[] = ['node16', 'bundler'],
): void {
  const nodeModulesPath = join(consumerDir, 'node_modules');
  if (!existsSync(nodeModulesPath)) {
    throw IntegrityError('package-smoke', `packed type closure has no physical ${nodeModulesPath}`);
  }
  const physicalNodeModules = normalizedRealpath(nodeModulesPath);

  for (const mode of modes) {
    const options = compilerOptionsForTypeClosure(ts, mode);
    const host = ts.createCompilerHost(options);
    const probePath = join(consumerDir, `.liteship-type-closure-${mode}.ts`);
    const ambientReferences: string[] = [];
    const moduleImports: string[] = [];
    const moduleUses: string[] = [];
    const ownedPackageRoots = new Set<string>();

    for (const [index, entry] of entries.entries()) {
      const packageRoot = findConsumerDependencyRoot(consumerDir, entry.packageName);
      if (packageRoot === undefined) {
        throw IntegrityError('package-smoke', `${entry.specifier} (${mode}) has no installed package root`);
      }
      ownedPackageRoots.add(normalizedRealpath(packageRoot));
      const expectedTarget = resolve(packageRoot, entry.typesTarget);
      if (!existsSync(expectedTarget)) {
        throw IntegrityError(
          'package-smoke',
          `${entry.specifier} (${mode}) declares missing types target ${entry.typesTarget}`,
        );
      }
      const physicalExpected = normalizedRealpath(expectedTarget);
      if (!/\.d\.(?:ts|mts|cts)$/i.test(physicalExpected)) {
        throw IntegrityError(
          'package-smoke',
          `${entry.specifier} (${mode}) types target is not a declaration: ${entry.typesTarget}`,
        );
      }
      if (!pathIsInside(physicalNodeModules, physicalExpected)) {
        throw IntegrityError(
          'package-smoke',
          `${entry.specifier} (${mode}) types target escaped packed node_modules: ${physicalExpected}`,
        );
      }

      const resolved = ts.resolveModuleName(entry.specifier, probePath, options, host).resolvedModule;
      if (resolved === undefined) {
        throw IntegrityError(
          'package-smoke',
          `${entry.specifier} (${mode}) did not resolve its public types condition`,
        );
      }
      const physicalResolved = normalizedRealpath(resolved.resolvedFileName);
      if (!/\.d\.(?:ts|mts|cts)$/i.test(physicalResolved)) {
        throw IntegrityError(
          'package-smoke',
          `${entry.specifier} (${mode}) resolved to JavaScript instead of a declaration: ${physicalResolved}`,
        );
      }
      if (!pathIsInside(physicalNodeModules, physicalResolved)) {
        throw IntegrityError(
          'package-smoke',
          `${entry.specifier} (${mode}) resolved outside packed node_modules: ${physicalResolved}`,
        );
      }
      if (physicalResolved !== physicalExpected) {
        throw IntegrityError(
          'package-smoke',
          `${entry.specifier} (${mode}) resolved ${physicalResolved}, not declared target ${physicalExpected}`,
        );
      }

      const declaration = ts.createSourceFile(
        physicalExpected,
        readFileSync(physicalExpected, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
      );
      if (ts.isExternalModule(declaration)) {
        moduleImports.push(`import type * as PublicType${index} from ${JSON.stringify(entry.specifier)};`);
        moduleUses.push(`export type PublicTypeUse${index} = typeof PublicType${index};`);
      } else {
        // Ambient registration entrypoints (for example
        // `@liteship/vite/virtual`) are consumed through `reference types`, not
        // as importable modules. Exercise that real public contract while the
        // exact-target checks above still prove the packed exports-map edge.
        ambientReferences.push(`/// <reference types=${JSON.stringify(entry.specifier)} />`);
      }
    }

    writeFileSync(probePath, [...ambientReferences, ...moduleImports, ...moduleUses, ''].join('\n'));

    const diagnostics = ts
      .getPreEmitDiagnostics(ts.createProgram({ rootNames: [probePath], options, host }))
      .filter((diagnostic) => {
        if (diagnostic.file === undefined) return true;
        const physicalFile = normalizedRealpath(diagnostic.file.fileName);
        return (
          physicalFile === normalizedRealpath(probePath) ||
          [...ownedPackageRoots].some((packageRoot) => pathIsInside(packageRoot, physicalFile))
        );
      });
    if (diagnostics.length > 0) {
      throw IntegrityError(
        'package-smoke',
        `packed public declarations failed ${mode} pre-emit diagnostics (${diagnostics.length}):\n${boundedDiagnosticReport(ts, diagnostics)}`,
      );
    }
  }
}
