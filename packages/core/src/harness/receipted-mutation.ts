/**
 * Harness template for the `receiptedMutation` assembly arm.
 *
 * A receipted mutation declares an `input`/`output` schema pair (the receipt
 * CONTRACT) and optionally a typed `mutate` invocation handler plus a `faults`
 * table. The harness emits ONLY checks it can make real against what the
 * capsule actually exposes — never an `it.skip` placeholder:
 *
 *  - **contract round-trip** — emitted when both schemas are
 *    arbitrary-derivable (probed at compile time). Samples the input and
 *    output arbitraries and asserts each survives a `decode(encode(x))`
 *    round-trip. This proves the receipt contract is well-formed without any
 *    runtime channel.
 *  - **idempotent** + **audit receipt** — emitted ONLY when the capsule
 *    exposes a `mutate` handler. The harness drives it twice with the same
 *    sampled input (idempotency) and inspects the declared capabilities
 *    (audit). A receipted mutation that instead declares the TYPED escape
 *    hatch `receiptKind: 'effect-outcome'` (its receipt is the outcome of an
 *    effect with no pure core to drive) records these as a documented,
 *    machine-readable EXEMPTION carrying the declared `reason` — a waiver with
 *    teeth, never a green `it.skip`. The receipt CONTRACT is still proven by
 *    the round-trip above. (Under the mandatory-`mutate` rule a receipted
 *    mutation must do ONE of these two — `defineCapsule` rejects neither.)
 *  - **fault injection** — emitted ONLY when the capsule declares `faults`.
 *    A capsule that declares no faults has no faults to prove reachable, so
 *    the check is non-emitted (not skipped).
 *
 * Per memory: "no vanity tests" — a `() => true` placeholder pretending to
 * verify behavior, and a green `it.skip` shipping unwired work, are BOTH
 * banned. Every check here is either a real probe or an absent one with a
 * written reason.
 *
 * @module
 */

import type { CapsuleDef } from '../assembly.js';
import type { HarnessOutput, HarnessContext } from './pure-transform.js';

const DEFAULT_ARBITRARY_IMPORT = '../../packages/core/src/harness/arbitrary-from-schema.js';

/**
 * Generate the test + bench file contents for a `receiptedMutation` capsule.
 *
 * The generated checks are gated on compile-time probe results carried in
 * {@link HarnessContext}: `contractRoundTrippable` (both schemas sampleable),
 * `mutatePresent` (typed invocation channel), and `faultsDeclared` (a faults
 * table). Each gate either emits a REAL `it(...)` block or emits nothing with
 * a documented reason — never `it.skip`.
 */
