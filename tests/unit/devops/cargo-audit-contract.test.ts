import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { workflowJobSections } from '../../../packages/cli/src/internal/workflow-action-pins.js';
import {
  CARGO_AUDIT_PROCESS_TIMEOUT_MS,
  CARGO_AUDIT_VERSION,
  deriveCargoAuditSubjects,
  parseCargoAuditReport,
  runCargoAudit,
  type CargoAuditExecutor,
  type CargoAuditProcessResult,
} from '../../../scripts/lib/cargo-audit-contract.js';

const ROOT = resolve(import.meta.dirname, '../../..');

const CLEAN_REPORT = Object.freeze({
  database: {
    'advisory-count': 800,
    'last-commit': 'a'.repeat(40),
    'last-updated': '2026-08-02T12:00:00Z',
  },
  lockfile: { 'dependency-count': 2 },
  settings: {
    target_arch: [],
    target_os: [],
    severity: null,
    ignore: [],
    informational_warnings: ['unmaintained'],
  },
  vulnerabilities: { found: false, count: 0, list: [] },
  warnings: {},
});

function processResult(
  stdout: string,
  overrides: Partial<Pick<CargoAuditProcessResult, 'exitCode' | 'stderr' | 'signal' | 'timedOut'>> = {},
): CargoAuditProcessResult {
  return {
    exitCode: 0,
    stdout,
    stderr: '',
    signal: null,
    timedOut: false,
    ...overrides,
  };
}

function writeCrate(root: string, directory: string): void {
  const crateRoot = resolve(root, 'crates', directory);
  mkdirSync(resolve(crateRoot, 'src'), { recursive: true });
  writeFileSync(
    resolve(crateRoot, 'Cargo.toml'),
    `[package]\nname = "${directory}"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]\n\n[features]\ndefault = []\n`,
    'utf8',
  );
  writeFileSync(
    resolve(crateRoot, 'Cargo.lock'),
    `version = 4\n\n[[package]]\nname = "${directory}"\nversion = "0.1.0"\n`,
    'utf8',
  );
  writeFileSync(resolve(crateRoot, 'src/lib.rs'), '#![no_std]\n', 'utf8');
}

