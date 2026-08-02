#!/usr/bin/env tsx
/**
 * Dedicated writer and drift authority for the publishable CLI fragment tree.
 *
 * The canonical templates/examples and the committed projection are both open
 * tracked-file grammars. One immutable `git ls-files -z` snapshot therefore
 * owns source discovery, the exact destination census, containment, and the
 * anti-vacuity floor. The writer may render bytes only after those structural
 * laws admit its complete projection plan.
 *
 * @module
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ValidationError } from '../packages/error/src/index.js';
import { isDirectExecution } from './audit/shared.js';
import {
  CLI_FRAGMENT_ROOT,
  cliFragmentProjections,
  collectCliFragmentProjectionDrift,
  renderCliFragmentProjection,
  type CatalogDrift,
  type CliFragmentProjection,
} from './gen-roster.js';
import {
  W111_SUBJECT_FLOORS,
  buildW111SubjectCensus,
  readTrackedFileCensus,
  type W111SubjectCensus,
} from './lib/tracked-subject-census.js';

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const FRAGMENT_PREFIX = `${CLI_FRAGMENT_ROOT}/`;
const TEMPLATE_SOURCE_PREFIX = 'packages/create-liteship/templates/';
const EXAMPLE_SOURCE_PREFIX = 'examples/';

export interface CliFragmentProjectionAuthority {
  readonly subjects: W111SubjectCensus;
  readonly projections: readonly CliFragmentProjection[];
}

function comparePath(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isContainedPath(path: string, prefix: string): boolean {
  return (
    path.startsWith(prefix) &&
    !path.includes('\\') &&
    !path.split('/').some((segment) => segment.length === 0 || segment === '.' || segment === '..')
  );
}

function projectionPlanViolations(projections: readonly CliFragmentProjection[]): readonly string[] {
  const violations: string[] = [];
  const sources = new Set<string>();
  const destinations = new Set<string>();

  if (projections.length < W111_SUBJECT_FLOORS.fragments) {
    violations.push(
      `projection plan contains ${projections.length} fragments; floor is ${W111_SUBJECT_FLOORS.fragments}`,
    );
  }
  for (const projection of projections) {
    if (
      !isContainedPath(projection.source, TEMPLATE_SOURCE_PREFIX) &&
      !isContainedPath(projection.source, EXAMPLE_SOURCE_PREFIX)
    ) {
      violations.push(`projection source is outside the canonical owners: ${projection.source}`);
    }
    if (!isContainedPath(projection.destination, FRAGMENT_PREFIX)) {
      violations.push(`projection destination is outside ${CLI_FRAGMENT_ROOT}: ${projection.destination}`);
    }
    if (sources.has(projection.source)) violations.push(`duplicate projection source: ${projection.source}`);
    if (destinations.has(projection.destination)) {
      violations.push(`duplicate projection destination: ${projection.destination}`);
    }
    sources.add(projection.source);
    destinations.add(projection.destination);
  }
  return Object.freeze(violations);
}

/** Refuse an empty, partial, duplicate, or escaping writer plan before mutation. */
export function assertCliFragmentProjectionWriterInput(projections: readonly CliFragmentProjection[]): void {
  const violations = projectionPlanViolations(projections);
  if (violations.length > 0) {
    throw ValidationError('cli-fragments', violations.join('; '));
  }
}

/** Validate the complete plan, then replace only the dedicated fragment root. */
export function writeCliFragmentProjections(
  projections: readonly CliFragmentProjection[],
  repoRoot = REPO_ROOT,
): number {
  assertCliFragmentProjectionWriterInput(projections);
  const root = resolve(repoRoot, CLI_FRAGMENT_ROOT);
  const cliRoot = resolve(repoRoot, 'packages', 'cli');
  const rootFromCli = relative(cliRoot, root);
  if (rootFromCli.startsWith('..') || resolve(cliRoot, rootFromCli) !== root) {
    throw ValidationError('cli-fragments', `refusing to replace fragment projection outside packages/cli: ${root}`);
  }

  const destinations = projections.map((projection) => ({
    projection,
    absolute: resolve(repoRoot, projection.destination),
  }));
  for (const destination of destinations) {
    const fromRoot = relative(root, destination.absolute);
    if (fromRoot.length === 0 || fromRoot.startsWith('..') || resolve(root, fromRoot) !== destination.absolute) {
      throw ValidationError(
        'cli-fragments',
        `refusing to write fragment projection outside ${CLI_FRAGMENT_ROOT}: ${destination.projection.destination}`,
      );
    }
  }

  rmSync(root, { recursive: true, force: true });
  for (const destination of destinations) {
    mkdirSync(dirname(destination.absolute), { recursive: true });
    writeFileSync(destination.absolute, renderCliFragmentProjection(destination.projection));
  }
  return destinations.length;
}

/** Read Git once, then derive both sides of the fragment projection law. */
export async function readCliFragmentProjectionAuthority(
  repoRoot = REPO_ROOT,
): Promise<CliFragmentProjectionAuthority> {
  const tracked = await readTrackedFileCensus(repoRoot);
  const subjects = buildW111SubjectCensus(tracked, (path) => readFileSync(resolve(repoRoot, path), 'utf8'));
  const projections = Object.freeze(
    cliFragmentProjections(tracked.paths).map((projection) => Object.freeze(projection)),
  );
  return Object.freeze({ subjects, projections });
}

/** Exact projection, containment, uniqueness, and anti-vacuity findings. */
export function collectCliFragmentProjectionAuthorityDrift(
  authority: CliFragmentProjectionAuthority,
): readonly CatalogDrift[] {
  const drift: CatalogDrift[] = projectionPlanViolations(authority.projections).map((detail) => ({
    copy: CLI_FRAGMENT_ROOT,
    detail,
  }));
  const projected = authority.projections.map((projection) => projection.destination).sort(comparePath);
  const tracked = [...authority.subjects.fragments].sort(comparePath);
  const projectedSet = new Set(projected);
  const trackedSet = new Set(tracked);

  for (const path of tracked) {
    if (!projectedSet.has(path)) drift.push({ copy: path, detail: 'tracked fragment has no canonical projection' });
  }
  for (const path of projected) {
    if (!trackedSet.has(path)) drift.push({ copy: path, detail: 'canonical projection is not tracked as a fragment' });
  }
  return Object.freeze(drift);
}

async function check(): Promise<number> {
  const authority = await readCliFragmentProjectionAuthority();
  const drift = [
    ...collectCliFragmentProjectionAuthorityDrift(authority),
    ...collectCliFragmentProjectionDrift(undefined, authority.subjects.fragments, authority.projections),
  ];
  if (drift.length === 0) {
    process.stdout.write(`gen-cli-fragments: ${authority.projections.length} tracked projections are current.\n`);
    return 0;
  }
  process.stderr.write('gen-cli-fragments: projection drift detected\n');
  for (const item of drift) process.stderr.write(`  - ${item.copy}: ${item.detail}\n`);
  return 1;
}

async function write(): Promise<number> {
  const authority = await readCliFragmentProjectionAuthority();
  const count = writeCliFragmentProjections(authority.projections);
  process.stdout.write(`gen-cli-fragments: wrote ${count} tracked projections.\n`);
  return 0;
}

export async function main(argv: readonly string[]): Promise<number> {
  if (argv.includes('--check')) return check();
  if (argv.includes('--write')) return write();
  throw ValidationError('gen-cli-fragments', 'expected --check or --write');
}

if (isDirectExecution(import.meta.url)) {
  void main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
      process.exitCode = 1;
    },
  );
}
