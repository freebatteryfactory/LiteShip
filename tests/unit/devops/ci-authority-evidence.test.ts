import { describe, expect, it } from 'vitest';
import { buildCiAuthorityEvidence, parseCiAuthorityEvidence } from '../../../scripts/lib/ci-authority-evidence.js';

const identity = {
  repository: 'freebatteryfactory/LiteShip',
  workflow: 'CI',
  runId: '42',
  runAttempt: '1',
  event: 'push',
  ref: 'refs/heads/main',
  headSha: 'a'.repeat(40),
};
const job = (name: string, conclusion: string | null = 'success') => ({
  name,
  conclusion,
  startedAt: '2026-07-24T12:00:00.000Z',
  completedAt: '2026-07-24T12:00:01.000Z',
  runAttempt: 1,
});

describe('CI authority evidence', () => {
  it('accepts only when every required matrix instance succeeded', () => {
    const evidence = buildCiAuthorityEvidence({
      identity,
      requiredJobs: ['browser-e2e', 'windows-smoke'],
      jobs: [
        job('browser-e2e (chromium)'),
        job('browser-e2e (firefox)'),
        job('browser-e2e (webkit)'),
        job('windows-smoke'),
      ],
    });
    expect(evidence.verdict).toBe('accepted');
    expect(parseCiAuthorityEvidence(JSON.parse(JSON.stringify(evidence)))).toEqual(evidence);
  });

  it('rejects missing, skipped, and failed authority without averaging it away', () => {
    const evidence = buildCiAuthorityEvidence({
      identity,
      requiredJobs: ['browser-e2e', 'windows-smoke', 'rust-wasm-parity'],
      jobs: [job('browser-e2e (chromium)'), job('browser-e2e (webkit)', 'failure'), job('windows-smoke', 'skipped')],
    });
    expect(evidence.verdict).toBe('rejected');
    expect(evidence.findings).toEqual([
      'browser-e2e (webkit): failure',
      'rust-wasm-parity: missing',
      'windows-smoke: skipped',
    ]);
  });

  it('rejects a forged accepted verdict', () => {
    const evidence = buildCiAuthorityEvidence({
      identity,
      requiredJobs: ['windows-smoke'],
      jobs: [job('windows-smoke', 'failure')],
    });
    expect(() => parseCiAuthorityEvidence({ ...evidence, verdict: 'accepted' })).toThrow(/identity or verdict/u);
    expect(() => parseCiAuthorityEvidence({ ...evidence, foreign: true })).toThrow(/keys must be exactly/u);
    expect(() =>
      buildCiAuthorityEvidence({
        identity,
        requiredJobs: ['windows-smoke'],
        jobs: [job('windows-smoke'), job('windows-smoke')],
      }),
    ).toThrow(/duplicate CI authority job attempt/u);
  });
});
