import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ciAuthorityWorkflowParityViolations,
  ciSummaryAuthorityParityViolations,
  requiredAuthorityJobs,
} from '../../../scripts/lib/ci-authority.js';
import { jobNameMatches } from '../../../scripts/lib/ci-evidence-selection.js';

const README = readFileSync(resolve(import.meta.dirname, '../../..', 'README.md'), 'utf8');
const SUPPORT_MATRIX = README.slice(README.indexOf('## Support matrix'), README.indexOf('## Documentation'));
const CI_YML = readFileSync(resolve(import.meta.dirname, '../../..', '.github/workflows/ci.yml'), 'utf8');

describe('CI authority requirements', () => {
  it('the final shell fold and evidence authority require the same jobs for every event', () => {
    const cases = [
      { event: 'pull_request', ref: 'refs/pull/197/merge', browserAffected: false, rustWasmAffected: false },
      { event: 'pull_request', ref: 'refs/pull/197/merge', browserAffected: true, rustWasmAffected: true },
      { event: 'push', ref: 'refs/heads/main', browserAffected: false, rustWasmAffected: false },
      { event: 'schedule', ref: 'refs/heads/main', browserAffected: false, rustWasmAffected: false },
      { event: 'workflow_dispatch', ref: 'refs/heads/main', browserAffected: false, rustWasmAffected: false },
      { event: 'workflow_call', ref: 'refs/heads/main', browserAffected: false, rustWasmAffected: false },
      { event: 'workflow_call', ref: 'refs/tags/v0.19.0', browserAffected: false, rustWasmAffected: false },
    ] as const;
    for (const input of cases) {
      expect(ciAuthorityWorkflowParityViolations(CI_YML, input), `${input.event} ${input.ref}`).toEqual([]);
    }
  });

  it('reports an authority omitted by a synthetic summary fold', () => {
    const jobs = [
      'browser-e2e',
      'format',
      'macos-browser',
      'macos-smoke',
      'rust-wasm-parity',
      'security-audit',
      'truth-linux-parallel',
      // `windows-smoke` deliberately omitted: this is the synthetic tooth.
      'evidence-admission',
    ] as const;
    const env = jobs.map((job, index) => `          JOB_${index}: \${{ needs.${job}.result }}`).join('\n');
    const tests = jobs.map((_job, index) => `          test "$JOB_${index}" = "success"`).join('\n');
    const workflow = `jobs:\n  ci-summary:\n    steps:\n      - name: fold\n        env:\n${env}\n        run: |\n${tests}\n`;
    expect(
      ciSummaryAuthorityParityViolations(workflow, {
        event: 'push',
        ref: 'refs/heads/main',
        browserAffected: false,
        rustWasmAffected: false,
      }),
    ).toEqual(['ci-summary is missing required authority windows-smoke']);
  });

  it('requires the full release candidate on every PR while retaining affected fast feedback', () => {
    expect(
      requiredAuthorityJobs({
        event: 'pull_request',
        ref: 'refs/pull/161/merge',
        browserAffected: false,
        rustWasmAffected: false,
      }),
    ).toEqual([
      'browser-e2e',
      'format',
      'macos-browser',
      'macos-smoke',
      'pr-affected',
      'pr-affected-evidence',
      'pr-windows-affected',
      'rust-wasm-parity',
      'security-audit',
      'truth-linux-parallel',
      'windows-smoke',
    ]);
    expect(
      requiredAuthorityJobs({
        event: 'pull_request',
        ref: 'refs/pull/161/merge',
        browserAffected: true,
        rustWasmAffected: false,
      }),
    ).toContain('pr-browser-affected');
  });

  it('requires Rust/WASM for every release candidate and affected browser feedback only when selected', () => {
    expect(
      requiredAuthorityJobs({
        event: 'pull_request',
        ref: 'refs/pull/161/merge',
        browserAffected: true,
        rustWasmAffected: true,
      }),
    ).toEqual(
      expect.arrayContaining(['rust-wasm-parity', 'truth-linux-parallel', 'browser-e2e', 'pr-browser-affected']),
    );
  });

  it('requires the same full candidate authority on pushes and pull requests', () => {
    const pullRequest = requiredAuthorityJobs({
      event: 'pull_request',
      ref: 'refs/pull/161/merge',
      browserAffected: false,
      rustWasmAffected: false,
    }).filter((job) => !job.startsWith('pr-'));
    const push = requiredAuthorityJobs({
      event: 'push',
      ref: 'refs/heads/main',
      browserAffected: false,
      rustWasmAffected: false,
    });
    expect(pullRequest).toEqual(push);
    expect(push).toEqual([
      'browser-e2e',
      'format',
      'macos-browser',
      'macos-smoke',
      'rust-wasm-parity',
      'security-audit',
      'truth-linux-parallel',
      'windows-smoke',
    ]);
  });

  it('requires serial and exhaustive authority for manual/nightly runs and tags', () => {
    expect(
      requiredAuthorityJobs({
        event: 'schedule',
        ref: 'refs/heads/main',
        browserAffected: false,
        rustWasmAffected: false,
      }),
    ).toContain('truth-linux');
    const tag = requiredAuthorityJobs({
      event: 'workflow_call',
      ref: 'refs/tags/v0.19.0',
      browserAffected: false,
      rustWasmAffected: false,
    });
    expect(tag).toContain('truth-linux-parallel');
    expect(tag).toEqual(
      expect.arrayContaining([
        'exhaustive-analysis',
        'exhaustive-mutation-fold',
        'exhaustive-mcdc-fold',
        'semantic-assurance-admission',
      ]),
    );
  });

  it('no exhaustive authority id ever matches a matrix shard job (PR #195 review, confirmed P1)', () => {
    // Shards are builders whose red is EXPECTED while the verdict bank
    // converges — the fold jobs re-earn the full census and carry the sole
    // authority. A required id that jobNameMatches `exhaustive-mutation (3)`
    // rejects delivery evidence on every convergence run even when both
    // folds succeed.
    const events = [
      { event: 'schedule', ref: 'refs/heads/main' },
      { event: 'workflow_dispatch', ref: 'refs/heads/main' },
      { event: 'workflow_call', ref: 'refs/tags/v0.19.0' },
    ] as const;
    for (const { event, ref } of events) {
      const required = requiredAuthorityJobs({ event, ref, browserAffected: false, rustWasmAffected: false });
      expect(required).toContain('exhaustive-mutation-fold');
      expect(required).toContain('exhaustive-mcdc-fold');
      for (const shard of [0, 1, 2, 3, 4, 5]) {
        for (const mode of ['mutation', 'mcdc']) {
          const shardJob = `exhaustive-${mode} (${shard})`;
          expect(
            required.some((id) => jobNameMatches(shardJob, id)),
            `${event}: authority id matches convergence shard ${shardJob}`,
          ).toBe(false);
        }
      }
    }
  });

  it('keeps the public support matrix aligned with event-specific authority jobs', () => {
    const matrices = [
      requiredAuthorityJobs({
        event: 'pull_request',
        ref: 'refs/pull/161/merge',
        browserAffected: true,
        rustWasmAffected: true,
      }),
      requiredAuthorityJobs({ event: 'push', ref: 'refs/heads/main', browserAffected: false, rustWasmAffected: false }),
      requiredAuthorityJobs({
        event: 'schedule',
        ref: 'refs/heads/main',
        browserAffected: false,
        rustWasmAffected: false,
      }),
    ];
    for (const job of new Set(matrices.flat())) {
      expect(SUPPORT_MATRIX, `README support matrix omitted CI authority job ${job}`).toContain(`\`${job}\``);
    }
    expect(SUPPORT_MATRIX).toContain('Every push and pull request runs the full release candidate');
    expect(SUPPORT_MATRIX).toContain('`macos-smoke` and `macos-browser`');
  });
});