function sha256(value: string | Buffer): `sha256:${string}` {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

describe('check/cargo-audit executable contract', () => {
  it('derives every crates/* manifest and refuses an absent adjacent lockfile', () => {
    expect(deriveCargoAuditSubjects(ROOT)).toEqual([
      {
        manifestPath: 'crates/liteship-compute/Cargo.toml',
        lockPath: 'crates/liteship-compute/Cargo.lock',
      },
    ]);

    const root = mkdtempSync(resolve(tmpdir(), 'liteship-cargo-audit-census-'));
    try {
      writeCrate(root, 'alpha');
      writeCrate(root, 'hidden');
      expect(deriveCargoAuditSubjects(root).map((subject) => subject.manifestPath)).toEqual([
        'crates/alpha/Cargo.toml',
        'crates/hidden/Cargo.toml',
      ]);
      rmSync(resolve(root, 'crates/hidden/Cargo.lock'));
      expect(() => deriveCargoAuditSubjects(root)).toThrow('crates/hidden/Cargo.toml has no adjacent Cargo.lock');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('verifies the exact static tool version before shell-free exact-argv audits and mints an ordered receipt', async () => {
    const calls: { command: string; argv: readonly string[]; cwd: string; timeoutMs: number }[] = [];
    const execute: CargoAuditExecutor = async (command, argv, options) => {
      calls.push({ command, argv, ...options });
      return calls.length === 1
        ? processResult(`cargo-audit ${CARGO_AUDIT_VERSION}\n`)
        : processResult(`${JSON.stringify(CLEAN_REPORT)}\n`);
    };

    const receipt = await runCargoAudit(ROOT, execute);
    expect(calls).toEqual([
      {
        command: 'cargo-audit',
        argv: ['--version'],
        cwd: ROOT,
        timeoutMs: CARGO_AUDIT_PROCESS_TIMEOUT_MS,
      },
      {
        command: 'cargo-audit',
        argv: ['audit', '--json', '--deny', 'warnings', '--file', 'crates/liteship-compute/Cargo.lock'],
        cwd: ROOT,
        timeoutMs: CARGO_AUDIT_PROCESS_TIMEOUT_MS,
      },
    ]);
    expect(receipt).toMatchObject({
      schema: 'liteship/cargo-audit@1',
      tool: { name: 'cargo-audit', version: '0.22.2' },
      subjects: [
        {
          manifestPath: 'crates/liteship-compute/Cargo.toml',
          lockPath: 'crates/liteship-compute/Cargo.lock',
          dependencyCount: 2,
          invocation: ['audit', '--json', '--deny', 'warnings', '--file', 'crates/liteship-compute/Cargo.lock'],
          warningCounts: {},
        },
      ],
    });
    expect(receipt.subjects[0]?.manifestSha256).toBe(
      sha256(readFileSync(resolve(ROOT, 'crates/liteship-compute/Cargo.toml'))),
    );
    expect(receipt.subjects[0]?.lockSha256).toBe(
      sha256(readFileSync(resolve(ROOT, 'crates/liteship-compute/Cargo.lock'))),
    );
    expect(receipt.subjects[0]?.rawReportSha256).toBe(sha256(`${JSON.stringify(CLEAN_REPORT)}\n`));
  });

  it('stops at the version probe when the installed tool is stale', async () => {
    let calls = 0;
    await expect(
      runCargoAudit(ROOT, async () => {
        calls += 1;
        return processResult('cargo-audit 0.22.1\n');
      }),
    ).rejects.toThrow('version mismatch: expected 0.22.2, received "cargo-audit 0.22.1"');
    expect(calls).toBe(1);
  });

  it.each([
    ['malformed JSON', processResult('{'), /emitted malformed JSON/u],
    ['malformed decision fields', processResult(JSON.stringify({})), /emitted a malformed report/u],
    ['nonzero clean result', processResult(JSON.stringify(CLEAN_REPORT), { exitCode: 2 }), /exited 2/u],
    [
      'positive advisory result',
      processResult(
        JSON.stringify({
          ...CLEAN_REPORT,
          vulnerabilities: {
            found: true,
            count: 1,
            list: [{ advisory: { id: 'RUSTSEC-2026-9999' } }],
          },
        }),
      ),
      /found 1 vulnerability: RUSTSEC-2026-9999/u,
    ],
    [
      'informational warning result',
      processResult(
        JSON.stringify({
          ...CLEAN_REPORT,
          warnings: { unmaintained: [{}] },
        }),
      ),
      /reported 1 denied warning/u,
    ],
  ])('refuses a %s', async (_label, auditResult, expected) => {
    let calls = 0;
    const execute: CargoAuditExecutor = async () => {
      calls += 1;
      return calls === 1 ? processResult('cargo-audit 0.22.2\n') : auditResult;
    };
    await expect(runCargoAudit(ROOT, execute)).rejects.toThrow(expected);
  });

  it('refuses internally contradictory advisory fields', () => {
    expect(() =>
      parseCargoAuditReport({
        ...CLEAN_REPORT,
        vulnerabilities: { found: false, count: 1, list: [] },
      }),
    ).toThrow('vulnerability count/found/list fields disagree');
  });

  it('pins a checksum-verified no-fallback installer in the existing security authority without a package dependency', () => {
    const workflow = readFileSync(resolve(ROOT, '.github/workflows/ci.yml'), 'utf8');
    const security = workflowJobSections(workflow).get('security-audit');
    expect(security).toContain(
      `uses: taiki-e/install-action@67729d5c413db75907f0ad1e39bb04b9c868ff60\n        with:\n          tool: cargo-audit@${CARGO_AUDIT_VERSION}\n          fallback: none\n          checksum: true`,
    );
    expect(security).toContain('specializedChecks.cargoAudit.command');
    const packageJson = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    expect(packageJson.dependencies?.['cargo-audit']).toBeUndefined();
    expect(packageJson.devDependencies?.['cargo-audit']).toBeUndefined();
  });
});
