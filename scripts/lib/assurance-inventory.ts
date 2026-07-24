/**
 * Per-package assurance inventory and monotone evidence-density ratchet.
 *
 * Generated tests are reported but never counted toward the authored-evidence
 * ratio: generation is useful leverage, not permission to inflate assurance.
 *
 * @module
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { PACKAGE_CATALOG } from '../package-catalog.js';

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
  readonly evidenceClasses: Readonly<Record<EvidenceClass, number>>;
  readonly evidenceFiles: readonly string[];
}

export interface AssuranceInventory {
  readonly schemaVersion: 1;
  readonly packages: readonly PackageAssuranceInventory[];
  readonly totals: {
    readonly sourceLoc: number;
    readonly authoredEvidenceLoc: number;
    readonly generatedEvidenceLoc: number;
    readonly ratioMilli: number;
    readonly targetMilli: number;
  };
}

export interface AssuranceBaseline {
  readonly schemaVersion: 1;
  readonly packages: Readonly<
    Record<
      string,
      {
        readonly sourceLoc: number;
        readonly authoredEvidenceLoc: number;
        readonly ratioMilli: number;
      }
    >
  >;
}

export interface AssuranceRegression {
  readonly package: string;
  readonly priorMilli: number;
  readonly currentMilli: number;
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

function logicalLoc(source: string): number {
  return source.split(/\r?\n/u).filter((line) => line.trim() !== '').length;
}

function emptyClasses(): Record<EvidenceClass, number> {
  return Object.fromEntries(EVIDENCE_CLASSES.map((kind) => [kind, 0])) as Record<EvidenceClass, number>;
}

function classifyEvidence(path: string): readonly EvidenceClass[] {
  const normalized = path.toLowerCase();
  const classes = new Set<EvidenceClass>();
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
    if (normalized.includes(`/tests/${kind}/`) || normalized.includes(`tests/${kind}/`)) classes.add(kind);
  }
  if (normalized.includes('/bench/') || normalized.includes('.bench.')) classes.add('benchmark');
  if (normalized.includes('simulation') || normalized.includes('determinism')) classes.add('simulation');
  if (normalized.includes('mutation') || normalized.includes('mutant')) classes.add('mutation');
  if (normalized.includes('mcdc')) classes.add('mcdc');
  if (/chaos|fault-injection|fault_injection/u.test(normalized)) classes.add('chaos');
  return [...classes].sort();
}

function packageMatchers(name: string, dir: string): readonly RegExp[] {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const packageDir = normalize(dir);
  return [
    new RegExp(`(?:from\\s*|import\\s*\\(|require\\s*\\()\\s*['\"]${escapedName}(?:[/\"'])`, 'u'),
    new RegExp(`(?:^|[\"'\\s(])${packageDir.replaceAll('/', '[/\\\\]')}(?:[/\\\\])`, 'u'),
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

/** Compute the inventory from current repository bytes. */
export function buildAssuranceInventory(cwd: string): AssuranceInventory {
  const evidenceFiles = filesUnder(join(cwd, 'tests')).filter((path) => EVIDENCE_EXTENSIONS.has(extname(path)));
  const evidenceSources = evidenceFiles.map((path) => ({
    absolute: path,
    path: normalize(relative(cwd, path)),
    source: readFileSync(path, 'utf8'),
  }));

  const packages = PACKAGE_CATALOG.map((record) => {
    const packageRoot = join(cwd, record.dir);
    const sourceFiles = filesUnder(packageRoot).filter((path) => {
      return SOURCE_EXTENSIONS.has(extname(path));
    });
    const sourceLoc = sourceFiles.reduce((sum, path) => sum + logicalLoc(readFileSync(path, 'utf8')), 0);
    const matchers = packageMatchers(record.name, record.dir);
    const owned = evidenceSources.filter(
      (entry) =>
        directlyOwnedEvidence(entry.path, record.dir) || matchers.some((matcher) => matcher.test(entry.source)),
    );
    const authored = owned.filter((entry) => !entry.path.startsWith('tests/generated/'));
    const generated = owned.filter((entry) => entry.path.startsWith('tests/generated/'));
    const authoredEvidenceLoc = authored.reduce((sum, entry) => sum + logicalLoc(entry.source), 0);
    const generatedEvidenceLoc = generated.reduce((sum, entry) => sum + logicalLoc(entry.source), 0);
    const ratioMilli = sourceLoc === 0 ? 0 : Math.floor((authoredEvidenceLoc * 1_000) / sourceLoc);
    const evidenceClasses = emptyClasses();
    for (const entry of authored) {
      for (const kind of classifyEvidence(entry.path)) evidenceClasses[kind] += 1;
    }
    return {
      name: record.name,
      sourceLoc,
      authoredEvidenceLoc,
      generatedEvidenceLoc,
      ratioMilli,
      targetMilli: ASSURANCE_TARGET_MILLI,
      targetReached: ratioMilli >= ASSURANCE_TARGET_MILLI,
      evidenceClasses,
      evidenceFiles: authored.map((entry) => entry.path).sort(),
    } satisfies PackageAssuranceInventory;
  });
  const sourceLoc = packages.reduce((sum, entry) => sum + entry.sourceLoc, 0);
  const authoredEvidenceLoc = packages.reduce((sum, entry) => sum + entry.authoredEvidenceLoc, 0);
  const generatedEvidenceLoc = packages.reduce((sum, entry) => sum + entry.generatedEvidenceLoc, 0);
  return {
    schemaVersion: 1,
    packages,
    totals: {
      sourceLoc,
      authoredEvidenceLoc,
      generatedEvidenceLoc,
      ratioMilli: sourceLoc === 0 ? 0 : Math.floor((authoredEvidenceLoc * 1_000) / sourceLoc),
      targetMilli: ASSURANCE_TARGET_MILLI,
    },
  };
}

/** Freeze the current per-package ratios into a reviewable ratchet baseline. */
export function baselineFromInventory(inventory: AssuranceInventory): AssuranceBaseline {
  return {
    schemaVersion: 1,
    packages: Object.fromEntries(
      inventory.packages.map((entry) => [
        entry.name,
        {
          sourceLoc: entry.sourceLoc,
          authoredEvidenceLoc: entry.authoredEvidenceLoc,
          ratioMilli: entry.ratioMilli,
        },
      ]),
    ),
  };
}

/** Find packages whose authored evidence density decreased. */
export function assuranceRegressions(
  inventory: AssuranceInventory,
  baseline: AssuranceBaseline,
): readonly AssuranceRegression[] {
  return inventory.packages
    .flatMap((entry) => {
      const prior = baseline.packages[entry.name];
      const regressed =
        prior !== undefined &&
        prior.sourceLoc > 0 &&
        entry.sourceLoc > 0 &&
        entry.authoredEvidenceLoc * prior.sourceLoc < prior.authoredEvidenceLoc * entry.sourceLoc;
      return regressed ? [{ package: entry.name, priorMilli: prior.ratioMilli, currentMilli: entry.ratioMilli }] : [];
    })
    .sort((left, right) => left.package.localeCompare(right.package));
}
