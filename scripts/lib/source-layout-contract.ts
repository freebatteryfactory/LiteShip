/**
 * Deterministic source-layout census for governed domain directories.
 *
 * A directory facade is an entry surface, not a content module. A governed
 * domain directory therefore needs at least two non-facade source modules.
 * Keeping the classifier pure lets tests prove the law with synthetic trees
 * while the gate applies the same code to the live repository.
 *
 * The domain-directory grammar has two halves and this module owns both.
 * `facade-only-reexports` governs what a facade may CONTAIN; the second half is
 * the inbound-edge law the grammar always implied — zero facade imports from
 * concrete files (the anti-cycle law). A facade is the seam a package presents
 * OUTWARD; a sibling module inside the same package reaching back through it
 * re-enters its own package through the front door and makes directory-level
 * cycles expressible. The governed facade population is derived from the
 * ast-grep rule's own `files:`/`ignores:` globs, never from an authored roster,
 * so a domain directory created after the sweep is governed the moment it
 * enters that glob.
 *
 * @module
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, resolve, sep } from 'node:path';
import { minimatch } from 'minimatch';
import { resolveRelativeSourcePath, sourceFilesUnder, sourceModuleEdges } from './source-import-contract.js';

const SOURCE_MODULE = /\.(?:[cm]?ts|tsx)$/;
const DECLARATION_MODULE = /\.d\.[cm]?ts$/;
const FACADE_MODULE = /^index\.(?:[cm]?ts|tsx)$/;

/** One governed domain directory and the content modules that earn it. */
export interface DomainDirectoryLayout {
  readonly directory: string;
  readonly facade: string | null;
  readonly contentModules: readonly string[];
}

/** A domain directory whose facade is backed by fewer than two content modules. */
export interface DomainDirectoryGraduationFinding extends DomainDirectoryLayout {
  readonly code: 'singleton-domain-directory';
}

/** Complete current-head subject coverage for the source-layout authority. */
export interface SourceLayoutReceipt {
  readonly enumerator: 'immediate-package-source-directories';
  readonly censusDigest: `sha256:${string}`;
  readonly subjects: readonly DomainDirectoryLayout[];
  readonly findings: readonly DomainDirectoryGraduationFinding[];
}

const portable = (path: string): string => path.split(sep).join('/').replaceAll('\\', '/');

/** Classify source paths without counting any `index.*` facade as content. */
export function domainContentModules(paths: readonly string[]): readonly string[] {
  return Object.freeze(
    paths
      .map(portable)
      .filter((path) => SOURCE_MODULE.test(path))
      .filter((path) => !DECLARATION_MODULE.test(path))
      .filter((path) => !FACADE_MODULE.test(path.split('/').at(-1) ?? path))
      .sort(),
  );
}

/** Apply the two-content-module graduation law to one already-enumerated domain. */
export function evaluateDomainDirectory(layout: DomainDirectoryLayout): DomainDirectoryGraduationFinding | undefined {
  const contentModules = domainContentModules(layout.contentModules);
  if (contentModules.length >= 2) return undefined;
  return Object.freeze({
    code: 'singleton-domain-directory',
    directory: portable(layout.directory),
    facade: layout.facade === null ? null : portable(layout.facade),
    contentModules,
  });
}

function sourceFilesBelow(directory: string): readonly string[] {
  const files: string[] = [];
  const visit = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const absolute = join(current, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) files.push(absolute);
    }
  };
  visit(directory);
  return files;
}

/** Enumerate every non-empty immediate package source directory. */
export function enumerateDomainDirectoryLayouts(repoRoot: string): readonly DomainDirectoryLayout[] {
  const root = resolve(repoRoot);
  const packagesRoot = join(root, 'packages');
  if (!existsSync(packagesRoot)) return Object.freeze([]);

  const layouts: DomainDirectoryLayout[] = [];
  for (const packageEntry of readdirSync(packagesRoot, { withFileTypes: true })) {
    if (!packageEntry.isDirectory()) continue;
    const sourceRoot = join(packagesRoot, packageEntry.name, 'src');
    if (!existsSync(sourceRoot)) continue;
    for (const domainEntry of readdirSync(sourceRoot, { withFileTypes: true })) {
      if (!domainEntry.isDirectory()) continue;
      const directory = join(sourceRoot, domainEntry.name);
      const facade = join(directory, 'index.ts');
      const contentModules = domainContentModules(sourceFilesBelow(directory).map((file) => relative(directory, file)));
      // Empty local directories are not Git subjects and carry no source claim.
      if (contentModules.length === 0 && !existsSync(facade)) continue;
      layouts.push(
        Object.freeze({
          directory: portable(relative(root, directory)),
          facade: existsSync(facade) ? portable(relative(root, facade)) : null,
          contentModules,
        }),
      );
    }
  }
  return Object.freeze(layouts.sort((left, right) => left.directory.localeCompare(right.directory)));
}

