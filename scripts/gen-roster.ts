#!/usr/bin/env tsx
/**
 * gen-roster — the single owner of the canonical `@czap/*` fleet roster and the
 * publishable-set projection, plus a byte-compare staleness gate over every
 * hand-maintained roster copy (plan [CER] `scripts/gen-roster.ts`, master-plan
 * line 446).
 *
 * ## Why this exists
 *
 * Scar S0.4 (docs/plan/scar-ledger.md) — *one truth, many private parsers*: the
 * fleet roster is copied by hand into five places (liteship's
 * `LITESHIP_PACKAGES`, the cli package-metadata catalog, command's package-smoke
 * `PACKAGES`, audit's `WORKSPACE_ALIASES`, and `.github/workflows/release.yml`).
 * Each copy drifts independently when a package is added or removed. This script
 * is the ONE producer of the membership + dependency order those copies must
 * agree on, and its `--check` gate fails loud the moment any copy — or the
 * on-disk package set — drifts from the canonical roster.
 *
 * ## Single source of truth
 *
 * Package *membership* is never authored here: it is derived from
 * `tests/support/repo-truths.ts` (`packageRoster()` / `publishablePackageDirs()`
 * — the repo-truths single-owner accessors, the sanctioned home for reading the
 * `packages/*` manifests). What IS authored here is the one thing bytes cannot
 * derive: the **dependency order** (`CANONICAL_ROSTER`), exactly as ADR-0010's
 * spine-owned brand declarations are authored generator input rather than
 * derived output. The `--check` gate cross-checks the authored order against the
 * derived set, so an on-disk add/remove that the authored order missed fails.
 *
 * ## Modes
 *
 *   - default (emit): print the regenerated roster blocks to stdout so the
 *     consumer-phase edits can adopt them between generated-block markers.
 *   - `--check`: the staleness gate. Assert the authored roster + the shipped
 *     copies match the repo-truths-derived set; non-zero exit on any drift.
 *
 * The consumer files themselves are NOT written by this producer slice; the
 * consumer phase adopts the emitted blocks behind generated-block markers.
 *
 * @module
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  packageRoster,
  publishablePackageDirs,
  packageManifests,
} from '../tests/support/repo-truths.js';
import { isDirectExecution } from './audit/shared.js';

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');

// ---------------------------------------------------------------------------
// Authored input — the ONE dependency-ordered roster (ADR-0010 model: authored
// order, derived membership). Kept in the exact order the runtime dependency
// graph installs; the `--check` gate proves it covers the on-disk set exactly.
// ---------------------------------------------------------------------------

/**
 * Every non-private `@czap/*` package, in dependency (install) order. This is
 * the canonical roster the five hand-maintained copies mirror; `--check` proves
 * its membership equals the repo-truths-derived set on disk.
 */
export const CANONICAL_ROSTER: readonly string[] = [
  '@czap/_spine',
  '@czap/error',
  '@czap/canonical',
  '@czap/core',
  '@czap/genui',
  '@czap/quantizer',
  '@czap/compiler',
  '@czap/web',
  '@czap/detect',
  '@czap/vite',
  '@czap/astro',
  '@czap/edge',
  '@czap/cloudflare',
  '@czap/worker',
  '@czap/remotion',
  '@czap/scene',
  '@czap/stage',
  '@czap/assets',
  '@czap/gauntlet',
  '@czap/audit',
  '@czap/command',
  '@czap/cli',
  '@czap/mcp-server',
];

/**
 * The two non-`@czap` publishable umbrellas the release loop also ships. They
 * carry the whole fleet as deps (`liteship`) or scaffold it (`create-liteship`)
 * so they publish last, after every scope they depend on.
 */
export const PUBLISHABLE_UMBRELLAS: readonly string[] = ['create-liteship', 'liteship'];

/** The full publishable set the release workflow iterates: fleet then umbrellas. */
export const PUBLISHABLE_ROSTER: readonly string[] = [
  ...CANONICAL_ROSTER,
  ...PUBLISHABLE_UMBRELLAS,
];

// ---------------------------------------------------------------------------
// Derived truths (repo-truths single owner).
// ---------------------------------------------------------------------------

/** The non-private `@czap/*` names on disk (repo-truths), sorted. */
function derivedRosterSet(): readonly string[] {
  return packageRoster();
}

/** Every publishable manifest name on disk (repo-truths), sorted. */
function derivedPublishableNames(): readonly string[] {
  return packageManifests()
    .filter((manifest) => manifest.publishConfig != null && manifest.name != null)
    .map((manifest) => manifest.name as string)
    .sort();
}

// ---------------------------------------------------------------------------
// release.yml parse (the one YAML copy — YAML cannot import TS, so it is a list
// the gate verifies rather than a regenerated block).
// ---------------------------------------------------------------------------

interface ReleaseRoster {
  /** The `EXPECTED_PUBLISHABLE=<n>` drift-guard count. */
  readonly expectedPublishable: number;
  /** The `for pkg in ...; do` publish-loop package list, in file order. */
  readonly loopPackages: readonly string[];
}

