import { describe, it, expect, beforeEach } from 'vitest';
import { Schema } from 'effect';
import { defineCapsule } from '@czap/core';
import { resetCapsuleCatalog } from '@czap/core/testing';
import * as Harness from '@czap/core/harness';

describe('generateReceiptedMutation', () => {
  beforeEach(() => resetCapsuleCatalog());

  const base = {
    _kind: 'receiptedMutation' as const,
    name: 'demo.issueReceipt',
    input: Schema.Struct({ token: Schema.String }),
    output: Schema.Struct({ status: Schema.String }),
    capabilities: { reads: [], writes: ['ledger.entries'] },
    invariants: [],
    budgets: { p95Ms: 5 },
    site: ['node' as const],
  };

  it('NEVER emits an it.skip — checks are real or non-emitted with a reason', () => {
    const cap = defineCapsule(base);
    // contractRoundTrippable true, no mutate, no faults — the common shape of
    // the three shipped receiptedMutation capsules.
    const { testFile } = Harness.generateReceiptedMutation(cap, {
      bindingImport: './demo.js',
      bindingName: 'demo',
      arbitraryImport: './arb.js',
      contractRoundTrippable: true,
      mutatePresent: false,
      faultsDeclared: false,
    });
    // No skip token of any flavor.
    expect(testFile).not.toMatch(/it\.skip|test\.skip/);
    // The contract round-trip is a REAL it(...) block.
    expect(testFile).toContain("it('contract shape: input and output decode/encode round-trip'");
    expect(testFile).toContain('schemaToArbitrary');
    // The two handler-gated checks are documented as non-emitted, not skipped.
    expect(testFile).toContain('idempotent / audit receipt: NOT EMITTED');
    expect(testFile).toContain('fault injection: NOT EMITTED');
    expect(testFile).not.toContain("it('is idempotent");
    expect(testFile).not.toContain("it('fault injection");
  });

  it('emits real idempotency + audit + fault checks when mutate and faults are present', () => {
    const cap = defineCapsule({
      ...base,
      name: 'demo.withMutate',
      mutate: (i: { token: string }) => ({ status: i.token === '' ? 'failed' : 'applied' }),
      faults: [
        {
          name: 'empty-token-fails',
          trigger: () => ({ token: '' }),
          surfaces: 'receipt-status' as const,
          status: 'failed',
        },
      ],
    });
    const { testFile } = Harness.generateReceiptedMutation(cap, {
      bindingImport: './demo.js',
      bindingName: 'demo',
      arbitraryImport: './arb.js',
      contractRoundTrippable: true,
      mutatePresent: true,
      faultsDeclared: true,
    });
    expect(testFile).not.toMatch(/it\.skip|test\.skip/);
    expect(testFile).toContain("it('contract shape:");
    expect(testFile).toContain("it('is idempotent:");
    expect(testFile).toContain("it('emits audit receipt with declared capabilities'");
    expect(testFile).toContain("it('fault injection: declared faults are reachable'");
    // No non-emission notes when every check is real.
    expect(testFile).not.toContain('NOT EMITTED');
  });

  it('contract round-trip is non-emitted (not skipped) when a schema is not derivable', () => {
    const cap = defineCapsule({ ...base, name: 'demo.opaque' });
    const { testFile } = Harness.generateReceiptedMutation(cap, {
      bindingImport: './demo.js',
      bindingName: 'demo',
      arbitraryImport: './arb.js',
      contractRoundTrippable: false,
      mutatePresent: false,
      faultsDeclared: false,
    });
    expect(testFile).not.toMatch(/it\.skip|test\.skip/);
    expect(testFile).toContain('contract round-trip: NOT EMITTED');
    // Every check non-emitted → documentation-only file, no describe body to run.
    expect(testFile).not.toContain("it('");
  });

  it('emits a documentation-only file (no skip) when no binding is wired', () => {
    const cap = defineCapsule({ ...base, name: 'demo.unbound' });
    const { testFile, benchFile } = Harness.generateReceiptedMutation(cap);
    expect(testFile).not.toMatch(/it\.skip|test\.skip/);
    expect(testFile).not.toContain("it('");
    expect(testFile).toContain('No capsule binding import was wired');
    expect(benchFile).toContain("bench('demo.unbound'");
  });
});
