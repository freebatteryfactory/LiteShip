/** Addressed, fail-closed evidence from the repeated runtime-sensitive test campaign. @module */

import { createHash } from 'node:crypto';
import type { FlakeTarget } from '../test-flake-targets.js';

export interface FlakeAttemptObservation {
  readonly target: string;
  readonly iteration: number;
  readonly verdict: 'pass' | 'fail';
  readonly exitCode: number;
}

export interface FlakeTargetEvidence {
  readonly target: string;
  readonly kind: 'node' | 'browser';
  readonly owner: string;
  readonly reproducer: readonly string[];
  readonly provingScar: string;
  readonly remediation: string;
  readonly attempts: number;
  readonly failures: number;
  readonly observedFailureRate: number;
  readonly observations: readonly FlakeAttemptObservation[];
}

export interface FlakeEvidence {
  readonly schemaVersion: 1;
  readonly evidenceId: `sha256:${string}`;
  readonly targetsFingerprint: `sha256:${string}`;
  readonly firstSha: string;
  readonly lastSha: string;
  readonly observedOn: string;
  readonly expires: string;
  readonly attempts: number;
  readonly failures: number;
  readonly recoveredRetries: number;
  readonly observedFailureRate: number;
  readonly targets: readonly FlakeTargetEvidence[];
  readonly verdict: 'pass' | 'fail';
}

export interface BuildFlakeEvidenceInput {
  readonly targets: readonly FlakeTarget[];
  readonly observations: readonly FlakeAttemptObservation[];
  readonly firstSha: string;
  readonly lastSha: string;
  readonly observedOn: string;
  readonly expires: string;
}

type UnsignedFlakeEvidence = Omit<FlakeEvidence, 'evidenceId'>;

function stable(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stable(record[key])}`)
    .join(',')}}`;
}

function digest(value: unknown): `sha256:${string}` {
  return `sha256:${createHash('sha256').update(stable(value)).digest('hex')}`;
}

function exactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    stable(Object.keys(value).sort()) === stable([...keys].sort())
  );
}

function isDigest(value: unknown): value is `sha256:${string}` {
  return typeof value === 'string' && /^sha256:[0-9a-f]{64}$/u.test(value);
}

function isSha(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{40,64}$/u.test(value);
}

function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function rate(failures: number, attempts: number): number {
  return attempts === 0 ? 0 : failures / attempts;
}

/** Fingerprint the authored target ownership and scar declarations. */
export function flakeTargetsFingerprint(targets: readonly FlakeTarget[]): `sha256:${string}` {
  return digest(
    [...targets].map((target) => ({ ...target })).sort((left, right) => left.path.localeCompare(right.path)),
  );
}

function reproducerFor(target: FlakeTarget): readonly string[] {
  return target.kind === 'node'
    ? ['pnpm', 'exec', 'vitest', 'run', '--config', 'vitest.config.ts', target.path]
    : ['pnpm', 'exec', 'vitest', 'run', '--config', 'vitest.browser.config.ts', target.path];
}

