/**
 * Per-package assurance inventory and monotone evidence-density ratchet.
 *
 * Generated tests are reported but never counted toward the authored-evidence
 * ratio: generation is useful leverage, not permission to inflate assurance.
 *
 * @module
 */

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, posix, relative, sep } from 'node:path';
import ts from 'typescript';
import { PACKAGE_CATALOG } from '../package-catalog.js';
import { rankOf, type AssuranceLevel } from '../../packages/gauntlet/src/assurance.js';
import { levelOf } from '../../packages/gauntlet/src/assurance-map.js';

export const ASSURANCE_TARGET_MILLI = 10_000;

export type EvidenceClass =
  | 'unit'
  | 'property'
  | 'component'
  | 'integration'
  | 'regression'
  | 'browser'
  | 'e2e'
  | 'fuzz'
  | 'simulation'
  | 'mutation'
  | 'mcdc'
  | 'chaos'
  | 'benchmark';

export interface PackageAssuranceInventory {
  readonly name: string;
  readonly sourceLoc: number;
  readonly authoredEvidenceLoc: number;
  readonly generatedEvidenceLoc: number;
  readonly ratioMilli: number;
  readonly targetMilli: number;
  readonly targetReached: boolean;
  readonly highestAssurance: AssuranceLevel;
  readonly evidenceRequirements: readonly string[];
  readonly missingEvidence: readonly string[];
  readonly evidenceClasses: Readonly<Record<EvidenceClass, number>>;
  readonly evidenceFiles: readonly string[];
}

export interface AssuranceInventory {
  readonly schemaVersion: 2;
  readonly packages: readonly PackageAssuranceInventory[];
  readonly totals: {
    readonly sourceLoc: number;
    readonly authoredEvidenceLoc: number;
    readonly generatedEvidenceLoc: number;
    readonly corpusLoc: number;
    readonly ratioMilli: number;
    readonly targetMilli: number;
    readonly sourceRoles: Readonly<{
      product: number;
      verificationEngine: number;
      rustWasm: number;
      workflowAuthority: number;
      generated: number;
    }>;
  };
}

export interface AssuranceBaseline {
  readonly schemaVersion: 3;
  /** Binds positional ratchet rows to the one canonical package catalog. */
  readonly catalogFingerprint: string;
  /** The unique physical repository ratio; package edges never multiply this value. */
  readonly uniqueRatioMilli: number;
  /** Metrics in canonical PACKAGE_CATALOG order; package identity is never re-authored here. */
  readonly packages: readonly {
    readonly sourceLoc: number;
    readonly authoredEvidenceLoc: number;
    readonly ratioMilli: number;
    readonly missingEvidence: readonly string[];
  }[];
}

export interface AssuranceRegression {
  readonly package: string;
  readonly kind: 'density' | 'evidence-gap';
  readonly priorMilli?: number;
  readonly currentMilli?: number;
  readonly evidenceGap?: string;
}

/** Boundary-validate the committed ratchet before it can authorize a pass. */
export function parseAssuranceBaseline(value: unknown): AssuranceBaseline {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('assurance baseline must be an object');
  }
  const candidate = value as Partial<AssuranceBaseline>;
  if (
    candidate.schemaVersion !== 3 ||
    typeof candidate.catalogFingerprint !== 'string' ||
    !/^sha256:[0-9a-f]{64}$/u.test(candidate.catalogFingerprint) ||
    !Number.isSafeInteger(candidate.uniqueRatioMilli) ||
    candidate.uniqueRatioMilli! < 0 ||
    !Array.isArray(candidate.packages)
  ) {
    throw new TypeError('assurance baseline has an invalid schema-v3 envelope');
  }
  for (const row of candidate.packages) {
    if (
      typeof row !== 'object' ||
      row === null ||
      !Number.isSafeInteger(row.sourceLoc) ||
      !Number.isSafeInteger(row.authoredEvidenceLoc) ||
      !Number.isSafeInteger(row.ratioMilli) ||
      !Array.isArray(row.missingEvidence) ||
      row.missingEvidence.some((entry) => typeof entry !== 'string')
    ) {
      throw new TypeError('assurance baseline contains an invalid package row');
    }
  }
  return candidate as AssuranceBaseline;
}

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.rs']);
const EVIDENCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);
const EVIDENCE_CLASSES: readonly EvidenceClass[] = [
  'unit',
  'property',
  'component',
  'integration',
  'regression',
  'browser',
  'e2e',
  'fuzz',
  'simulation',
  'mutation',
  'mcdc',
  'chaos',
  'benchmark',
];

