/**
 * Parallel CI setup artifact audit — the fan-out lane must ship everything downstream
 * jobs need from the one-time setup build (dist + capsule manifest + gauntlet context).
 *
 * @module
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ValidationError } from '@liteship/error';
import { describe, expect, it } from 'vitest';
import { workflowJobSections } from '../../../packages/cli/src/internal/workflow-action-pins.js';

const CI_YML = resolve(import.meta.dirname, '../../../.github/workflows/ci.yml');
const RUST_TOOLCHAIN = resolve(import.meta.dirname, '../../../rust-toolchain.toml');

function jobBlock(ci: string, job: string): string {
  const section = workflowJobSections(ci).get(job);
  if (section === undefined) throw ValidationError('ci.yml', `ci.yml must declare job ${job}`);
  return section;
}

function jobRange(ci: string, start: string, endExclusive: string): string {
  const sections = workflowJobSections(ci);
  const jobs = [...sections.keys()];
  const startIndex = jobs.indexOf(start);
  const endIndex = jobs.indexOf(endExclusive);
  if (startIndex === -1) throw ValidationError('ci.yml', `ci.yml must declare range-start job ${start}`);
  if (endIndex === -1) throw ValidationError('ci.yml', `ci.yml must declare range-end job ${endExclusive}`);
  if (endIndex <= startIndex) {
    throw ValidationError('ci.yml', `ci.yml job range ${start}..${endExclusive} must be non-empty and ordered`);
  }
  return jobs
    .slice(startIndex, endIndex)
    .map((job) => {
      const section = sections.get(job);
      if (section === undefined) throw ValidationError('ci.yml', `ci.yml lost previously enumerated job ${job}`);
      return section;
    })
    .join('\n');
}

describe('parallel setup artifact ships dist + capsule manifest', () => {
  const ci = readFileSync(CI_YML, 'utf8');

  it('truth-linux-parallel-setup mints and uploads dist, capsule manifest, and gauntlet context', () => {
    const setupBlock = jobBlock(ci, 'truth-linux-parallel-setup');
    expect(setupBlock).toContain('mint-gauntlet-context.ts');
    expect(setupBlock).toContain('packages/*/dist');
    expect(setupBlock).toContain('reports/capsule-manifest.json');
    expect(setupBlock).toContain('reports/gauntlet-context.json');
  });

  it('parallel fan-out jobs restore setup artifacts at repo root (path: .)', () => {
    const parallelBlock = jobRange(ci, 'truth-linux-parallel-preflight', 'truth-linux-parallel');
    const distDownloads = [...parallelBlock.matchAll(/name: dist-packages[\s\S]*?path: ([^\n]+)/g)];
    expect(distDownloads.length).toBeGreaterThan(0);
    for (const match of distDownloads) {
      expect(match[1]?.trim(), 'dist-packages must land at repo root for reports/ + packages/').toBe('.');
    }
  });

  it('shard coverage upload preserves node-shard-<n> directory layout', () => {
    expect(ci).toContain('ci-artifacts/coverage/node-shard-${{ matrix.shard }}');
    expect(ci).toContain('path: ci-artifacts/coverage');
  });

  it('browser coverage download lands under coverage/browser/', () => {
    expect(ci).toContain('name: coverage-browser-parallel');
    expect(ci).toMatch(/name: coverage-browser-parallel[\s\S]*?path: coverage\/browser/);
  });

  it('bench lane installs wasm32 rust toolchain before build:wasm', () => {
    const channel = readFileSync(RUST_TOOLCHAIN, 'utf8').match(/^channel\s*=\s*"([^"]+)"/m)?.[1];
    expect(channel).toBeDefined();
    const benchBlock = jobBlock(ci, 'truth-linux-parallel-bench');
    expect(benchBlock).toContain('dtolnay/rust-toolchain@');
    expect(benchBlock).toContain(`toolchain: ${channel}`);
    expect(benchBlock).toContain('targets: wasm32-unknown-unknown');
    expect(benchBlock).toContain('pnpm run build:wasm');
  });

  it('bench lane uploads benchmarks for ci-parallel-final', () => {
    expect(ci).toContain('name: benchmarks-parallel');
    expect(ci).toMatch(/name: benchmarks-parallel[\s\S]*?path: benchmarks/);
  });

  it('consumer lane retains reproducibility and one-install cost evidence even when the gate fails', () => {
    const consumerBlock = jobBlock(ci, 'truth-linux-parallel-consumer');
    expect(consumerBlock).toContain('if: always()');
    expect(consumerBlock).toContain('name: consumer-evidence');
    expect(consumerBlock).toContain('benchmarks/reproducibility-report.json');
    expect(consumerBlock).toContain('benchmarks/one-install-cost-report.json');
  });

  it('persists mutation and MC/DC receipts and re-admits both in an independent job', () => {
    const mutationBlock = jobRange(ci, 'exhaustive-mutation', 'exhaustive-mcdc');
    const mcdcBlock = jobRange(ci, 'exhaustive-mcdc', 'semantic-assurance-admission');
    const admissionBlock = jobRange(ci, 'semantic-assurance-admission', 'ci-summary');

    expect(mutationBlock).toContain('reports/semantic-assurance-mutation.json');
    expect(mutationBlock).toContain('if-no-files-found: error');
    expect(mcdcBlock).toContain('reports/semantic-assurance-mcdc.json');
    expect(mcdcBlock).toContain('if-no-files-found: error');
    expect(admissionBlock).toContain('semantic-assurance-mutation-${{ github.run_attempt }}');
    expect(admissionBlock).toContain('semantic-assurance-mcdc-${{ github.run_attempt }}');
    expect(admissionBlock).toContain('pnpm run assurance:gate');
    expect(admissionBlock).toContain('reports/assurance-inventory.json');
  });

  it('a renamed job is a failure, not a whole-file block that passes every containment assertion', () => {
    expect(() => jobBlock(ci, 'no-such-job')).toThrow(/must declare job no-such-job/u);
    expect(() => jobRange(ci, 'truth-linux-parallel-setup', 'truth-linux-parallel-setup')).toThrow(/non-empty/u);
    expect(() => jobRange(ci, 'truth-linux-parallel-bench', 'truth-linux-parallel-setup')).toThrow(/ordered/u);
  });
});
