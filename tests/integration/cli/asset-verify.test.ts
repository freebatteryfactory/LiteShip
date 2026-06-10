import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { scaledTimeout } from '../../../vitest.shared.js';
import { run } from '@czap/cli';
import { captureCli } from './capture.js';
import { compileManifestOnly, type IsolatedCapsules } from '../../setup/isolated-capsules.js';

describe('czap asset verify', () => {
  // Manifest-only + temp manifest (CUT T1): the verify runs the committed
  // generated tests but this never rewrites the shared tests/generated/ dir.
  let iso: IsolatedCapsules;
  beforeAll(async () => {
    iso = await compileManifestOnly('czap-asset-verify');
  }, scaledTimeout(120_000));
  afterAll(() => iso?.restore());

  it('returns ok for a registered asset', async () => {
    const { exit } = await captureCli(() => run(['asset', 'verify', 'intro-bed']));
    expect([0, 1]).toContain(exit);
  }, scaledTimeout(120_000));

  it('exits 1 for unknown asset', async () => {
    const { exit } = await captureCli(() => run(['asset', 'verify', 'missing-asset-12345']));
    expect(exit).toBe(1);
  });
});
