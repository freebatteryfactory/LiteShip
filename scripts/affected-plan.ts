/**
 * Clean-checkout affected-plan host.
 *
 * This entrypoint deliberately imports no built workspace package and no shared
 * CLI spawn helper: the CI plan job executes before `pnpm build`. It writes the
 * GitHub output itself so a failed planner cannot be laundered by `echo $(...)`.
 *
 * @module
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PACKAGE_CATALOG } from './package-catalog.js';
import IMPACT_CORPUS_JSON from '../tests/fixtures/affected-impact-corpus.json';
import { buildAssuranceInventory, type AssuranceInventory } from './lib/assurance-inventory.js';
import { parseAffectedTestPlan, planAffectedTests, type AffectedTestPlan } from './lib/affected-test-plan.js';
import {
  assertAffectedSelectorCalibrationCurrent,
  buildAffectedSelectorCalibration,
  parseAffectedSelectorCalibration,
  type AffectedImpactCase,
  type AffectedSelectorCalibration,
  type AffectedSelectorCalibrationInputs,
} from './lib/affected-selector-calibration.js';

export interface ChangedPathRead {
  readonly paths: readonly string[];
  readonly baseSha: string;
  readonly headSha: string;
  readonly degradedReason?: string;
}

export type GitDiffReader = (cwd: string, base: string) => ChangedPathRead;
export type AffectedOutputWriter = (path: string, data: string, encoding: 'utf8') => void;
export type AffectedCalibrationProvider = (inputs: AffectedSelectorCalibrationInputs) => unknown;
export type AssuranceInventoryBuilder = (cwd: string) => AssuranceInventory;

export interface AffectedPlanningBundle {
  readonly plan: AffectedTestPlan;
  readonly calibration: AffectedSelectorCalibration | null;
}

const IMPACT_CORPUS = IMPACT_CORPUS_JSON as readonly AffectedImpactCase[];
const SELECTOR_SOURCE_PATHS = [
  'scripts/lib/affected-test-plan.ts',
  'scripts/lib/affected-selector-calibration.ts',
] as const;

/** Read one Git object id for plan-to-checkout binding. */
export function readGitSha(cwd: string, ref: string): string {
  return execFileSync('git', ['rev-parse', ref], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

/** Read the review diff. An unavailable base selects full authority rather than a partial guess. */
export const readChangedPaths: GitDiffReader = (cwd, base) => {
  try {
    const baseSha = readGitSha(cwd, base);
    const headSha = readGitSha(cwd, 'HEAD');
    const stdout = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], {
      cwd,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { paths: stdout.split(/\r?\n/u).filter(Boolean), baseSha, headSha };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      paths: ['package.json'],
      baseSha: 'unresolved',
      headSha: 'unresolved',
      degradedReason: `git diff unavailable; selected full authority: ${message}`,
    };
  }
};

/** Bind calibration to the exact selector implementation that produced it. */
export function affectedSelectorSourceFingerprint(cwd: string): `sha256:${string}` {
  const hash = createHash('sha256');
  for (const path of SELECTOR_SOURCE_PATHS) {
    hash.update(path);
    hash.update('\0');
    hash.update(readFileSync(`${cwd}/${path}`));
    hash.update('\0');
  }
  return `sha256:${hash.digest('hex')}`;
}

function calibrationInputs(cwd: string, inventory: AssuranceInventory): AffectedSelectorCalibrationInputs {
  return {
    selectorFingerprint: affectedSelectorSourceFingerprint(cwd),
    catalog: PACKAGE_CATALOG,
    inventory,
    corpus: IMPACT_CORPUS,
  };
}

const buildCurrentCalibration: AffectedCalibrationProvider = (inputs) => buildAffectedSelectorCalibration(inputs);

/** Produce and boundary-validate the plan plus the evidence that admitted narrowing. */
export function createAffectedPlanningBundle(
  cwd: string,
  base: string,
  readDiff: GitDiffReader = readChangedPaths,
  provideCalibration: AffectedCalibrationProvider = buildCurrentCalibration,
  buildInventory: AssuranceInventoryBuilder = buildAssuranceInventory,
): AffectedPlanningBundle {
  const changed = readDiff(cwd, base);
  const inventory = buildInventory(cwd);
  const inputs = calibrationInputs(cwd, inventory);
  let calibration: AffectedSelectorCalibration | null = null;
  let calibrationFailure: string | undefined;
  try {
    const supplied = provideCalibration(inputs);
    if (supplied === null || supplied === undefined) throw new TypeError('selector calibration is missing');
    const candidate = parseAffectedSelectorCalibration(supplied);
    assertAffectedSelectorCalibrationCurrent(candidate, inputs);
    calibration = candidate;
  } catch (error) {
    calibrationFailure = error instanceof Error ? error.message : String(error);
  }
  const degradedReasons = [
    ...(changed.degradedReason === undefined ? [] : [changed.degradedReason]),
    ...(calibrationFailure === undefined ? [] : [`selector calibration unavailable: ${calibrationFailure}`]),
  ];
  const plan = parseAffectedTestPlan(
    planAffectedTests(changed.paths, PACKAGE_CATALOG, inventory, {
      baseRef: base,
      baseSha: changed.baseSha,
      headSha: changed.headSha,
      confidence: degradedReasons.length === 0 ? 'high' : 'low',
      selectorCalibrationId: calibration?.calibrationId ?? null,
      ...(degradedReasons.length === 0 ? {} : { rationale: degradedReasons }),
    }),
  );
  return { plan, calibration };
}

/** Compatibility projection for callers that only need the plan. */
export function createAffectedPlan(
  cwd: string,
  base: string,
  readDiff: GitDiffReader = readChangedPaths,
  provideCalibration: AffectedCalibrationProvider = buildCurrentCalibration,
  buildInventory: AssuranceInventoryBuilder = buildAssuranceInventory,
): AffectedTestPlan {
  return createAffectedPlanningBundle(cwd, base, readDiff, provideCalibration, buildInventory).plan;
}

/** Append only bounded routing metadata. The addressed plan itself travels as an artifact file. */
export function writeAffectedGithubOutput(
  path: string,
  plan: AffectedTestPlan,
  append: AffectedOutputWriter = appendFileSync,
): void {
  const validated = parseAffectedTestPlan(plan);
  append(
    path,
    `plan-id=${validated.planId}\nbrowser-required=${String(validated.browserRequired)}\nmode=${validated.mode}\n`,
    'utf8',
  );
}

/** Read and boundary-validate one addressed affected plan from disk. */
export function readAffectedPlanFile(path: string): AffectedTestPlan {
  return parseAffectedTestPlan(JSON.parse(readFileSync(path, 'utf8')) as unknown);
}

/** Atomically persist and read-back validate the exact plan bytes handed to downstream jobs. */
export function writeAffectedPlanFile(path: string, plan: AffectedTestPlan): void {
  const validated = parseAffectedTestPlan(plan);
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(validated)}\n`, 'utf8');
  const readBack = parseAffectedTestPlan(JSON.parse(readFileSync(temporary, 'utf8')) as unknown);
  if (readBack.planId !== validated.planId) throw new TypeError('affected plan file changed during write');
  renameSync(temporary, path);
}

/** Atomically persist and read-back validate selector calibration evidence. */
export function writeAffectedSelectorCalibrationFile(path: string, calibration: AffectedSelectorCalibration): void {
  const validated = parseAffectedSelectorCalibration(calibration);
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(validated)}\n`, 'utf8');
  const readBack = parseAffectedSelectorCalibration(JSON.parse(readFileSync(temporary, 'utf8')) as unknown);
  if (readBack.calibrationId !== validated.calibrationId) {
    throw new TypeError('affected selector calibration file changed during write');
  }
  renameSync(temporary, path);
}

