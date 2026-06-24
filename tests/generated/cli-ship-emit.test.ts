// GENERATED — do not edit by hand
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Schema } from 'effect';
import { schemaToArbitrary } from '../../packages/core/src/harness/arbitrary-from-schema.js';
import { shipEmitCapsule } from '../../packages/cli/src/capsules/ship-emit.js';

describe('cli.ship-emit', () => {
  const cap = shipEmitCapsule;
  it('contract shape: input and output decode/encode round-trip', () => {
    for (const schema of [cap.input, cap.output]) {
      const arb = schemaToArbitrary(schema as never) as fc.Arbitrary<unknown>;
      const encode = Schema.encodeSync(schema as never);
      const decode = Schema.decodeUnknownSync(schema as never);
      fc.assert(
        fc.property(arb, (value) => {
          expect(decode(encode(value as never))).toEqual(value);
          return true;
        }),
        { numRuns: 100 },
      );
    }
  });

  it('is idempotent: two identical inputs produce equivalent receipts', async () => {
    const arb = schemaToArbitrary(cap.input as never) as fc.Arbitrary<unknown>;
    const mutate = cap.mutate!;
    // One deterministic sample driven twice — receipted mutations declare
    // `mutate` pure over the input domain, so identical inputs must yield
    // deep-equal receipts. A divergence is a real non-determinism finding.
    const [sample] = fc.sample(arb, { numRuns: 1, seed: 0x5eed });
    const first = await mutate(sample as never);
    const second = await mutate(sample as never);
    expect(second).toEqual(first);
  });

  it('emits audit receipt with declared capabilities', async () => {
    const arb = schemaToArbitrary(cap.input as never) as fc.Arbitrary<unknown>;
    const mutate = cap.mutate!;
    const [sample] = fc.sample(arb, { numRuns: 1, seed: 0x5eed });
    // Invoking the capsule must yield a receipt that decodes against the
    // declared output schema, and the capsule must declare the capabilities
    // (reads/writes) the receipt is audited against.
    const receipt = await mutate(sample as never);
    expect(() => Schema.decodeUnknownSync(cap.output as never)(receipt)).not.toThrow();
    expect(Array.isArray(cap.capabilities.reads)).toBe(true);
    expect(Array.isArray(cap.capabilities.writes)).toBe(true);
    expect(cap.capabilities.reads.length + cap.capabilities.writes.length).toBeGreaterThan(0);
  });

  it('fault injection: declared faults are reachable', async () => {
    const mutate = cap.mutate!;
    expect(cap.faults!.length).toBeGreaterThan(0);
    for (const fault of cap.faults!) {
      const input = fault.trigger();
      if (fault.surfaces === 'throws') {
        let threw = false;
        try {
          await mutate(input as never);
        } catch {
          threw = true;
        }
        expect(threw, `fault '${fault.name}' declared as throwing but did not`).toBe(true);
      } else {
        const receipt = (await mutate(input as never)) as { status?: unknown };
        expect(receipt.status, `fault '${fault.name}' status`).toBe(fault.status);
      }
    }
  });
});