/** Build the complete, content-addressed current-head source-layout receipt. */
export function buildSourceLayoutReceipt(repoRoot: string): SourceLayoutReceipt {
  const subjects = enumerateDomainDirectoryLayouts(repoRoot);
  const findings = subjects
    .map((layout) => evaluateDomainDirectory(layout))
    .filter((finding): finding is DomainDirectoryGraduationFinding => finding !== undefined);
  const censusDigest = `sha256:${createHash('sha256').update(JSON.stringify(subjects)).digest('hex')}` as const;
  return Object.freeze({
    enumerator: 'immediate-package-source-directories',
    censusDigest,
    subjects,
    findings: Object.freeze(findings),
  });
}

/** Return every violation from the same complete receipt used by the gate. */
export function findDomainDirectoryGraduationFindings(repoRoot: string): readonly DomainDirectoryGraduationFinding[] {
  return buildSourceLayoutReceipt(repoRoot).findings;
}

// ---------------------------------------------------------------------------
// Inbound-edge law: zero facade imports from concrete files (anti-cycle law)
// ---------------------------------------------------------------------------

/** The ast-grep rule whose own globs declare which files are governed facades. */
export const FACADE_RULE_PATH = 'sgrules/facade-only-reexports.yml';

/** One concrete module reaching a governed facade instead of its real owner. */
export interface FacadeInboundEdgeFinding {
  readonly code: 'facade-import-from-concrete-file';
  readonly importer: string;
  readonly facade: string;
  readonly specifier: string;
  readonly line: number;
}

/** Complete current-head coverage for the facade inbound-edge authority. */
export interface FacadeEdgeReceipt {
  readonly enumerator: 'facade-rule-globs-and-package-export-targets';
  readonly rule: string;
  readonly censusDigest: `sha256:${string}`;
  readonly facades: readonly string[];
  readonly entryPoints: readonly string[];
  readonly importers: readonly string[];
  readonly findings: readonly FacadeInboundEdgeFinding[];
}

/**
 * Read one top-level block sequence out of an ast-grep rule file.
 *
 * Only `files:`/`ignores:` are read and both are flat single-quoted scalar
 * sequences, so a line reader is exact here and keeps the rule corpus free of a
 * parser dependency. A key that carries no entries yields an empty sequence and
 * the caller decides whether that is fatal.
 */
