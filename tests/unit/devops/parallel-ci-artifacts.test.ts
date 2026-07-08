/**
 * Parallel CI setup artifact audit — the fan-out lane must ship everything downstream
 * jobs need from the one-time setup build (dist + capsule manifest).
 *
 * @module
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const CI_YML = resolve(import.meta.dirname, '../../../.github/workflows/ci.yml');

describe('parallel setup artifact ships dist + capsule manifest', () => {
  const ci = readFileSync(CI_YML, 'utf8');

  it('truth-linux-parallel-setup uploads packages/*/dist and reports/capsule-manifest.json', () => {
    const setupBlock = ci.slice(ci.indexOf('truth-linux-parallel-setup:'), ci.indexOf('truth-linux-parallel-preflight:'));
    expect(setupBlock).toContain('packages/*/dist');
    expect(setupBlock).toContain('reports/capsule-manifest.json');
  });

  it('parallel fan-out jobs restore setup artifacts at repo root (path: .)', () => {
    const parallelBlock = ci.slice(ci.indexOf('truth-linux-parallel-preflight:'), ci.indexOf('truth-linux-parallel:'));
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

  it('bench lane uploads benchmarks for ci-parallel-final', () => {
    expect(ci).toContain('name: benchmarks-parallel');
    expect(ci).toMatch(/name: benchmarks-parallel[\s\S]*?path: benchmarks/);
  });
});
