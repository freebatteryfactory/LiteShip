import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { scaledTimeout } from '../../../vitest.shared.js';
import { run } from '@czap/cli';
import { captureCli } from './capture.js';
import { compileManifestOnly, type IsolatedCapsules } from '../../setup/isolated-capsules.js';

describe('czap scene verify', () => {
  // Manifest-only + temp manifest (CUT T1): scene verify runs the committed
  // generated tests but this never rewrites the shared tests/generated/ dir.
  let iso: IsolatedCapsules;
  beforeAll(async () => {
    iso = await compileManifestOnly('czap-scene-verify');
  }, scaledTimeout(120_000));
  afterAll(() => iso?.restore());

  it('runs generated tests for the intro scene and emits an ok receipt', async () => {
    const { exit, stdout } = await captureCli(() => run(['scene', 'verify', 'examples/scenes/intro.ts']));
    expect(exit).toBe(0);
    const receipt = JSON.parse(stdout.trim().split('\n').pop()!);
    expect(receipt.status).toBe('ok');
    expect(receipt.generatedTests).toBeGreaterThan(0);
  }, scaledTimeout(120_000));
});
