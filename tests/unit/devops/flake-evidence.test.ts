import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertFlakeEvidenceCurrent,
  buildFlakeEvidence,
  parseFlakeEvidence,
  serializeFlakeEvidence,
} from '../../../scripts/lib/flake-evidence.js';
import { runFlakeCampaign, writeFlakeEvidenceFile } from '../../../scripts/test-flake.js';
import type { FlakeTarget } from '../../../scripts/test-flake-targets.js';

const SHA = 'a'.repeat(40);
const TARGET: FlakeTarget = {
  path: 'tests/unit/example.test.ts',
  kind: 'node',
  owner: 'packages/example/src',
  provingScar: 'a planted runtime timing failure must remain visible after a passing retry',
  remediation: 'repair the runtime owner and rerun the exact target',
};

const observations = (codes: readonly number[]) =>
  codes.map((exitCode, index) => ({
    target: TARGET.path,
    iteration: index + 1,
    verdict: exitCode === 0 ? ('pass' as const) : ('fail' as const),
    exitCode,
  }));

const build = (codes: readonly number[] = [0, 0, 0]) =>
  buildFlakeEvidence({
    targets: [TARGET],
    observations: observations(codes),
    firstSha: SHA,
    lastSha: SHA,
    observedOn: '2026-07-24',
    expires: '2026-07-31',
  });

describe('flake evidence', () => {
  it('is deterministic, addressed, and names the owner, reproducer, scar, rate, and remediation', () => {
    const first = build();
    const second = build();
    expect(second).toEqual(first);
    expect(first.evidenceId).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(first.targets[0]).toMatchObject({
      owner: TARGET.owner,
      provingScar: TARGET.provingScar,
      remediation: TARGET.remediation,
      reproducer: ['pnpm', 'exec', 'vitest', 'run', '--config', 'vitest.config.ts', TARGET.path],
      observedFailureRate: 0,
    });
    expect(parseFlakeEvidence(JSON.parse(JSON.stringify(first)) as unknown)).toEqual(first);
  });

  it('keeps a campaign failed when a later planned attempt passes', async () => {
    const results = [1, 0, 0];
    let headReads = 0;
    const evidence = await runFlakeCampaign({
      cwd: process.cwd(),
      targets: [TARGET],
      repetitions: results.length,
      run: async () => ({ code: results.shift()!, stdout: '', stderr: '' }),
      assertPath: async () => undefined,
      readHead: async () => {
        headReads += 1;
        return SHA;
      },
      observedOn: '2026-07-24',
      expires: '2026-07-31',
      log: () => undefined,
      writeFailure: () => undefined,
    });
    expect(headReads).toBe(2);
    expect(evidence).toMatchObject({ verdict: 'fail', failures: 1, attempts: 3, recoveredRetries: 2 });
    expect(evidence.observedFailureRate).toBe(1 / 3);
  });

  it('refuses malformed, stale, expired, and foreign records', () => {
    const evidence = build();
    expect(() => parseFlakeEvidence({ ...evidence, failures: 1 })).toThrow(/stale|digest/u);
    expect(() => parseFlakeEvidence({ ...evidence, unexpected: true })).toThrow(/envelope/u);
    expect(() =>
      assertFlakeEvidenceCurrent(evidence, { headSha: 'b'.repeat(40), targets: [TARGET], today: '2026-07-24' }),
    ).toThrow(/foreign checkout/u);
    expect(() =>
      assertFlakeEvidenceCurrent(evidence, {
        headSha: SHA,
        targets: [{ ...TARGET, remediation: 'different target contract' }],
        today: '2026-07-24',
      }),
    ).toThrow(/stale for the flake target catalog/u);
    expect(() =>
      assertFlakeEvidenceCurrent(evidence, { headSha: SHA, targets: [TARGET], today: '2026-08-01' }),
    ).toThrow(/expired/u);
  });

  it('canonically serializes and atomically admits the persisted record', () => {
    const directory = mkdtempSync(join(tmpdir(), 'liteship-flake-evidence-'));
    try {
      const path = join(directory, 'flake-evidence.json');
      const evidence = build();
      const serialized = serializeFlakeEvidence(evidence);
      expect(serialized.endsWith('\n')).toBe(true);
      expect(parseFlakeEvidence(JSON.parse(serialized) as unknown)).toEqual(evidence);
      expect(writeFlakeEvidenceFile(path, evidence)).toEqual(evidence);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
