import { describe, expect, it } from 'vitest';
import { requiredAuthorityJobs } from '../../../scripts/lib/ci-authority.js';

describe('CI authority requirements', () => {
  it('selects only the addressed PR closure and conditionally requires browser authority', () => {
    expect(
      requiredAuthorityJobs({
        event: 'pull_request',
        ref: 'refs/pull/161/merge',
        browserAffected: false,
        rustWasmAffected: false,
      }),
    ).toEqual(['format', 'pr-affected', 'pr-windows-affected']);
    expect(
      requiredAuthorityJobs({
        event: 'pull_request',
        ref: 'refs/pull/161/merge',
        browserAffected: true,
        rustWasmAffected: false,
      }),
    ).toContain('pr-browser-affected');
  });

  it('requires Rust/WASM authority for a pull request that changes the kernel', () => {
    expect(
      requiredAuthorityJobs({
        event: 'pull_request',
        ref: 'refs/pull/161/merge',
        browserAffected: false,
        rustWasmAffected: true,
      }),
    ).toContain('rust-wasm-parity');
  });

  it('requires parallel release, browser, Windows, and Rust/WASM authority on pushes', () => {
    expect(requiredAuthorityJobs({ event: 'push', ref: 'refs/heads/main', browserAffected: false, rustWasmAffected: false })).toEqual([
      'browser-e2e',
      'format',
      'rust-wasm-parity',
      'truth-linux-parallel',
      'windows-smoke',
    ]);
  });

  it('requires serial and exhaustive authority for manual/nightly runs and tags', () => {
    expect(requiredAuthorityJobs({ event: 'schedule', ref: 'refs/heads/main', browserAffected: false, rustWasmAffected: false })).toContain(
      'truth-linux',
    );
    const tag = requiredAuthorityJobs({ event: 'workflow_call', ref: 'refs/tags/v0.19.0', browserAffected: false, rustWasmAffected: false });
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
});