/** Build deterministic evidence. Any failed attempt permanently fails this campaign. */
export function buildFlakeEvidence(input: BuildFlakeEvidenceInput): FlakeEvidence {
  if (!isSha(input.firstSha) || !isSha(input.lastSha)) throw new TypeError('flake evidence SHA is invalid');
  if (!isDate(input.observedOn) || !isDate(input.expires)) throw new TypeError('flake evidence date is invalid');
  if (input.expires <= input.observedOn) throw new TypeError('flake evidence expiry must follow observation date');
  const paths = input.targets.map((target) => target.path);
  if (paths.length === 0) throw new TypeError('flake evidence must contain at least one target');
  if (new Set(paths).size !== paths.length) throw new TypeError('flake evidence target paths must be unique');
  const targetSet = new Set(paths);
  for (const observation of input.observations) {
    if (!targetSet.has(observation.target))
      throw new TypeError(`flake observation has foreign target: ${observation.target}`);
    if (!Number.isSafeInteger(observation.iteration) || observation.iteration < 1) {
      throw new TypeError('flake observation iteration is invalid');
    }
    if (!Number.isSafeInteger(observation.exitCode) || observation.exitCode < 0) {
      throw new TypeError('flake observation exit code is invalid');
    }
    if (observation.verdict !== 'pass' && observation.verdict !== 'fail') {
      throw new TypeError('flake observation verdict is invalid');
    }
    if ((observation.exitCode === 0) !== (observation.verdict === 'pass')) {
      throw new TypeError('flake observation verdict contradicts its exit code');
    }
  }
  const targets = [...input.targets]
    .sort((left, right) => left.path.localeCompare(right.path))
    .map((target): FlakeTargetEvidence => {
      const observations = input.observations
        .filter((observation) => observation.target === target.path)
        .sort((left, right) => left.iteration - right.iteration);
      if (observations.length === 0) throw new TypeError(`flake target has no observations: ${target.path}`);
      for (let index = 0; index < observations.length; index += 1) {
        if (observations[index]!.iteration !== index + 1) {
          throw new TypeError(`flake target iterations are incomplete: ${target.path}`);
        }
      }
      const failures = observations.filter((observation) => observation.verdict === 'fail').length;
      return {
        target: target.path,
        kind: target.kind,
        owner: target.owner,
        reproducer: reproducerFor(target),
        provingScar: target.provingScar,
        remediation: target.remediation,
        attempts: observations.length,
        failures,
        observedFailureRate: rate(failures, observations.length),
        observations,
      };
    });
  const attempts = targets.reduce((total, target) => total + target.attempts, 0);
  const failures = targets.reduce((total, target) => total + target.failures, 0);
  const recoveredRetries = targets.reduce((total, target) => {
    const firstFailure = target.observations.findIndex((observation) => observation.verdict === 'fail');
    return (
      total +
      (firstFailure < 0
        ? 0
        : target.observations.slice(firstFailure + 1).filter((observation) => observation.verdict === 'pass').length)
    );
  }, 0);
  const unsigned: UnsignedFlakeEvidence = {
    schemaVersion: 1,
    targetsFingerprint: flakeTargetsFingerprint(input.targets),
    firstSha: input.firstSha,
    lastSha: input.lastSha,
    observedOn: input.observedOn,
    expires: input.expires,
    attempts,
    failures,
    recoveredRetries,
    observedFailureRate: rate(failures, attempts),
    targets,
    verdict: failures === 0 && input.firstSha === input.lastSha ? 'pass' : 'fail',
  };
  return { ...unsigned, evidenceId: digest(unsigned) };
}

