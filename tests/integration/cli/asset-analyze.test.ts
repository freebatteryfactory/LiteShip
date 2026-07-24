import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { scaledTimeout } from '../../../vitest.shared.js';
import { run } from '@liteship/cli';
import { captureCli } from './capture.js';
import { compileManifestOnly, type IsolatedCapsules } from '../../setup/isolated-capsules.js';

describe('liteship asset analyze', () => {
  // capsule:compile is type-directed and can run ~5s cold. Hoist it once for the
  // whole file: every test below needs the intro-bed capsule in the manifest.
  // Manifest-only + temp manifest (CUT T1) so this never writes — or races —
  // the shared reports/capsule-manifest.json or tests/generated/ dir.
  let iso: IsolatedCapsules;
  beforeAll(async () => {
    iso = await compileManifestOnly('liteship-asset-analyze');
  }, scaledTimeout(120_000));
  afterAll(() => iso?.restore());

  it('runs beat projection on intro-bed and emits markerCount', async () => {
    // Task 5 registered WavMetadataProjection('intro-bed') alongside the
    // existing defineAsset entry, so the manifest is guaranteed to contain
    // intro-bed — a non-zero exit here is a real regression.
    const { exit, stdout } = await captureCli(() =>
      run(['asset', 'analyze', 'intro-bed', '--projection=beat']),
    );
    expect(exit).toBe(0);
    const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
    expect(receipt.projection).toBe('beat');
    expect(typeof receipt.markerCount).toBe('number');
  }, scaledTimeout(60_000));

  it('exits 1 for unknown asset', async () => {
    const { exit } = await captureCli(() =>
      run(['asset', 'analyze', 'missing-asset-12345', '--projection=beat']),
    );
    expect(exit).toBe(1);
  });

  it('exits 1 without --projection', async () => {
    const { exit } = await captureCli(() => run(['asset', 'analyze', 'intro-bed']));
    expect(exit).toBe(1);
  });

  // The three projection arms in asset-analyze.ts:67–69 are
  // `if (projection === 'beat') ... else if (projection === 'onset') ...
  // else (waveform)`. The beat case has its own happy-path test above.
  // These two cover the remaining arms so all three projections run
  // at least once. The first onset call also exercises the
  // tryReadCache hit arm via a second invocation without --force.
  it('runs onset projection and emits markerCount; the second call comes from cache', async () => {
    const first = await captureCli(() => run(['asset', 'analyze', 'intro-bed', '--projection=onset', '--force']));
    expect(first.exit).toBe(0);
    const firstReceipt = JSON.parse(first.stdout.trim().split('\n').pop()!);
    expect(firstReceipt.projection).toBe('onset');
    expect(typeof firstReceipt.markerCount).toBe('number');
    expect(firstReceipt.cached).toBe(false);

    const second = await captureCli(() => run(['asset', 'analyze', 'intro-bed', '--projection=onset']));
    expect(second.exit).toBe(0);
    const secondReceipt = JSON.parse(second.stdout.trim().split('\n').pop()!);
    expect(secondReceipt.cached).toBe(true);
  }, scaledTimeout(60_000));

  it('runs waveform projection and emits markerCount (covers the else arm)', async () => {
    const { exit, stdout } = await captureCli(() =>
      run(['asset', 'analyze', 'intro-bed', '--projection=waveform', '--force']),
    );
    expect(exit).toBe(0);
    const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
    expect(receipt.projection).toBe('waveform');
    expect(typeof receipt.markerCount).toBe('number');
    // waveform computes 512 bins, so markerCount should be > 0.
    expect(receipt.markerCount).toBeGreaterThan(0);
  }, scaledTimeout(60_000));
});
