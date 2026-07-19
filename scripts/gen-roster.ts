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
 *   - default (emit): print the regenerated roster blocks to stdout for review.
 *   - `--write`: stamp the generated artifacts in place — the
 *     `LITESHIP_PACKAGES` block in `packages/liteship/src/index.ts` (between its
 *     `BEGIN/END gen-roster` markers) and the fully-generated publish roster at
 *     `scripts/ci/publish-roster.json`. Idempotent: re-running with no roster
 *     change leaves both bytes unchanged.
 *   - `--check`: the staleness gate. Assert the authored roster + the shipped
 *     copies match the repo-truths-derived set; non-zero exit on any drift.
 *
 * @module
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { packageRoster, publishablePackageDirs, packageManifests } from '../tests/support/repo-truths.js';
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
  '@czap/edge',
  '@czap/vite',
  '@czap/worker',
  '@czap/remotion',
  '@czap/scene',
  '@czap/astro',
  '@czap/cloudflare',
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
export const PUBLISHABLE_ROSTER: readonly string[] = [...CANONICAL_ROSTER, ...PUBLISHABLE_UMBRELLAS];

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
// release.yml — the one YAML copy. YAML cannot import TS, so the publish loop
// sources its roster from the generated `scripts/ci/publish-roster.json` (read
// with jq) rather than carrying hand-written package literals. The gate proves
// that JSON is the current projection and that the publish job stays literal-free.
// ---------------------------------------------------------------------------

/** Repo-relative path of the generated publish-roster JSON the release loop reads. */
export const PUBLISH_ROSTER_JSON = 'scripts/ci/publish-roster.json';

function publishRosterJsonPath(): string {
  return resolve(REPO_ROOT, PUBLISH_ROSTER_JSON);
}

function readReleaseYaml(): string {
  return readFileSync(resolve(REPO_ROOT, '.github', 'workflows', 'release.yml'), 'utf8');
}

/**
 * The text of the `publish:` job (the file's last job, so from its header to
 * EOF). The gate's literal-free / references-the-JSON assertions scope to this
 * so an `@czap/` mention elsewhere in the workflow (comments, other jobs) does
 * not false-trip the guard.
 */
export function publishJobText(yaml: string): string {
  const index = yaml.indexOf('\n  publish:');
  if (index === -1) {
    throw new Error('release.yml: `publish:` job not found');
  }
  return yaml.slice(index);
}

// ---------------------------------------------------------------------------
// Render — the generated artifacts (stamped by --write, verified by --check).
// ---------------------------------------------------------------------------

/** The `LITESHIP_PACKAGES` const body (dependency order), the tarball-shipped mirror. */
export function renderLiteshipPackages(): string {
  const entries = CANONICAL_ROSTER.map((name) => `  '${name}',`).join('\n');
  return `export const LITESHIP_PACKAGES = [\n${entries}\n] as const;`;
}

/**
 * The fully-generated `scripts/ci/publish-roster.json` body: the publishable
 * count + the publish-order roster the release loop reads with jq. 2-space
 * indent, trailing newline, byte-stable so `--check` can compare it exactly.
 */
export function renderPublishRosterJson(): string {
  const payload = {
    $generated:
      'by scripts/gen-roster.ts — do not hand-edit; regenerate with: pnpm exec tsx scripts/gen-roster.ts --write',
    expectedPublishable: PUBLISHABLE_ROSTER.length,
    packages: [...PUBLISHABLE_ROSTER],
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

function emit(): void {
  process.stdout.write('# LITESHIP_PACKAGES (packages/liteship/src/index.ts)\n');
  process.stdout.write(`${renderLiteshipPackages()}\n\n`);
  process.stdout.write(`# publish roster (${PUBLISH_ROSTER_JSON})\n`);
  process.stdout.write(renderPublishRosterJson());
}

// ---------------------------------------------------------------------------
// Write — stamp the generated artifacts in place (idempotent).
// ---------------------------------------------------------------------------

const LITESHIP_INDEX_REL = 'packages/liteship/src/index.ts';

/** The `BEGIN/END gen-roster: LITESHIP_PACKAGES` marker span, keeping the marker lines. */
const LITESHIP_BLOCK =
  /(\/\* BEGIN gen-roster: LITESHIP_PACKAGES[^\n]*\*\/\n)[\s\S]*?(\n\/\* END gen-roster: LITESHIP_PACKAGES \*\/)/;

function write(): number {
  const indexPath = resolve(REPO_ROOT, LITESHIP_INDEX_REL);
  const src = readFileSync(indexPath, 'utf8');
  if (!LITESHIP_BLOCK.test(src)) {
    process.stderr.write(
      `gen-roster --write: BEGIN/END gen-roster: LITESHIP_PACKAGES markers not found in ${LITESHIP_INDEX_REL}\n`,
    );
    return 1;
  }
  const stamped = src.replace(
    LITESHIP_BLOCK,
    (_match, begin: string, end: string) => `${begin}${renderLiteshipPackages()}${end}`,
  );
  if (stamped !== src) writeFileSync(indexPath, stamped);
  writeFileSync(publishRosterJsonPath(), renderPublishRosterJson());
  process.stdout.write(`gen-roster --write: stamped ${LITESHIP_INDEX_REL} and ${PUBLISH_ROSTER_JSON}.\n`);
  return 0;
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

  // 3. The generated publish-roster.json equals the current PUBLISHABLE_ROSTER
  //    projection byte-for-byte (the release loop reads this file with jq).
  let jsonOnDisk: string | undefined;
  try {
    jsonOnDisk = readFileSync(publishRosterJsonPath(), 'utf8');
  } catch {
    drift.push({
      copy: PUBLISH_ROSTER_JSON,
      detail: 'missing — run `pnpm exec tsx scripts/gen-roster.ts --write`',
    });
  }
  if (jsonOnDisk != null && jsonOnDisk !== renderPublishRosterJson()) {
    drift.push({
      copy: PUBLISH_ROSTER_JSON,
      detail:
        'content != PUBLISHABLE_ROSTER projection — regenerate with `pnpm exec tsx scripts/gen-roster.ts --write`',
    });
  }

  // 4. release.yml's publish job sources its roster from the generated JSON and
  //    carries NO hand-written `@czap/` package literals of its own.
  const publishJob = publishJobText(readReleaseYaml());
  if (publishJob.includes('@czap/')) {
    drift.push({
      copy: 'release.yml publish job',
      detail: `carries a hand-written \`@czap/\` package literal — the roster must come from ${PUBLISH_ROSTER_JSON}`,
    });
  }
  if (!publishJob.includes(PUBLISH_ROSTER_JSON)) {
    drift.push({
      copy: 'release.yml publish job',
      detail: `does not reference ${PUBLISH_ROSTER_JSON} — the publish loop must source its roster from the generated JSON`,
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
  if (argv.includes('--write')) return write();
  emit();
  return 0;
}

if (isDirectExecution(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