function ruleGlobs(ruleSource: string, key: 'files' | 'ignores'): readonly string[] {
  const globs: string[] = [];
  let inside = false;
  for (const line of ruleSource.split(/\r?\n/)) {
    if (/^\S/.test(line)) {
      inside = line.startsWith(`${key}:`);
      continue;
    }
    if (!inside) continue;
    const entry = /^\s+-\s+(.+?)\s*$/.exec(line);
    if (entry === null) continue;
    globs.push(entry[1]!.replace(/^['"]|['"]$/g, ''));
  }
  return Object.freeze(globs);
}

/** Every TypeScript source file under any `packages/<name>/src`, repo-relative. */
function packageSourceFiles(root: string): readonly string[] {
  const packagesRoot = join(root, 'packages');
  if (!existsSync(packagesRoot)) return Object.freeze([]);
  const files: string[] = [];
  for (const entry of readdirSync(packagesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const sourceRoot = join(packagesRoot, entry.name, 'src');
    if (!existsSync(sourceRoot)) continue;
    files.push(...sourceFilesUnder(root, `packages/${entry.name}/src`));
  }
  return Object.freeze(files.filter((file) => !DECLARATION_MODULE.test(file)).sort());
}

/**
 * The governed facade set, derived from the rule file's own globs.
 *
 * Fails closed: a missing rule file or a rule that declares no `files:` globs
 * throws rather than reporting an empty population, because an empty facade set
 * would silently make every inbound edge legal.
 */
export function enumerateGovernedFacades(repoRoot: string): readonly string[] {
  const root = resolve(repoRoot);
  const rulePath = join(root, ...FACADE_RULE_PATH.split('/'));
  if (!existsSync(rulePath)) throw new Error(`facade rule is missing: ${FACADE_RULE_PATH}`);
  const ruleSource = readFileSync(rulePath, 'utf8');
  const files = ruleGlobs(ruleSource, 'files');
  const ignores = ruleGlobs(ruleSource, 'ignores');
  if (files.length === 0) throw new Error(`${FACADE_RULE_PATH} declares no \`files:\` globs`);
  return Object.freeze(
    packageSourceFiles(root).filter(
      (file) => files.some((glob) => minimatch(file, glob)) && !ignores.some((glob) => minimatch(file, glob)),
    ),
  );
}

/**
 * Every package source file a `package.json` `exports` map publishes.
 *
 * These are the sanctioned entry surfaces: a package root composing its own
 * domain facades is the grammar working, not a violation. Only targets that
 * resolve to a real file under that package's `src/` are admitted, so an
 * unmappable export value narrows the sanctioned set rather than widening it.
 */
export function enumeratePackageEntryPoints(repoRoot: string): readonly string[] {
  const root = resolve(repoRoot);
  const packagesRoot = join(root, 'packages');
  if (!existsSync(packagesRoot)) return Object.freeze([]);
  const targets = new Set<string>();
  for (const entry of readdirSync(packagesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = join(packagesRoot, entry.name, 'package.json');
    if (!existsSync(manifestPath)) continue;
    const manifest: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const exportsField = (manifest as { readonly exports?: unknown }).exports;
    const admit = (value: string): void => {
      const built = /^\.\/dist\/(.+)\.js$/.exec(value);
      const stems =
        built === null
          ? [value.replace(/^\.\//, '')]
          : [`${built[1]!}.ts`, `${built[1]!}.tsx`, `${built[1]!}/index.ts`];
      for (const stem of stems) {
        const candidate = `packages/${entry.name}/src/${stem.replace(/^src\//, '')}`;
        if (existsSync(join(root, ...candidate.split('/')))) {
          targets.add(candidate);
          return;
        }
      }
    };
    const walk = (value: unknown): void => {
      if (typeof value === 'string') admit(value);
      else if (value !== null && typeof value === 'object') for (const nested of Object.values(value)) walk(nested);
    };
    walk(exportsField);
  }
  return Object.freeze([...targets].sort());
}

/** Build the complete, content-addressed current-head facade inbound-edge receipt. */
export function buildFacadeEdgeReceipt(repoRoot: string): FacadeEdgeReceipt {
  const root = resolve(repoRoot);
  const facades = enumerateGovernedFacades(root);
  const entryPoints = enumeratePackageEntryPoints(root);
  const facadeSet = new Set(facades);
  const sanctioned = new Set([...facades, ...entryPoints]);
  const importers = packageSourceFiles(root).filter((file) => !sanctioned.has(file));

  const findings: FacadeInboundEdgeFinding[] = [];
  for (const importer of importers) {
    for (const edge of sourceModuleEdges(root, importer)) {
      const target = resolveRelativeSourcePath(root, importer, edge.specifier);
      if (target === null || !facadeSet.has(target)) continue;
      findings.push(
        Object.freeze({
          code: 'facade-import-from-concrete-file' as const,
          importer,
          facade: target,
          specifier: edge.specifier,
          line: edge.line,
        }),
      );
    }
  }

  const censusDigest =
    `sha256:${createHash('sha256').update(JSON.stringify({ facades, entryPoints, importers })).digest('hex')}` as const;
  return Object.freeze({
    enumerator: 'facade-rule-globs-and-package-export-targets',
    rule: FACADE_RULE_PATH,
    censusDigest,
    facades,
    entryPoints,
    importers,
    findings: Object.freeze(
      findings.sort((left, right) => left.importer.localeCompare(right.importer) || left.line - right.line),
    ),
  });
}

/** Return every inbound-edge violation from the same receipt the gate uses. */
export function findFacadeInboundEdgeFindings(repoRoot: string): readonly FacadeInboundEdgeFinding[] {
  return buildFacadeEdgeReceipt(repoRoot).findings;
}