/** Strict boundary decoder: no foreign keys, stale counts, or doctored verdicts. */
export function parseFlakeEvidence(value: unknown): FlakeEvidence {
  if (
    !exactKeys(value, [
      'attempts',
      'evidenceId',
      'expires',
      'failures',
      'firstSha',
      'lastSha',
      'observedFailureRate',
      'observedOn',
      'recoveredRetries',
      'schemaVersion',
      'targets',
      'targetsFingerprint',
      'verdict',
    ])
  )
    throw new TypeError('flake evidence has an invalid envelope');
  if (value['schemaVersion'] !== 1) throw new TypeError('flake evidence schemaVersion must be 1');
  if (!isDigest(value['evidenceId']) || !isDigest(value['targetsFingerprint'])) {
    throw new TypeError('flake evidence digest is invalid');
  }
  if (!isSha(value['firstSha']) || !isSha(value['lastSha'])) throw new TypeError('flake evidence SHA is invalid');
  if (!isDate(value['observedOn']) || !isDate(value['expires']) || value['expires'] <= value['observedOn']) {
    throw new TypeError('flake evidence dates are invalid');
  }
  if (!Array.isArray(value['targets']) || value['targets'].length === 0)
    throw new TypeError('flake evidence targets are invalid');
  for (const key of ['attempts', 'failures', 'recoveredRetries']) {
    if (!Number.isSafeInteger(value[key]) || Number(value[key]) < 0)
      throw new TypeError(`flake evidence ${key} is invalid`);
  }
  if (typeof value['observedFailureRate'] !== 'number' || !Number.isFinite(value['observedFailureRate'])) {
    throw new TypeError('flake evidence rate is invalid');
  }
  if (value['verdict'] !== 'pass' && value['verdict'] !== 'fail')
    throw new TypeError('flake evidence verdict is invalid');
  const targetPaths = new Set<string>();
  let attempts = 0;
  let failures = 0;
  let recoveredRetries = 0;
  let prior = '';
  for (const target of value['targets']) {
    if (
      !exactKeys(target, [
        'attempts',
        'failures',
        'kind',
        'observations',
        'observedFailureRate',
        'owner',
        'provingScar',
        'remediation',
        'reproducer',
        'target',
      ])
    ) {
      throw new TypeError('flake target evidence is invalid');
    }
    if (typeof target['target'] !== 'string' || target['target'] <= prior || targetPaths.has(target['target'])) {
      throw new TypeError('flake target evidence paths must be sorted and unique');
    }
    if (target['kind'] !== 'node' && target['kind'] !== 'browser') throw new TypeError('flake target kind is invalid');
    for (const key of ['owner', 'provingScar', 'remediation']) {
      if (typeof target[key] !== 'string' || target[key].length === 0)
        throw new TypeError(`flake target ${key} is invalid`);
    }
    if (!Array.isArray(target['reproducer']) || target['reproducer'].some((part) => typeof part !== 'string')) {
      throw new TypeError('flake target reproducer is invalid');
    }
    if (!Array.isArray(target['observations']) || target['observations'].length === 0) {
      throw new TypeError('flake target observations are invalid');
    }
    let targetFailures = 0;
    let firstFailure = -1;
    let targetRecovered = 0;
    for (let index = 0; index < target['observations'].length; index += 1) {
      const observation = target['observations'][index];
      if (!exactKeys(observation, ['exitCode', 'iteration', 'target', 'verdict']))
        throw new TypeError('flake observation is invalid');
      if (observation['target'] !== target['target'] || observation['iteration'] !== index + 1) {
        throw new TypeError('flake observation target or iteration is stale');
      }
      if (
        !Number.isSafeInteger(observation['exitCode']) ||
        Number(observation['exitCode']) < 0 ||
        (observation['verdict'] !== 'pass' && observation['verdict'] !== 'fail') ||
        (observation['exitCode'] === 0) !== (observation['verdict'] === 'pass')
      ) {
        throw new TypeError('flake observation verdict is invalid');
      }
      if (observation['verdict'] === 'fail') {
        targetFailures += 1;
        if (firstFailure < 0) firstFailure = index;
      } else if (firstFailure >= 0) targetRecovered += 1;
    }
    if (target['attempts'] !== target['observations'].length || target['failures'] !== targetFailures) {
      throw new TypeError('flake target counts are stale');
    }
    if (target['observedFailureRate'] !== rate(targetFailures, target['observations'].length)) {
      throw new TypeError('flake target rate is stale');
    }
    prior = target['target'];
    targetPaths.add(target['target']);
    attempts += target['observations'].length;
    failures += targetFailures;
    recoveredRetries += targetRecovered;
  }
  if (
    value['attempts'] !== attempts ||
    value['failures'] !== failures ||
    value['recoveredRetries'] !== recoveredRetries
  ) {
    throw new TypeError('flake evidence aggregate counts are stale');
  }
  if (value['observedFailureRate'] !== rate(failures, attempts)) throw new TypeError('flake evidence rate is stale');
  if ((value['verdict'] === 'pass') !== (failures === 0 && value['firstSha'] === value['lastSha'])) {
    throw new TypeError('flake evidence verdict contradicts observations');
  }
  const { evidenceId, ...unsigned } = value;
  if (evidenceId !== digest(unsigned)) throw new TypeError('flake evidence integrity digest does not match its bytes');
  return value as unknown as FlakeEvidence;
}

/** Serialize one admitted evidence record to canonical UTF-8 JSON Lines bytes. */
export function serializeFlakeEvidence(evidence: FlakeEvidence): string {
  return `${stable(parseFlakeEvidence(evidence))}\n`;
}

/** Admit evidence only for this checkout, current target truth, and unexpired wall-clock date. */
export function assertFlakeEvidenceCurrent(
  evidence: FlakeEvidence,
  expected: { readonly headSha: string; readonly targets: readonly FlakeTarget[]; readonly today: string },
): void {
  const parsed = parseFlakeEvidence(evidence);
  const representedTargets = parsed.targets.map((target) => ({
    path: target.target,
    kind: target.kind,
    owner: target.owner,
    provingScar: target.provingScar,
    remediation: target.remediation,
  }));
  if (parsed.targetsFingerprint !== flakeTargetsFingerprint(representedTargets)) {
    throw new TypeError('flake evidence target declarations contradict their fingerprint');
  }
  for (const target of parsed.targets) {
    const represented = representedTargets.find((entry) => entry.path === target.target)!;
    if (stable(target.reproducer) !== stable(reproducerFor(represented))) {
      throw new TypeError(`flake evidence reproducer is stale for ${target.target}`);
    }
  }
  if (parsed.firstSha !== expected.headSha || parsed.lastSha !== expected.headSha) {
    throw new TypeError('flake evidence belongs to a foreign checkout');
  }
  if (parsed.targetsFingerprint !== flakeTargetsFingerprint(expected.targets)) {
    throw new TypeError('flake evidence is stale for the flake target catalog');
  }
  if (!isDate(expected.today)) throw new TypeError('flake evidence comparison date is invalid');
  if (parsed.expires < expected.today) throw new TypeError('flake evidence is expired');
}
