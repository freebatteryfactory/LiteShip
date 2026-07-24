import { describe, expect, it } from 'vitest';
import { CHECK_REGISTRY } from '@liteship/command';
import { projectCheckEvidenceRequirements } from '../../../packages/command/src/checks/evidence-requirements.js';
import {
  buildCheckExecutionEvidence,
  parseCheckExecutionEvidence,
  serializeCheckExecutionEvidence,
} from '../../../scripts/lib/check-execution-evidence.js';

const requirement = projectCheckEvidenceRequirements(CHECK_REGISTRY).find(
  (candidate) => candidate.checkId === 'check/typecheck',
)!;
const identity = {
  repository: 'freebatteryfactory/LiteShip',
  workflow: 'CI',
  runId: '123',
  runAttempt: '1',
};
const job = {
  name: 'truth-linux-parallel-preflight',
  conclusion: 'success',
  startedAt: '2026-07-24T12:00:00.000Z',
  completedAt: '2026-07-24T12:00:02.000Z',
  runAttempt: 1,
};

describe('check execution evidence', () => {
  it('addresses the exact registry command and observed GitHub job result', () => {
    const evidence = buildCheckExecutionEvidence({
      requirement,
      headSha: 'a'.repeat(40),
      planId: `sha256:${'b'.repeat(64)}`,
      identity,
      jobs: [job],
      platforms: ['linux'],
    });
    expect(evidence.evidenceId).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(evidence.producer.command).toBe(requirement.command);
    expect(evidence.result).toEqual({ verdict: 'pass', durationMs: 2_000, cacheHit: false, findings: [] });
    expect(parseCheckExecutionEvidence(JSON.parse(serializeCheckExecutionEvidence(evidence)))).toEqual(evidence);
    expect(Object.isFrozen(evidence.producer.jobs)).toBe(true);
  });

  it('fails closed when any required matrix job did not succeed', () => {
    const evidence = buildCheckExecutionEvidence({
      requirement,
      headSha: 'a'.repeat(40),
      planId: `sha256:${'b'.repeat(64)}`,
      identity,
      jobs: [job, { ...job, name: 'windows-smoke', conclusion: 'failure' }],
      platforms: ['linux', 'win32'],
    });
    expect(evidence.result.verdict).toBe('fail');
    expect(evidence.result.findings).toEqual(['windows-smoke: failure']);
  });

  it('rejects forged results, identities, empty jobs, and duplicate job attempts', () => {
    const evidence = buildCheckExecutionEvidence({
      requirement,
      headSha: 'a'.repeat(40),
      planId: `sha256:${'b'.repeat(64)}`,
      identity,
      jobs: [job],
      platforms: ['linux'],
    });
    expect(() => parseCheckExecutionEvidence({ ...evidence, result: { ...evidence.result, verdict: 'fail' } })).toThrow(
      /identity or result/u,
    );
    expect(() =>
      buildCheckExecutionEvidence({
        requirement,
        headSha: 'a'.repeat(40),
        planId: `sha256:${'b'.repeat(64)}`,
        identity: { ...identity, repository: '' },
        jobs: [job],
        platforms: ['linux'],
      }),
    ).toThrow(/repository/u);
    expect(() =>
      buildCheckExecutionEvidence({
        requirement,
        headSha: 'a'.repeat(40),
        planId: `sha256:${'b'.repeat(64)}`,
        identity,
        jobs: [],
        platforms: ['linux'],
      }),
    ).toThrow(/at least one/u);
    expect(() =>
      buildCheckExecutionEvidence({
        requirement,
        headSha: 'a'.repeat(40),
        planId: `sha256:${'b'.repeat(64)}`,
        identity,
        jobs: [job, job],
        platforms: ['linux'],
      }),
    ).toThrow(/duplicate observed job/u);
  });
});