export function generateReceiptedMutation(
  cap: CapsuleDef<'receiptedMutation', unknown, unknown, unknown>,
  ctx: HarnessContext = {},
): HarnessOutput {
  const arbitraryImport = ctx.arbitraryImport ?? DEFAULT_ARBITRARY_IMPORT;
  const hasBinding = ctx.bindingImport !== undefined && ctx.bindingName !== undefined;

  // Without a real binding to import there is nothing to exercise — the
  // capsule wasn't reachable by capsule-compile (factory wrapper / non-exported
  // const). Emit a documentation-only file: no `it(...)`, no `it.skip(...)`.
  if (!hasBinding) {
    return {
      testFile: `// GENERATED — do not edit by hand
// No capsule binding import was wired by capsule-compile for '${cap.name}'
// (the call site is not an exported const this harness can import), so there
// is nothing to exercise. No checks are emitted — and deliberately no skipped
// placeholder, which would ship unwired work green. Bind the capsule via an
// exported const to enable the contract round-trip + mutation probes.
import 'vitest';
`,
      benchFile: benchFor(cap.name),
    };
  }

  const bindingName = ctx.bindingName as string;
  const bindingImport = ctx.bindingImport as string;

  const imports: string[] = [`import { describe, it, expect } from 'vitest';`];
  const blocks: string[] = [];
  const notes: string[] = [];

  // The TYPED escape hatch: when the capsule declared
  // `receiptKind: 'effect-outcome'` with a reason, its receipt is an effect
  // outcome with no pure core to drive. We record ONE explicit, machine-readable
  // EXEMPTION for the three handler-gated checks (idempotency / audit / fault)
  // carrying the declared reason — a waiver with teeth, never a silent gate or a
  // green skip. The reason is sanitized to a single line so it survives in a
  // `//` comment.
  const effectOutcomeReason =
    typeof ctx.effectOutcomeReason === 'string' && ctx.effectOutcomeReason.trim().length > 0
      ? ctx.effectOutcomeReason.replace(/\s+/g, ' ').trim()
      : undefined;

  // ---- contract round-trip -------------------------------------------------
  // Real when both schemas are arbitrary-derivable. Samples input + output and
  // asserts each survives encode→decode.
  if (ctx.contractRoundTrippable === true) {
    imports.push(`import * as fc from 'fast-check';`);
    imports.push(`import { Schema } from 'effect';`);
    imports.push(`import { schemaToArbitrary } from '${arbitraryImport}';`);
    blocks.push(`  it('contract shape: input and output decode/encode round-trip', () => {
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
  });`);
  } else {
    notes.push(
      `//  - contract round-trip: NOT EMITTED — input and/or output schema is\n` +
        `//    not arbitrary-derivable, so the round-trip cannot be sampled. A\n` +
        `//    non-sampleable schema is a real finding for the arbitrary walker,\n` +
        `//    not something to paper over with a green skip.`,
    );
  }

  // ---- idempotent + audit receipt -----------------------------------------
  // Both need the typed `mutate` invocation channel. When absent there is
  // nothing to invoke — non-emit with a documented reason (NOT a skip).
  if (ctx.mutatePresent === true) {
    if (ctx.contractRoundTrippable !== true) {
      imports.push(`import * as fc from 'fast-check';`);
      imports.push(`import { schemaToArbitrary } from '${arbitraryImport}';`);
    }
    blocks.push(`  it('is idempotent: two identical inputs produce equivalent receipts', async () => {
    const arb = schemaToArbitrary(cap.input as never) as fc.Arbitrary<unknown>;
    const mutate = cap.mutate!;
    // One deterministic sample driven twice — receipted mutations declare
    // \`mutate\` pure over the input domain, so identical inputs must yield
    // deep-equal receipts. A divergence is a real non-determinism finding.
    const [sample] = fc.sample(arb, { numRuns: 1, seed: 0x5eed });
    const first = await mutate(sample as never);
    const second = await mutate(sample as never);
    expect(second).toEqual(first);
  });`);
    blocks.push(`  it('emits audit receipt with declared capabilities', async () => {
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
  });`);
    if (ctx.contractRoundTrippable !== true) {
      imports.push(`import { Schema } from 'effect';`);
    }
  } else if (effectOutcomeReason !== undefined) {
    notes.push(
      `//  - idempotent / audit receipt: EXEMPTED — '${cap.name}' declares the\n` +
        `//    TYPED escape hatch \`receiptKind: 'effect-outcome'\`. Its receipt is\n` +
        `//    the outcome of an effect with no pure core to drive twice, so these\n` +
        `//    checks are recorded as a declared, machine-readable EXEMPTION (a\n` +
        `//    waiver with teeth) rather than emitted real — and deliberately NOT a\n` +
        `//    skip. Declared reason:\n` +
        `//      ${effectOutcomeReason}`,
    );
  } else {
    notes.push(
      `//  - idempotent / audit receipt: NOT EMITTED — '${cap.name}' exposes no\n` +
        `//    typed \`mutate\` invocation channel. A receipted mutation's real\n` +
        `//    behavior here is an external side effect (fs write / process spawn /\n` +
        `//    DOM morph) wired behind a separate runtime callable, not a pure\n` +
        `//    handler the harness may drive twice. There is nothing to invoke, so\n` +
        `//    there is no receipt to compare or inspect — non-emission, not a\n` +
        `//    skip. The receipt CONTRACT is still proven by the round-trip above.`,
    );
  }

  // ---- fault injection -----------------------------------------------------
  // Real when the capsule declares a faults table; each fault is driven and
  // asserted to surface. No faults → nothing to prove reachable → non-emit.
  if (ctx.faultsDeclared === true && ctx.mutatePresent === true) {
    blocks.push(`  it('fault injection: declared faults are reachable', async () => {
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
        expect(threw, \`fault '\${fault.name}' declared as throwing but did not\`).toBe(true);
      } else {
        const receipt = (await mutate(input as never)) as { status?: unknown };
        expect(receipt.status, \`fault '\${fault.name}' status\`).toBe(fault.status);
      }
    }
  });`);
  } else if (effectOutcomeReason !== undefined) {
    notes.push(
      `//  - fault injection: EXEMPTED — '${cap.name}' declares the TYPED escape\n` +
        `//    hatch \`receiptKind: 'effect-outcome'\`; with no pure \`mutate\` core to\n` +
        `//    drive, declared faults cannot be injected here. Recorded as a\n` +
        `//    declared EXEMPTION (not a skip), reason as above.`,
    );
  } else {
    notes.push(
      `//  - fault injection: NOT EMITTED — '${cap.name}' declares no \`faults\`\n` +
        `//    table, so there are no faults to prove reachable. A fault-injection\n` +
        `//    test over zero declared faults would be vacuous; non-emission is the\n` +
        `//    honest disposition (add a \`faults\` entry to enable the check).`,
    );
  }

  const noteHeader =
    effectOutcomeReason !== undefined
      ? `  // Non-emitted / EXEMPTED checks (documented; deliberately no skipped placeholder):`
      : `  // Non-emitted checks (documented; deliberately no skipped placeholder):`;
  const noteBlock = notes.length > 0 ? `${noteHeader}\n${notes.join('\n')}\n` : '';

  // When at least one real check is emitted we import + alias the binding and
  // run the describe block. When NONE is (every check non-emitted for a
  // principled reason) we emit a documentation-only file with the reasons and
  // no `it`/`it.skip` at all — the binding import would be unused.
  if (blocks.length === 0) {
    return {
      testFile: `// GENERATED — do not edit by hand
// All checks for '${cap.name}' are non-emitted for documented reasons below —
// deliberately no skipped placeholder (which would ship unwired work green).
import 'vitest';

${noteBlock}`,
      benchFile: benchFor(cap.name),
    };
  }

  const importBlock = dedupeImports(imports).join('\n');

  const testFile = `// GENERATED — do not edit by hand
${importBlock}
import { ${bindingName} } from '${bindingImport}';

describe('${cap.name}', () => {
  const cap = ${bindingName};
${noteBlock}${blocks.join('\n\n')}
});
`;

  return { testFile, benchFile: benchFor(cap.name) };
}

/** Dedupe import lines while preserving first-seen order. */
function dedupeImports(lines: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    if (seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out;
}

/** The canonical bench stub for a receipted-mutation capsule. */
function benchFor(name: string): string {
  return `// GENERATED — do not edit by hand
import { bench } from 'vitest';

bench('${name}', () => {
  // mutation invocation with a canonical fixture
}, { time: 500 });
`;
}