/** Parse the publish-loop list + EXPECTED_PUBLISHABLE count out of release.yml. */
export function parseReleaseRoster(yaml: string): ReleaseRoster {
  const countMatch = /EXPECTED_PUBLISHABLE=(\d+)/.exec(yaml);
  if (countMatch == null) {
    throw new Error('release.yml: EXPECTED_PUBLISHABLE=<n> not found');
  }
  const loopMatch = /for pkg in ([^\n]+?);\s*do/.exec(yaml);
  if (loopMatch == null) {
    throw new Error('release.yml: `for pkg in ...; do` publish loop not found');
  }
  const loopPackages = loopMatch[1]!.trim().split(/\s+/).filter((token) => token.length > 0);
  return { expectedPublishable: Number(countMatch[1]), loopPackages };
}

function readReleaseYaml(): string {
  return readFileSync(resolve(REPO_ROOT, '.github', 'workflows', 'release.yml'), 'utf8');
}

// ---------------------------------------------------------------------------
// Emit — the regenerated blocks (stdout only; consumer phase adopts them).
// ---------------------------------------------------------------------------

/** The `LITESHIP_PACKAGES` const body (dependency order), the tarball-shipped mirror. */
export function renderLiteshipPackages(): string {
  const entries = CANONICAL_ROSTER.map((name) => `  '${name}',`).join('\n');
  return `export const LITESHIP_PACKAGES = [\n${entries}\n] as const;`;
}

/** The release.yml publish-loop line + EXPECTED_PUBLISHABLE count. */
export function renderReleaseLoop(): string {
  return [
    `EXPECTED_PUBLISHABLE=${PUBLISHABLE_ROSTER.length}`,
    `for pkg in ${PUBLISHABLE_ROSTER.join(' ')}; do`,
  ].join('\n');
}

function emit(): void {
  process.stdout.write('# LITESHIP_PACKAGES (packages/liteship/src/index.ts)\n');
  process.stdout.write(`${renderLiteshipPackages()}\n\n`);
  process.stdout.write('# release.yml publish loop (.github/workflows/release.yml)\n');
  process.stdout.write(`${renderReleaseLoop()}\n`);
}

// ---------------------------------------------------------------------------
// Check — the staleness gate.
// ---------------------------------------------------------------------------

interface Drift {
  readonly copy: string;
  readonly detail: string;
}

function setEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((value) => set.has(value));
}

function symmetricDiff(a: readonly string[], b: readonly string[]): string {
  const setA = new Set(a);
  const setB = new Set(b);
  const onlyA = a.filter((value) => !setB.has(value));
  const onlyB = b.filter((value) => !setA.has(value));
  return `+authored:[${onlyA.join(',')}] +derived:[${onlyB.join(',')}]`;
}

/** Every roster drift between the authored roster / shipped copies and repo-truths. */
export function collectRosterDrift(): readonly Drift[] {
  const drift: Drift[] = [];
  const derivedRoster = derivedRosterSet();
  const derivedPublishable = derivedPublishableNames();

  // 1. Authored CANONICAL_ROSTER covers exactly the on-disk @czap/* set.
  if (new Set(CANONICAL_ROSTER).size !== CANONICAL_ROSTER.length) {
    drift.push({ copy: 'CANONICAL_ROSTER', detail: 'contains duplicate entries' });
  }
  if (!setEqual(CANONICAL_ROSTER, derivedRoster)) {
    drift.push({
      copy: 'CANONICAL_ROSTER',
      detail: `membership != repo-truths @czap set — ${symmetricDiff(CANONICAL_ROSTER, derivedRoster)}`,
    });
  }

  // 2. Publishable projection covers exactly the on-disk publishable set.
  if (!setEqual(PUBLISHABLE_ROSTER, derivedPublishable)) {
    drift.push({
      copy: 'PUBLISHABLE_ROSTER',
      detail: `membership != repo-truths publishable set — ${symmetricDiff(PUBLISHABLE_ROSTER, derivedPublishable)}`,
    });
  }

  // 3. release.yml EXPECTED_PUBLISHABLE + publish loop agree with the derived set.
  const release = parseReleaseRoster(readReleaseYaml());
  if (release.expectedPublishable !== derivedPublishable.length) {
    drift.push({
      copy: 'release.yml EXPECTED_PUBLISHABLE',
      detail: `${release.expectedPublishable} != ${derivedPublishable.length} publishable on disk`,
    });
  }
  if (!setEqual(release.loopPackages, derivedPublishable)) {
    drift.push({
      copy: 'release.yml publish loop',
      detail: `membership != repo-truths publishable set — ${symmetricDiff(release.loopPackages, derivedPublishable)}`,
    });
  }

  return drift;
}

function check(): number {
  const drift = collectRosterDrift();
  if (drift.length === 0) {
    process.stdout.write(
      `gen-roster: roster in sync — ${CANONICAL_ROSTER.length} @czap packages, ${PUBLISHABLE_ROSTER.length} publishable.\n`,
    );
    return 0;
  }
  process.stderr.write('gen-roster: roster drift detected\n');
  for (const item of drift) {
    process.stderr.write(`  - ${item.copy}: ${item.detail}\n`);
  }
  process.stderr.write(
    '\nUpdate the canonical roster (scripts/gen-roster.ts CANONICAL_ROSTER) and every shipped copy in the same commit.\n',
  );
  return 1;
}

// ---------------------------------------------------------------------------
// Entry.
// ---------------------------------------------------------------------------

export function main(argv: readonly string[]): number {
  if (argv.includes('--check')) return check();
  emit();
  return 0;
}

if (isDirectExecution(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
