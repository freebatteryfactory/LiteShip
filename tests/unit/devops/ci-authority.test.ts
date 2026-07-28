import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { requiredAuthorityJobs } from '../../../scripts/lib/ci-authority.js';

const README = readFileSync(resolve(import.meta.dirname, '../../..', 'README.md'), 'utf8');
const SUPPORT_MATRIX = README.slice(README.indexOf('## Support matrix'), README.indexOf('## Documentation'));

describe('CI authority requirements', () => {
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
    expect(
      push,
    ).toEqual([
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
        'exhaustive-mutation',
        'exhaustive-mcdc',
        'semantic-assurance-admission',
      ]),
    );
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