/** Read and boundary-validate one selector calibration artifact from disk. */
export function readAffectedSelectorCalibrationFile(path: string): AffectedSelectorCalibration {
  return parseAffectedSelectorCalibration(JSON.parse(readFileSync(path, 'utf8')) as unknown);
}

/** Refuse a valid plan addressed to any checkout other than the one executing it. */
export function assertAffectedPlanHead(plan: AffectedTestPlan, headSha: string): void {
  if (plan.headSha !== headSha) {
    throw new TypeError(`affected plan head ${plan.headSha} does not match checkout ${headSha}`);
  }
}

function optionValue(argv: readonly string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  if (index < 0) return undefined;
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('--')) throw new TypeError(`${name} requires a value`);
  return value;
}

export function main(argv: readonly string[] = process.argv.slice(2)): void {
  const cwd = process.cwd();
  if (argv.includes('--verify-current-head')) {
    const input = optionValue(argv, '--input');
    const raw = process.env['LITESHIP_AFFECTED_PLAN'];
    if (input === undefined && raw === undefined) {
      throw new TypeError('--input or LITESHIP_AFFECTED_PLAN is required for verification');
    }
    if (input !== undefined && raw !== undefined) {
      throw new TypeError('supply affected plan by file or environment, not both');
    }
    const supplied =
      input === undefined ? parseAffectedTestPlan(JSON.parse(raw!) as unknown) : readAffectedPlanFile(input);
    assertAffectedPlanHead(supplied, readGitSha(cwd, 'HEAD'));
    process.stdout.write(`${supplied.planId}\n`);
    return;
  }
  const base = process.env['LITESHIP_AFFECTED_BASE'] || 'origin/main';
  const bundle = createAffectedPlanningBundle(cwd, base);
  const plan = bundle.plan;
  const output = optionValue(argv, '--github-output');
  const file = optionValue(argv, '--output');
  const calibrationFile = optionValue(argv, '--calibration-output');
  if (file !== undefined) writeAffectedPlanFile(file, plan);
  if (calibrationFile !== undefined && bundle.calibration !== null) {
    writeAffectedSelectorCalibrationFile(calibrationFile, bundle.calibration);
  }
  if (output !== undefined) writeAffectedGithubOutput(output, plan);
  if (output === undefined) process.stdout.write(`${JSON.stringify(plan)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
