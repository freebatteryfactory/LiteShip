/** Pinned, shell-free cargo-audit execution and receipt admission. @module */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ValidationError } from '../../packages/error/src/index.js';
import { deriveRustCrateCensus } from './devcontainer-pins.js';

export const CARGO_AUDIT_VERSION = '0.22.2';
export const CARGO_AUDIT_EXECUTABLE = 'cargo-audit';
// Conservative per-process ceiling under the security job's 10-minute wall
// budget. This is an honest safety cap, not a measured performance claim.
export const CARGO_AUDIT_PROCESS_TIMEOUT_MS = 120_000;

export interface CargoAuditSubject {
  readonly manifestPath: string;
  readonly lockPath: string;
}

export interface CargoAuditInvocation {
  readonly command: typeof CARGO_AUDIT_EXECUTABLE;
  readonly argv: readonly string[];
}

export interface CargoAuditProcessResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly signal: NodeJS.Signals | null;
  readonly timedOut: boolean;
}

export type CargoAuditExecutor = (
  command: string,
  argv: readonly string[],
  options: { readonly cwd: string; readonly timeoutMs: number },
) => Promise<CargoAuditProcessResult>;

export interface CargoAuditReport {
  readonly database: {
    readonly advisoryCount: number;
    readonly lastCommit: string | null;
    readonly lastUpdated: string | null;
  };
  readonly lockfile: { readonly dependencyCount: number };
  readonly vulnerabilities: {
    readonly found: boolean;
    readonly count: number;
    readonly advisoryIds: readonly string[];
  };
  readonly warningCounts: Readonly<Record<string, number>>;
}

export interface CargoAuditReceipt {
  readonly schema: 'liteship/cargo-audit@1';
  readonly tool: {
    readonly name: typeof CARGO_AUDIT_EXECUTABLE;
    readonly version: typeof CARGO_AUDIT_VERSION;
  };
  readonly subjects: readonly {
    readonly manifestPath: string;
    readonly lockPath: string;
    readonly dependencyCount: number;
    readonly invocation: readonly string[];
    readonly database: CargoAuditReport['database'];
    readonly warningCounts: Readonly<Record<string, number>>;
    readonly manifestSha256: `sha256:${string}`;
    readonly lockSha256: `sha256:${string}`;
    readonly rawReportSha256: `sha256:${string}`;
  }[];
}

type UnknownRecord = Record<string, unknown>;

function refuse(detail: string): never {
  throw ValidationError('cargo-audit', detail);
}

function codeUnitCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function record(value: unknown, label: string): UnknownRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return refuse(`${label} must be an object`);
  }
  return value as UnknownRecord;
}

function exactKeys(value: UnknownRecord, expected: readonly string[], label: string): void {
  const actual = Object.keys(value).sort(codeUnitCompare);
  const wanted = [...expected].sort(codeUnitCompare);
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    refuse(`${label} keys must be exactly ${wanted.join(', ')}`);
  }
}

function nonNegativeInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) return refuse(`${label} must be a non-negative integer`);
  return Number(value);
}

function nullableString(value: unknown, label: string): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0) {
    return refuse(`${label} must be null or a non-empty trimmed string`);
  }
  return value;
}

function nonEmptyString(value: unknown, label: string): string {
  const parsed = nullableString(value, label);
  if (parsed === null) return refuse(`${label} must be a non-empty trimmed string`);
  return parsed;
}

function stringArray(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value)) return refuse(`${label} must be an array`);
  for (const [index, item] of value.entries()) {
    if (typeof item !== 'string' || item.trim() !== item || item.length === 0) {
      refuse(`${label}[${index}] must be a non-empty trimmed string`);
    }
  }
  return value as readonly string[];
}

/** Every crates/* manifest is a subject, and its adjacent committed lockfile is mandatory. */
export function deriveCargoAuditSubjects(repoRoot: string): readonly CargoAuditSubject[] {
  return Object.freeze(
    deriveRustCrateCensus(repoRoot).map((subject) =>
      Object.freeze({ manifestPath: subject.manifestPath, lockPath: subject.lockPath }),
    ),
  );
}

export function cargoAuditVersionInvocation(): CargoAuditInvocation {
  return Object.freeze({ command: CARGO_AUDIT_EXECUTABLE, argv: Object.freeze(['--version']) });
}

