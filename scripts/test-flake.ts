/** Execute the repeated flake campaign and mint addressed evidence without retry-to-green. @module */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  buildFlakeEvidence,
  parseFlakeEvidence,
  serializeFlakeEvidence,
  type FlakeAttemptObservation,
  type FlakeEvidence,
} from './lib/flake-evidence.js';
import { spawnArgvCapture } from './lib/spawn.js';
import { runPnpm, type PnpmRunResult } from './support/pnpm-process.js';
import { FLAKE_TARGETS, type FlakeTarget } from './test-flake-targets.js';

const root = resolve(import.meta.dirname, '..');
const REPETITIONS = 5;
const EVIDENCE_VALID_DAYS = 7;
const browserFlakeEnv = {
  LITESHIP_VITEST_BROWSERS: process.env.LITESHIP_VITEST_BROWSERS ?? 'chromium',
};

export interface FlakeCampaignDeps {
  readonly cwd: string;
  readonly targets: readonly FlakeTarget[];
  readonly repetitions: number;
  readonly run: (
    args: readonly string[],
    options: { readonly cwd: string; readonly env?: NodeJS.ProcessEnv },
  ) => Promise<PnpmRunResult>;
  readonly assertPath: (path: string) => Promise<void>;
  readonly readHead: () => Promise<string>;
  readonly observedOn: string;
  readonly expires: string;
  readonly log?: (message: string) => void;
  readonly writeFailure?: (message: string) => void;
}

function commandFor(target: FlakeTarget): readonly string[] {
  return [
    'exec',
    'vitest',
    'run',
    '--config',
    target.kind === 'node' ? 'vitest.config.ts' : 'vitest.browser.config.ts',
    target.path,
  ];
}

function boundedTail(value: string, limit = 4_000): string {
  return value.length <= limit ? value : value.slice(-limit);
}

/**
 * Run every declared attempt even after a failure so the evidence can measure
 * recovery. The aggregate remains failed when any earlier attempt failed.
 */
export async function runFlakeCampaign(deps: FlakeCampaignDeps): Promise<FlakeEvidence> {
  if (!Number.isSafeInteger(deps.repetitions) || deps.repetitions < 1) {
    throw new TypeError('flake repetitions must be a positive integer');
  }
  for (const target of deps.targets) await deps.assertPath(resolve(deps.cwd, target.path));
  const firstSha = await deps.readHead();
  const observations: FlakeAttemptObservation[] = [];
  const failures: string[] = [];
  for (const target of deps.targets) {
    for (let iteration = 1; iteration <= deps.repetitions; iteration += 1) {
      (deps.log ?? console.log)(`[flake] ${target.path} iteration ${iteration}/${deps.repetitions}`);
      let result: PnpmRunResult;
      try {
        result = await deps.run(commandFor(target), {
          cwd: deps.cwd,
          ...(target.kind === 'browser' ? { env: browserFlakeEnv } : {}),
        });
      } catch (error) {
        result = { code: 1, stdout: '', stderr: error instanceof Error ? error.message : String(error) };
      }
      const verdict = result.code === 0 ? ('pass' as const) : ('fail' as const);
      observations.push({ target: target.path, iteration, verdict, exitCode: result.code });
      if (verdict === 'fail') {
        failures.push(
          [
            `${target.path} failed on iteration ${iteration} (exit ${result.code})`,
            boundedTail(result.stdout),
            boundedTail(result.stderr),
          ]
            .filter(Boolean)
            .join('\n'),
        );
      }
    }
  }
  const evidence = buildFlakeEvidence({
    targets: deps.targets,
    observations,
    firstSha,
    lastSha: await deps.readHead(),
    observedOn: deps.observedOn,
    expires: deps.expires,
  });
  if (failures.length > 0)
    (deps.writeFailure ?? process.stderr.write.bind(process.stderr))(`${failures.join('\n---\n')}\n`);
  return evidence;
}

async function readHead(cwd: string): Promise<string> {
  const result = await spawnArgvCapture('git', ['rev-parse', 'HEAD'], { cwd });
  if (result.exitCode !== 0 || result.stdout.trim() === '') {
    throw new TypeError(`git rev-parse HEAD failed: ${boundedTail(result.stderr)}`);
  }
  return result.stdout.trim();
}

function utcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return utcDate(date);
}

function optionValue(argv: readonly string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  if (index < 0) return undefined;
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('--')) throw new TypeError(`${name} requires a value`);
  return value;
}

/** Atomically persist and read-back validate the evidence consumed by delivery metrics. */
export function writeFlakeEvidenceFile(path: string, evidence: FlakeEvidence): FlakeEvidence {
  const validated = parseFlakeEvidence(evidence);
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, serializeFlakeEvidence(validated), 'utf8');
  const readBack = parseFlakeEvidence(JSON.parse(readFileSync(temporary, 'utf8')) as unknown);
  if (readBack.evidenceId !== validated.evidenceId) throw new TypeError('flake evidence changed during write');
  renameSync(temporary, path);
  return readBack;
}

export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
  const output = optionValue(argv, '--output') ?? 'reports/flake-evidence.json';
  const observedOn = utcDate(new Date());
  const evidence = await runFlakeCampaign({
    cwd: root,
    targets: FLAKE_TARGETS,
    repetitions: REPETITIONS,
    run: runPnpm,
    assertPath: async (path) => {
      const metadata = await stat(path);
      if (!metadata.isFile()) throw new TypeError(`[flake] target is not a file: ${path}`);
    },
    readHead: () => readHead(root),
    observedOn,
    expires: addUtcDays(observedOn, EVIDENCE_VALID_DAYS),
  });
  writeFlakeEvidenceFile(resolve(root, output), evidence);
  process.stdout.write(`${evidence.evidenceId} ${evidence.verdict} rate=${evidence.observedFailureRate}\n`);
  if (evidence.verdict !== 'pass') {
    throw new Error(
      `flake campaign failed: ${evidence.failures}/${evidence.attempts} attempts failed; later passes did not erase earlier failures`,
    );
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await main();
}