function normalize(path: string): string {
  return path.split(sep).join('/');
}

function filesUnder(root: string): readonly string[] {
  if (!existsSync(root)) return [];
  const files: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else files.push(path);
    }
  };
  visit(root);
  return files;
}

function physicalCodeLoc(source: string): number {
  let inBlockComment = false;
  return source.split(/\r?\n/u).filter((line) => {
    let text = line.trim();
    if (inBlockComment) {
      const close = text.indexOf('*/');
      if (close < 0) return false;
      text = text.slice(close + 2).trim();
      inBlockComment = false;
    }
    while (text.startsWith('/*')) {
      const close = text.indexOf('*/', 2);
      if (close < 0) {
        inBlockComment = true;
        return false;
      }
      text = text.slice(close + 2).trim();
    }
    return text !== '' && !text.startsWith('//') && !text.startsWith('#');
  }).length;
}

/** Formatting-insensitive LOC for TS/JS; conservative comment-free LOC elsewhere. */
export function normalizedLogicalLoc(path: string, source: string): number {
  if (/\.[cm]?[jt]sx?$/u.test(path)) {
    const kind = path.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, kind);
    const canonical = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed }).printFile(ast);
    return canonical.split('\n').filter((line) => line.trim() !== '').length;
  }
  return physicalCodeLoc(source);
}

function generatedPath(path: string): boolean {
  const normalized = normalize(path).toLowerCase();
  return normalized.includes('/generated/') || normalized.includes('.generated.');
}

type SourceRole = keyof AssuranceInventory['totals']['sourceRoles'];

