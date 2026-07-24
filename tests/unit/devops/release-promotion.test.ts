import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHECK_REGISTRY } from '@liteship/command';
import { scanWorkflowActionPins } from '../../../packages/cli/src/lib/workflow-action-pins.js';

const release = readFileSync('.github/workflows/release.yml', 'utf8');
const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
const rootManifest = JSON.parse(readFileSync('package.json', 'utf8')) as {
  readonly scripts: Readonly<Record<string, string>>;
};

function job(name: string, next?: string): string {
  const start = release.indexOf(`  ${name}:`);
  if (start < 0) throw new Error(`missing release job ${name}`);
  const end = next === undefined ? release.length : release.indexOf(`  ${next}:`, start + 1);
  if (end < 0) throw new Error(`missing release job ${next}`);
  return release.slice(start, end);
}

describe('build once, verify once, promote exact artifacts', () => {
  it('the certification job owns the one frozen build, WASM stage, pack, proofs, and attestation', () => {
    const certified = job('release-certified', 'publish');
    expect(certified.match(/pnpm run build(?:\s|$)/g)).toHaveLength(1);
    expect(certified).toContain('pnpm run build:wasm');
    expect(certified).toContain('scripts/build-release-artifacts.ts release-artifacts/tarballs');
    expect(certified).toContain('LITESHIP_RELEASE_ARTIFACT_DIR: release-artifacts/tarballs');
    expect(certified).toContain('pnpm run test:journey');
    expect(certified).toContain('package-smoke --hermetic');
    expect(certified).toContain('--artifact-dir release-artifacts/tarballs');
    expect(certified).toContain('actions/attest-build-provenance@43d14bc2b83dec42d39ecae14e916627a18bb661');
  });

  it('publish downloads, attestation-verifies, and ships the exact bundle without build or pack', () => {
    const publish = job('publish');
    expect(publish).toContain('name: frozen-release-artifacts');
    expect(publish).toContain('gh attestation verify');
    expect(publish).toContain('--artifact-dir release-artifacts/tarballs');
    expect(publish).not.toMatch(/pnpm run build(?:\s|$)/);
    expect(publish).not.toMatch(/pnpm\s+pack/);
  });

  it('every external action in CI and release is immutable-SHA pinned', () => {
    expect(scanWorkflowActionPins(ci)).toEqual([]);
    expect(scanWorkflowActionPins(release)).toEqual([]);
  });

  it('keeps package smoke build-free after the explicit workspace-build prerequisite', () => {
    expect(rootManifest.scripts['package:smoke']).toBe('node packages/liteship/bin/liteship.mjs package-smoke');
    expect(rootManifest.scripts['package:smoke:hermetic']).toBe(
      'node packages/liteship/bin/liteship.mjs package-smoke --hermetic',
    );
    expect(CHECK_REGISTRY.find((check) => check.id === 'check/package-smoke')?.command).toBe('pnpm run package:smoke');
    expect(CHECK_REGISTRY.find((check) => check.id === 'check/hermetic')?.command).toBe(
      'pnpm run package:smoke:hermetic',
    );
    expect(ci).not.toContain('pnpm run package:smoke');
  });
});