export function cargoAuditInvocation(subject: CargoAuditSubject): CargoAuditInvocation {
  return Object.freeze({
    command: CARGO_AUDIT_EXECUTABLE,
    argv: Object.freeze(['audit', '--json', '--deny', 'warnings', '--file', subject.lockPath]),
  });
}

/** Refuse wrappers, newer/older tools, banners, or ambiguous multi-line version output. */
export function assertCargoAuditVersion(result: CargoAuditProcessResult): void {
  assertCompleted('cargo-audit version probe', result);
  if (result.exitCode !== 0) refuse(`version probe exited ${result.exitCode}`);
  const expected = `${CARGO_AUDIT_EXECUTABLE} ${CARGO_AUDIT_VERSION}`;
  if (result.stdout.replace(/\r?\n$/u, '') !== expected) {
    refuse(`version mismatch: expected ${CARGO_AUDIT_VERSION}, received ${JSON.stringify(result.stdout.trim())}`);
  }
}

function assertCompleted(label: string, result: CargoAuditProcessResult): void {
  if (result.timedOut) refuse(`${label} exceeded ${CARGO_AUDIT_PROCESS_TIMEOUT_MS}ms`);
  if (result.signal !== null) refuse(`${label} terminated by ${result.signal}`);
}

/** Strict admission of the cargo-audit 0.22.2 rustsec::Report JSON decision fields. */
export function parseCargoAuditReport(value: unknown): CargoAuditReport {
  const root = record(value, 'cargo-audit report');
  exactKeys(root, ['database', 'lockfile', 'settings', 'vulnerabilities', 'warnings'], 'cargo-audit report');

  const database = record(root['database'], 'cargo-audit report.database');
  exactKeys(database, ['advisory-count', 'last-commit', 'last-updated'], 'cargo-audit report.database');
  const advisoryCount = nonNegativeInteger(database['advisory-count'], 'cargo-audit report.database.advisory-count');
  const lastCommit = nullableString(database['last-commit'], 'cargo-audit report.database.last-commit');
  const lastUpdated = nullableString(database['last-updated'], 'cargo-audit report.database.last-updated');
  if (lastUpdated !== null && !Number.isFinite(Date.parse(lastUpdated))) {
    refuse('report.database.last-updated must be an RFC3339 timestamp');
  }

  const lockfile = record(root['lockfile'], 'cargo-audit report.lockfile');
  exactKeys(lockfile, ['dependency-count'], 'cargo-audit report.lockfile');
  const dependencyCount = nonNegativeInteger(
    lockfile['dependency-count'],
    'cargo-audit report.lockfile.dependency-count',
  );

  const settings = record(root['settings'], 'cargo-audit report.settings');
  exactKeys(
    settings,
    ['ignore', 'informational_warnings', 'severity', 'target_arch', 'target_os'],
    'cargo-audit report.settings',
  );
  stringArray(settings['target_arch'], 'cargo-audit report.settings.target_arch');
  stringArray(settings['target_os'], 'cargo-audit report.settings.target_os');
  stringArray(settings['ignore'], 'cargo-audit report.settings.ignore');
  stringArray(settings['informational_warnings'], 'cargo-audit report.settings.informational_warnings');
  if (settings['severity'] !== null && typeof settings['severity'] !== 'string') {
    refuse('report.settings.severity must be null or a string');
  }

  const vulnerabilities = record(root['vulnerabilities'], 'cargo-audit report.vulnerabilities');
  exactKeys(vulnerabilities, ['count', 'found', 'list'], 'cargo-audit report.vulnerabilities');
  if (typeof vulnerabilities['found'] !== 'boolean') {
    refuse('report.vulnerabilities.found must be boolean');
  }
  const count = nonNegativeInteger(vulnerabilities['count'], 'cargo-audit report.vulnerabilities.count');
  if (!Array.isArray(vulnerabilities['list'])) {
    refuse('report.vulnerabilities.list must be an array');
  }
  if (count !== vulnerabilities['list'].length || vulnerabilities['found'] !== count > 0) {
    refuse('report vulnerability count/found/list fields disagree');
  }
  const advisoryIds = vulnerabilities['list'].map((item, index) => {
    const vulnerability = record(item, `cargo-audit report.vulnerabilities.list[${index}]`);
    const advisory = record(vulnerability['advisory'], `cargo-audit report.vulnerabilities.list[${index}].advisory`);
    return nonEmptyString(advisory['id'], `cargo-audit report.vulnerabilities.list[${index}].advisory.id`);
  });

  const warnings = record(root['warnings'], 'cargo-audit report.warnings');
  const warningCounts: Record<string, number> = {};
  for (const kind of Object.keys(warnings).sort(codeUnitCompare)) {
    const items = warnings[kind];
    if (!Array.isArray(items)) refuse(`report.warnings.${kind} must be an array`);
    warningCounts[kind] = items.length;
  }

  return Object.freeze({
    database: Object.freeze({ advisoryCount, lastCommit, lastUpdated }),
    lockfile: Object.freeze({ dependencyCount }),
    vulnerabilities: Object.freeze({
      found: vulnerabilities['found'],
      count,
      advisoryIds: Object.freeze(advisoryIds),
    }),
    warningCounts: Object.freeze(warningCounts),
  });
}

