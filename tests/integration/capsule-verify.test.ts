import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { scaledTimeout } from '../../vitest.shared.js';
import { withSpawned } from '../../scripts/lib/spawn.js';
import { compileManifestOnly, type IsolatedCapsules } from '../setup/isolated-capsules.js';

describe('capsule-verify', () => {
  // CUT T1: manifest-only compile to a temp manifest whose entries point at the
  // committed tests/generated/ files. This never rewrites that shared dir, so it
  // can't race the parent vitest run (which is executing those same files) or
  // other compile-spawning workers. The capsule:verify child inherits
  // CZAP_CAPSULE_MANIFEST and runs the committed generated suite read-only.
  let iso: IsolatedCapsules;
  beforeAll(async () => {
    iso = await compileManifestOnly('czap-capverify');
  }, scaledTimeout(90_000));

  afterAll(() => iso?.restore());

  it('exits 0 when the manifest is fresh and all generated tests pass', async () => {
    const lines: string[] = [];
    await withSpawned(
      'pnpm',
      ['run', 'capsule:verify'],
      async (handle) => {
        for await (const line of handle.readline()) {
          lines.push(line);
        }
      },
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    // Don't trust "last line is JSON" — pnpm/vitest can append reporter
    // output past the script's console.log under nested spawn chains.
    // Pick the last line that actually parses as a JSON object.
    const receiptLine = lines
      .map((line) => line.trim())
      .filter((line) => line.startsWith('{') && line.endsWith('}'))
      .pop();
    expect(receiptLine, `no JSON receipt in stdout. lines=${JSON.stringify(lines)}`).toBeDefined();
    const receipt = JSON.parse(receiptLine!);
    expect(receipt.status, `receipt: ${JSON.stringify(receipt)}`).toBe('ok');

    // Bench honesty: the receipt classifies every generated bench instead of
    // existence-only checking. Comment-only closures (the current harness
    // templates — real invocations land with the harness-handlers epic) must
    // surface as 'placeholder' so a green verdict cannot be mistaken for
    // benchmark coverage.
    expect(receipt.benches, `receipt: ${JSON.stringify(receipt)}`).toBeDefined();
    expect(receipt.benches.total).toBe(receipt.capsuleCount);
    expect(receipt.benches.real + receipt.benches.placeholder.length).toBe(receipt.benches.total);
    // Today every generated bench body is a placeholder; when the
    // harness-handlers epic emits real invocations this pins the honest count.
    expect(receipt.benches.placeholder.length).toBe(receipt.benches.total);
  }, scaledTimeout(90_000));
});