function implementationSources(cwd: string): readonly { readonly path: string; readonly role: SourceRole }[] {
  const entries = new Map<string, SourceRole>();
  const add = (absolute: string, role: SourceRole): void => {
    const path = normalize(relative(cwd, absolute));
    if (!SOURCE_EXTENSIONS.has(extname(absolute)) && !/\.ya?ml$/u.test(absolute)) return;
    entries.set(path, generatedPath(path) ? 'generated' : role);
  };
  for (const record of PACKAGE_CATALOG) {
    const role: SourceRole =
      record.layer === 'verification' || record.layer === 'tooling' ? 'verificationEngine' : 'product';
    for (const file of filesUnder(join(cwd, record.dir))) add(file, role);
  }
  for (const file of filesUnder(join(cwd, 'scripts'))) add(file, 'verificationEngine');
  for (const file of filesUnder(join(cwd, 'crates'))) {
    if (normalize(relative(cwd, file)).includes('/src/')) add(file, 'rustWasm');
  }
  for (const file of filesUnder(join(cwd, '.github', 'workflows'))) add(file, 'workflowAuthority');
  for (const entry of readdirSync(cwd, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (/\.config\.[cm]?[jt]s$/u.test(entry.name) || entry.name === 'vitest.shared.ts') {
      add(join(cwd, entry.name), 'verificationEngine');
    }
  }
  return [...entries]
    .map(([path, role]) => ({ path, role }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

function emptyClasses(): Record<EvidenceClass, number> {
  return Object.fromEntries(EVIDENCE_CLASSES.map((kind) => [kind, 0])) as Record<EvidenceClass, number>;
}

function classifyEvidence(path: string, source: string): readonly EvidenceClass[] {
  const normalized = path.toLowerCase();
  const classes = new Set<EvidenceClass>();
  const hasTest = /\b(?:it|test)(?:\.each)?\s*\(/u.test(source);
  for (const kind of [
    'unit',
    'property',
    'component',
    'integration',
    'regression',
    'browser',
    'e2e',
    'fuzz',
  ] as const) {
    const claimsKind = normalized.includes(`/tests/${kind}/`) || normalized.includes(`tests/${kind}/`);
    if (!claimsKind || !hasTest) continue;
    if (kind === 'property' && !/\bfc\.assert\s*\(/u.test(source)) continue;
    if (kind === 'property' && !/\bfc\.(?:asyncProperty|property)\s*\(/u.test(source)) continue;
    if (kind === 'fuzz' && !/\b(?:fc\.assert|fuzzGenerated|runFuzz|fuzzCorpus|arbitrary)\b/u.test(source)) continue;
    classes.add(kind);
  }
  if ((normalized.includes('/bench/') || normalized.includes('.bench.')) && /\bbench\.add\s*\(/u.test(source)) {
    classes.add('benchmark');
  }
  if ((normalized.includes('simulation') || normalized.includes('determinism')) && hasTest) classes.add('simulation');
  if ((normalized.includes('mutation') || normalized.includes('mutant')) && hasTest && /mutat|mutant/iu.test(source)) {
    classes.add('mutation');
  }
  if (normalized.includes('mcdc') && hasTest && /mcdc|condition/iu.test(source)) classes.add('mcdc');
  if (/chaos|fault-injection|fault_injection/u.test(normalized) && hasTest && /chaos|fault/iu.test(source)) {
    classes.add('chaos');
  }
  return [...classes].sort();
}

function packageMatchers(name: string, dir: string): readonly RegExp[] {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const packageDir = normalize(dir);
  return [
    new RegExp(`(?:from\\s*|import\\s*\\(|require\\s*\\()\\s*['\"]${escapedName}(?:[/\"'])`, 'u'),
    new RegExp(`(?:^|[\"'\\s(])${packageDir.replaceAll('/', '[/\\\\]')}(?:[/\\\\])`, 'u'),
    new RegExp(
      `(?:from\\s*|import\\s*\\(|require\\s*\\()\\s*['\"][^'\"]*${packageDir.replaceAll('/', '[/\\\\]')}(?:[/\\\\])`,
      'u',
    ),
  ];
}

function directlyOwnedEvidence(path: string, packageDir: string): boolean {
  const slug = packageDir.slice('packages/'.length).toLowerCase();
  const normalized = normalize(path).toLowerCase();
  return new RegExp(
    `^tests/(?:unit|property|component|integration|regression|browser|e2e|fuzz)/${slug}(?:/|[.-])`,
    'u',
  ).test(normalized);
}

function relativeTestImports(path: string, source: string, known: ReadonlySet<string>): readonly string[] {
  if (!/\.[cm]?[jt]sx?$/u.test(path)) return [];
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const imports = new Set<string>();
  const resolveSpecifier = (specifier: string): void => {
    if (!specifier.startsWith('.')) return;
    const raw = posix.normalize(posix.join(posix.dirname(path), specifier));
    const candidates = [
      raw,
      raw.replace(/\.js$/u, '.ts'),
      raw.replace(/\.js$/u, '.tsx'),
      `${raw}.ts`,
      `${raw}.tsx`,
      `${raw}/index.ts`,
    ];
    const found = candidates.find((candidate) => known.has(candidate));
    if (found !== undefined) imports.add(found);
  };
  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      resolveSpecifier(node.moduleSpecifier.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return [...imports].sort();
}

const REQUIREMENTS: Readonly<Record<AssuranceLevel, readonly (readonly EvidenceClass[])[]>> = {
  L0: [],
  L1: [['unit']],
  L2: [['unit'], ['property']],
  L3: [['unit'], ['property'], ['component', 'integration', 'browser', 'e2e'], ['simulation', 'chaos'], ['benchmark']],
  L4: [
    ['unit'],
    ['property'],
    ['component', 'integration', 'browser', 'e2e'],
    ['simulation', 'chaos'],
    ['mutation'],
    ['mcdc'],
    ['fuzz'],
    ['benchmark'],
  ],
};

function requirementLabel(alternatives: readonly EvidenceClass[]): string {
  return alternatives.join('|');
}

/** Compute the inventory from current repository bytes. */
export function buildAssuranceInventory(cwd: string): AssuranceInventory {
  const evidenceFiles = filesUnder(join(cwd, 'tests')).filter((path) => EVIDENCE_EXTENSIONS.has(extname(path)));
  const evidenceSources = evidenceFiles.map((path) => {
    const source = readFileSync(path, 'utf8');
    return {
      absolute: path,
      path: normalize(relative(cwd, path)),
      source,
      loc: normalizedLogicalLoc(path, source),
    };
  });

  const knownEvidencePaths = new Set(evidenceSources.map((entry) => entry.path));
  const directOwners = new Map<string, Set<string>>();
  const dependencies = new Map<string, readonly string[]>();
  for (const entry of evidenceSources) {
    const matches = PACKAGE_CATALOG.filter((record) => {
      const matchers = packageMatchers(record.name, record.dir);
      return directlyOwnedEvidence(entry.path, record.dir) || matchers.some((matcher) => matcher.test(entry.source));
    });
    directOwners.set(entry.path, new Set(matches.map((record) => record.name)));
    dependencies.set(entry.path, relativeTestImports(entry.path, entry.source, knownEvidencePaths));
  }
  const transitiveOwners = new Map([...directOwners].map(([path, owners]) => [path, new Set(owners)] as const));
  let changed = true;
  while (changed) {
    changed = false;
    for (const [path, imports] of dependencies) {
      const owners = transitiveOwners.get(path)!;
      for (const imported of imports) {
        for (const owner of transitiveOwners.get(imported) ?? []) {
          if (!owners.has(owner)) {
            owners.add(owner);
            changed = true;
          }
        }
      }
    }
  }
  const ownership = evidenceSources.map((entry) => {
    const matches = PACKAGE_CATALOG.filter((record) => transitiveOwners.get(entry.path)?.has(record.name));
    const direct = matches.find((record) => directlyOwnedEvidence(entry.path, record.dir));
    return {
      entry,
      owners: matches.map((record) => record.name),
      primaryOwner: direct?.name ?? matches[0]?.name ?? 'repository',
    };
  });

  const packages = PACKAGE_CATALOG.map((record) => {
    const packageRoot = join(cwd, record.dir);
    const sourceFiles = filesUnder(packageRoot).filter((path) => {
      return SOURCE_EXTENSIONS.has(extname(path));
    });
    const sourceLoc = sourceFiles.reduce(
      (sum, path) => sum + normalizedLogicalLoc(path, readFileSync(path, 'utf8')),
      0,
    );
    const owned = ownership.filter(({ owners }) => owners.includes(record.name)).map(({ entry }) => entry);
    const primary = ownership.filter(({ primaryOwner }) => primaryOwner === record.name).map(({ entry }) => entry);
    const authored = owned.filter((entry) => !entry.path.startsWith('tests/generated/'));
    const generated = owned.filter((entry) => entry.path.startsWith('tests/generated/'));
    const primaryAuthored = primary.filter(
      (entry) => !entry.path.startsWith('tests/generated/') && !entry.path.startsWith('tests/fixtures/'),
    );
    const authoredEvidenceLoc = primaryAuthored.reduce((sum, entry) => sum + entry.loc, 0);
    const generatedEvidenceLoc = generated.reduce((sum, entry) => sum + entry.loc, 0);
    const ratioMilli = sourceLoc === 0 ? 0 : Math.floor((authoredEvidenceLoc * 1_000) / sourceLoc);
    const evidenceClasses = emptyClasses();
    for (const entry of authored) {
      for (const kind of classifyEvidence(entry.path, entry.source)) evidenceClasses[kind] += 1;
    }
    const highestAssurance = sourceFiles.reduce<AssuranceLevel>((highest, path) => {
      const level = levelOf(normalize(relative(cwd, path)));
      return rankOf(level) > rankOf(highest) ? level : highest;
    }, 'L0');
    const requirementGroups = REQUIREMENTS[highestAssurance];
    const evidenceRequirements = requirementGroups.map(requirementLabel);
    const missingEvidence = requirementGroups
      .filter((alternatives) => alternatives.every((kind) => evidenceClasses[kind] === 0))
      .map(requirementLabel);
    return {
      name: record.name,
      sourceLoc,
      authoredEvidenceLoc,
      generatedEvidenceLoc,
      ratioMilli,
      targetMilli: ASSURANCE_TARGET_MILLI,
      targetReached: ratioMilli >= ASSURANCE_TARGET_MILLI,
      highestAssurance,
      evidenceRequirements,
      missingEvidence,
      evidenceClasses,
      evidenceFiles: authored.map((entry) => entry.path).sort(),
    } satisfies PackageAssuranceInventory;
  });
  const sourceRoles = {
    product: 0,
    verificationEngine: 0,
    rustWasm: 0,
    workflowAuthority: 0,
    generated: 0,
  } satisfies Record<SourceRole, number>;
  for (const entry of implementationSources(cwd)) {
    const source = readFileSync(join(cwd, entry.path), 'utf8');
    sourceRoles[entry.role] += normalizedLogicalLoc(entry.path, source);
  }
  const sourceLoc = Object.values(sourceRoles).reduce((sum, value) => sum + value, 0);
  const authoredEvidenceLoc = evidenceSources
    .filter((entry) => !entry.path.startsWith('tests/generated/') && !entry.path.startsWith('tests/fixtures/'))
    .reduce((sum, entry) => sum + entry.loc, 0);
  const generatedEvidenceLoc = evidenceSources
    .filter((entry) => entry.path.startsWith('tests/generated/'))
    .reduce((sum, entry) => sum + entry.loc, 0);
  const corpusLoc = filesUnder(join(cwd, 'tests', 'fixtures')).reduce(
    (sum, path) => sum + physicalCodeLoc(readFileSync(path, 'utf8')),
    0,
  );
  return {
    schemaVersion: 2,
    packages,
    totals: {
      sourceLoc,
      authoredEvidenceLoc,
      generatedEvidenceLoc,
      corpusLoc,
      ratioMilli: sourceLoc === 0 ? 0 : Math.floor((authoredEvidenceLoc * 1_000) / sourceLoc),
      targetMilli: ASSURANCE_TARGET_MILLI,
      sourceRoles,
    },
  };
}

function packageOrderFingerprint(packages: readonly { readonly name: string }[]): string {
  return `sha256:${createHash('sha256')
    .update(packages.map((entry) => entry.name).join('\n'))
    .digest('hex')}`;
}

/** Freeze metrics in canonical catalog order without authoring another package roster. */
export function baselineFromInventory(inventory: AssuranceInventory): AssuranceBaseline {
  return {
    schemaVersion: 3,
    catalogFingerprint: packageOrderFingerprint(inventory.packages),
    uniqueRatioMilli: inventory.totals.ratioMilli,
    packages: inventory.packages.map((entry) => ({
      sourceLoc: entry.sourceLoc,
      authoredEvidenceLoc: entry.authoredEvidenceLoc,
      ratioMilli: entry.ratioMilli,
      missingEvidence: entry.missingEvidence,
    })),
  };
}

/** Find packages whose authored evidence density decreased. */
export function assuranceRegressions(
  inventory: AssuranceInventory,
  baseline: AssuranceBaseline,
): readonly AssuranceRegression[] {
  if (baseline.catalogFingerprint !== packageOrderFingerprint(inventory.packages)) {
    throw new Error('assurance baseline package order does not match the canonical package catalog');
  }
  if (baseline.packages.length !== inventory.packages.length) {
    throw new Error('assurance baseline row count does not match the canonical package catalog');
  }
  const density: AssuranceRegression[] =
    inventory.totals.ratioMilli < baseline.uniqueRatioMilli
      ? [
          {
            package: 'repository',
            kind: 'density',
            priorMilli: baseline.uniqueRatioMilli,
            currentMilli: inventory.totals.ratioMilli,
          },
        ]
      : [];
  const gaps = inventory.packages.flatMap((entry, index) => {
    const prior = baseline.packages[index];
    const regressions: AssuranceRegression[] = [];
    if (prior !== undefined) {
      const priorGaps = new Set(prior.missingEvidence);
      for (const evidenceGap of entry.missingEvidence) {
        if (!priorGaps.has(evidenceGap)) regressions.push({ package: entry.name, kind: 'evidence-gap', evidenceGap });
      }
    }
    return regressions;
  });
  return [...density, ...gaps].sort((left, right) => left.package.localeCompare(right.package));
}