function reportDigest(stdout: string): `sha256:${string}` {
  return `sha256:${createHash('sha256').update(stdout, 'utf8').digest('hex')}`;
}

function fileDigest(repoRoot: string, path: string): `sha256:${string}` {
  return `sha256:${createHash('sha256')
    .update(readFileSync(resolve(repoRoot, path)))
    .digest('hex')}`;
}

function parseResult(subject: CargoAuditSubject, result: CargoAuditProcessResult): CargoAuditReport {
  assertCompleted(`cargo-audit ${subject.lockPath}`, result);
  let value: unknown;
  try {
    value = JSON.parse(result.stdout) as unknown;
  } catch (cause) {
    return refuse(`${subject.lockPath} emitted malformed JSON: ${String(cause)}`);
  }
  let report: CargoAuditReport;
  try {
    report = parseCargoAuditReport(value);
  } catch (cause) {
    return refuse(`${subject.lockPath} emitted a malformed report: ${String(cause)}`);
  }
  if (report.vulnerabilities.found) {
    const ids = report.vulnerabilities.advisoryIds.slice(0, 10).join(', ');
    return refuse(
      `${subject.lockPath} found ${report.vulnerabilities.count} vulnerabilit${report.vulnerabilities.count === 1 ? 'y' : 'ies'}: ${ids}`,
    );
  }
  const warningCount = Object.values(report.warningCounts).reduce((total, countForKind) => total + countForKind, 0);
  if (warningCount > 0) return refuse(`${subject.lockPath} reported ${warningCount} denied warning(s)`);
  if (result.exitCode !== 0) return refuse(`${subject.lockPath} exited ${result.exitCode}`);
  return report;
}

/** Verify the exact tool, audit every derived lockfile, and mint one ordered aggregate receipt. */
export async function runCargoAudit(repoRoot: string, execute: CargoAuditExecutor): Promise<CargoAuditReceipt> {
  const subjects = deriveCargoAuditSubjects(repoRoot);
  const version = cargoAuditVersionInvocation();
  assertCargoAuditVersion(
    await execute(version.command, version.argv, { cwd: repoRoot, timeoutMs: CARGO_AUDIT_PROCESS_TIMEOUT_MS }),
  );

  const receipts: CargoAuditReceipt['subjects'][number][] = [];
  for (const subject of subjects) {
    const invocation = cargoAuditInvocation(subject);
    const manifestSha256 = fileDigest(repoRoot, subject.manifestPath);
    const lockSha256 = fileDigest(repoRoot, subject.lockPath);
    const result = await execute(invocation.command, invocation.argv, {
      cwd: repoRoot,
      timeoutMs: CARGO_AUDIT_PROCESS_TIMEOUT_MS,
    });
    const report = parseResult(subject, result);
    receipts.push(
      Object.freeze({
        manifestPath: subject.manifestPath,
        lockPath: subject.lockPath,
        dependencyCount: report.lockfile.dependencyCount,
        invocation: invocation.argv,
        database: report.database,
        warningCounts: report.warningCounts,
        manifestSha256,
        lockSha256,
        rawReportSha256: reportDigest(result.stdout),
      }),
    );
  }
  return Object.freeze({
    schema: 'liteship/cargo-audit@1',
    tool: Object.freeze({ name: CARGO_AUDIT_EXECUTABLE, version: CARGO_AUDIT_VERSION }),
    subjects: Object.freeze(receipts),
  });
}
