import { describe, it, expect, beforeEach } from 'vitest';
import { defineCapsule, schema } from '@liteship/core';
import { resetCapsuleCatalog } from '@liteship/core/testing';
import * as Harness from '@liteship/core/harness';

describe('generateReceiptedMutation', () => {
  beforeEach(() => resetCapsuleCatalog());

  // A constructible base: under the mandatory-`mutate` rule a receiptedMutation
  // must expose a pure `mutate` core OR a typed `effect-outcome` exemption, so
  // `base` carries a trivial pure `mutate` to satisfy `defineCapsule`. The
  // harness output is driven by the explicit `ctx` flags below, NOT by the
  // capsule's real fields, so we can still exercise every emission branch.
  const base = {
    _kind: 'receiptedMutation' as const,
    name: 'demo.issueReceipt',
    input: schema.struct({ token: schema.string }),
    output: schema.struct({ status: schema.string }),
    capabilities: { reads: [], writes: ['ledger.entries'] },
    invariants: [],
    budgets: { p95Ms: 5 },
    site: ['node' as const],
    mutate: (i: { token: string }) => ({ status: i.token === '' ? 'failed' : 'applied' }),
  };

  it('NEVER emits an it.skip — checks are real or non-emitted with a reason', () => {
    const cap = defineCapsule(base);
    // contractRoundTrippable true, ctx says no mutate / no faults exercised —
    // the harness must non-emit (not skip) the two handler-gated checks.
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
    // The contract round-trip is a REAL it(...) block driven by the effect-free
    // kernel `decode` (Encoded ≡ Type, so no separate encode) — never effect.
    expect(testFile).toContain("it('contract shape: input and output decode round-trip'");
    expect(testFile).toContain('schemaToArbitrary');
    expect(testFile).toContain('decode(schema as never, value)');
    expect(testFile).toMatch(/import \{ decode \} from/);
    expect(testFile).not.toMatch(/from 'effect'/);
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
    // The audit-receipt check decodes against the output schema via the kernel
    // `decode` — the whole file is effect-free.
    expect(testFile).toContain('decode(cap.output as never, receipt).ok');
    expect(testFile).not.toMatch(/from 'effect'/);
    // No non-emission / exemption notes when every check is real.
    expect(testFile).not.toContain('NOT EMITTED');
    expect(testFile).not.toContain('EXEMPTED');
  });

  it('records a documented EXEMPTION (not a skip) when receiptKind is effect-outcome', () => {
    // The TYPED escape hatch: the capsule declares `effect-outcome` with a
    // reason instead of a pure core. The harness must record idempotency /
    // audit / fault as a machine-readable EXEMPTION carrying the reason — never
    // a skip and never a real (vacuous) it(...) block.
    const cap = defineCapsule({
      ...base,
      mutate: undefined,
      name: 'demo.effectOutcome',
      receiptKind: 'effect-outcome' as const,
      reason: 'receipt is the outcome of a side effect with no pure core to drive',
    });
    const { testFile } = Harness.generateReceiptedMutation(cap, {
      bindingImport: './demo.js',
      bindingName: 'demo',
      arbitraryImport: './arb.js',
      contractRoundTrippable: true,
      mutatePresent: false,
      faultsDeclared: false,
      effectOutcomeReason: cap.reason,
    });
    expect(testFile).not.toMatch(/it\.skip|test\.skip/);
    // The contract round-trip stays a real check.
    expect(testFile).toContain("it('contract shape:");
    // The handler-gated checks are EXEMPTED with the declared reason verbatim.
    expect(testFile).toContain('idempotent / audit receipt: EXEMPTED');
    expect(testFile).toContain('fault injection: EXEMPTED');
    expect(testFile).toContain('receipt is the outcome of a side effect with no pure core to drive');
    // Exemption is documented, not run as a real (vacuous) idempotency block.
    expect(testFile).not.toContain("it('is idempotent");
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
    // No pure `mutate` core wired → TYPED not-applicable bench: marker + a real
    // premise-guard `bench()` naming the capsule, never a comment-only stub.
    expect(benchFile).toContain('// BENCH-NOT-APPLICABLE:');
    expect(benchFile).toContain('demo.unbound');
    expect(benchFile).toContain('bench(');
    expect(benchFile).not.toContain('bench.skip');
    // No binding to import → the guard pins the recorded reason length, never a
    // vacuous typeof-string vanity that is always true.
    expect(benchFile).toContain('.length).toBeGreaterThan(0)');
    expect(benchFile).not.toContain(".toBe('string')");
  });

  it('emits a REAL mutate() bench when a pure mutate core + round-trippable input are resolved', () => {
    const cap = defineCapsule({ ...base, name: 'demo.bound' });
    const { benchFile } = Harness.generateReceiptedMutation(cap, {
      bindingImport: './bound.js',
      bindingName: 'boundCapsule',
      arbitraryImport: './arb.js',
      contractRoundTrippable: true,
      mutatePresent: true,
      faultsDeclared: false,
    });
    // REAL bench: imports the binding + arbitrary, presamples, drives `mutate`.
    expect(benchFile).not.toContain('// BENCH-NOT-APPLICABLE:');
    expect(benchFile).not.toContain('bench.skip');
    expect(benchFile).toContain('boundCapsule');
    expect(benchFile).toContain('cap.mutate!');
    expect(benchFile).toContain('await mutate(samples[');
    expect(benchFile).toContain('bench(');
  });

  it('emits a TYPED not-applicable bench carrying the effect-outcome reason', () => {
    const cap = defineCapsule({ ...base, name: 'demo.effect' });
    const { benchFile } = Harness.generateReceiptedMutation(cap, {
      bindingImport: './eff.js',
      bindingName: 'effCapsule',
      arbitraryImport: './arb.js',
      contractRoundTrippable: true,
      mutatePresent: false,
      faultsDeclared: false,
      effectOutcomeReason: 'receipt is the outcome of spawning a process',
    });
    expect(benchFile).toContain('// BENCH-NOT-APPLICABLE:');
    expect(benchFile).toContain('effect-outcome');
    expect(benchFile).toContain('spawning a process');
    expect(benchFile).toContain('bench(');
    expect(benchFile).not.toContain('bench.skip');
    // TEETH: the premise guard imports the binding and asserts the STRUCTURAL
    // absence of a pure mutate core — NOT a vacuous typeof-string vanity.
    expect(benchFile).toContain('effCapsule');
    expect(benchFile).toContain("expect(cap._kind).toBe('receiptedMutation')");
    expect(benchFile).toContain('expect(cap.mutate).toBeUndefined()');
    expect(benchFile).toContain("expect(cap.receiptKind).toBe('effect-outcome')");
    expect(benchFile).not.toContain(".toBe('string')");
  });

  it('defineCapsule REJECTS a receiptedMutation with neither a mutate core nor an exemption', () => {
    // The discriminated requirement: silent absence is illegal. A receipted
    // mutation that exposes no pure core AND declares no `effect-outcome`
    // exemption must throw at declaration time — never ship green.
    expect(() => defineCapsule({ ...base, mutate: undefined, name: 'demo.naked' })).toThrow(
      /neither a pure `mutate` core nor a `receiptKind: 'effect-outcome'` exemption/,
    );
  });

  it('defineCapsule REJECTS an effect-outcome exemption without a non-empty reason', () => {
    expect(() =>
      defineCapsule({
        ...base,
        mutate: undefined,
        name: 'demo.reasonless',
        receiptKind: 'effect-outcome' as const,
      }),
    ).toThrow(/without a non-empty `reason`/);
    expect(() =>
      defineCapsule({
        ...base,
        mutate: undefined,
        name: 'demo.blankReason',
        receiptKind: 'effect-outcome' as const,
        reason: '   ',
      }),
    ).toThrow(/without a non-empty `reason`/);
  });

  it('defineCapsule REJECTS declaring BOTH a mutate core and an effect-outcome exemption', () => {
    expect(() =>
      defineCapsule({
        ...base,
        name: 'demo.both',
        receiptKind: 'effect-outcome' as const,
        reason: 'should not be allowed alongside a pure core',
      }),
    ).toThrow(/mutually exclusive/);
  });

  it('defineCapsule REJECTS declared faults without a pure mutate core', () => {
    expect(() =>
      defineCapsule({
        ...base,
        mutate: undefined,
        name: 'demo.effectFaults',
        receiptKind: 'effect-outcome' as const,
        reason: 'receipt only exists after an external effect',
        faults: [
          {
            name: 'empty-token-fails',
            trigger: () => ({ token: '' }),
            surfaces: 'receipt-status' as const,
            status: 'failed',
          },
        ],
      }),
    ).toThrow(/declares faults but exposes no pure `mutate` core/);
  });

  it('defineCapsule REJECTS malformed receiptedMutation fault declarations', () => {
    expect(() =>
      defineCapsule({
        ...base,
        name: 'demo.nonArrayFaults',
        faults: {} as never,
      }),
    ).toThrow(/expected an array/);

    expect(() =>
      defineCapsule({
        ...base,
        name: 'demo.nonObjectFault',
        faults: [null as never],
      }),
    ).toThrow(/expected an object/);

    expect(() =>
      defineCapsule({
        ...base,
        name: 'demo.blankFaultName',
        faults: [{ name: ' ', trigger: () => ({ token: '' }), surfaces: 'throws' as const }],
      }),
    ).toThrow(/name` must be non-empty/);

    expect(() =>
      defineCapsule({
        ...base,
        name: 'demo.missingTrigger',
        faults: [{ name: 'broken', surfaces: 'throws' } as never],
      }),
    ).toThrow(/trigger` must be a function/);

    expect(() =>
      defineCapsule({
        ...base,
        name: 'demo.badSurface',
        faults: [{ name: 'broken', trigger: () => ({ token: '' }), surfaces: 'other' } as never],
      }),
    ).toThrow(/surfaces` must be 'throws' or 'receipt-status'/);

    expect(() =>
      defineCapsule({
        ...base,
        name: 'demo.emptyStatus',
        faults: [
          {
            name: 'broken',
            trigger: () => ({ token: '' }),
            surfaces: 'receipt-status' as const,
            status: ' ',
          },
        ],
      }),
    ).toThrow(/receipt-status faults require a non-empty `status`/);
  });
});
