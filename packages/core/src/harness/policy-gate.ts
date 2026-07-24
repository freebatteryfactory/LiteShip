/**
 * Harness template for the `policyGate` assembly arm.
 *
 * A policyGate resolves an `allow`/`deny` {@link Decision} (verdict + reason
 * chain) against a typed subject via its pure `decide(subject)` core. Disposition
 * is resolved at COMPILE TIME by `scripts/capsule-compile.ts` (the same probe
 * pattern `pureTransform`/`stateMachine`/`cachedProjection` use): the harness
 * emits ONE clean, real test, or THROWS a tagged `UnsupportedError` so
 * `capsule:compile` fails loud (wire-or-fail). It never emits an `it.skip`, never
 * a `() => true` placeholder.
 *
 * The generated test drives the REAL `decide` over subjects sampled from the
 * capsule's input (subject) schema and pins the policyGate laws:
 *
 *  - **allow/deny coverage** — every verdict is a well-formed `Decision`
 *    (`effect ∈ {allow, deny}`, `reasons` an array of `{code, message}`), and the
 *    reason-chain law holds: `reasons` is non-empty EXACTLY when `effect` is
 *    `deny` (a denial names why; a silent gate is the thing this arm forbids).
 *  - **reason-chain integrity** — every reason's `code` and `message` are
 *    non-empty strings, and each decodes against the capsule's `output`
 *    (`Decision`) schema (the verdict shape is the contract, proved by round-trip).
 *  - **determinism** — the SAME subject yields a deep-equal verdict twice (the
 *    `decide` core is pure, exactly the discipline `mutate` follows).
 *  - **every declared invariant** `check(subject, verdict)` over random subjects.
 *
 * The bench drives `decide` over presampled subjects — the capsule's real hot
 * path — never re-sampling inside the timed loop.
 *
 * @module
 */

import { UnsupportedError } from '@liteship/error';
import type { CapsuleDef } from '../authoring/assembly.js';
import type { HarnessContext, HarnessOutput } from './pure-transform.js';

const DEFAULT_ARBITRARY_IMPORT = '../../packages/core/src/harness/arbitrary-from-schema.js';

/** Escape backtick + dollar-brace sequences for a template-literal interpolation site. */
function escapeBacktick(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

/** REAL bench: drive `decide` over presampled subjects (the capsule's hot path). */
function realBench(cap: CapsuleDef<'policyGate', unknown, unknown, unknown>, ctx: HarnessContext): string {
  const arbitraryImport = ctx.arbitraryImport ?? DEFAULT_ARBITRARY_IMPORT;
  return `// GENERATED — do not edit by hand
import { bench } from 'vitest';
import * as fc from 'fast-check';
import { ${ctx.bindingName} } from '${ctx.bindingImport}';
import { schemaToArbitrary } from '${arbitraryImport}';

// REAL bench: drive the capsule's \`decide\` over presampled subjects — the SAME
// binding + arbitrary the generated test drives. capsule:compile resolved this
// subject schema as arbitrary-derivable + \`decide\` present, so the samples are by
// construction subjects \`decide\` accepts. Samples are drawn ONCE at module load
// (fixed seed → reproducible) so the timed loop measures \`decide\`, never fast-check.
const cap = ${ctx.bindingName};
const decide = cap.decide!;
const arb = schemaToArbitrary(cap.input as never) as fc.Arbitrary<unknown>;
const subjects = fc.sample(arb, { numRuns: 64, seed: 0x5eed });
let i = 0;

bench(\`${escapeBacktick(cap.name)} — decide() over canonical subjects\`, () => {
  decide(subjects[i++ % subjects.length] as never);
}, { time: 500 });
`;
}

/**
 * Generate the test + bench file contents for a `policyGate` capsule.
 *
 * Disposition is resolved at COMPILE TIME (see the module docstring). This
 * generator emits ONE clean real test, or THROWS a tagged `UnsupportedError`
 * so `capsule:compile` fails loud (wire-or-fail) — never an `it.skip`.
 */
export function generatePolicyGate(
  cap: CapsuleDef<'policyGate', unknown, unknown, unknown>,
  ctx: HarnessContext = {},
): HarnessOutput {
  const arbitraryImport = ctx.arbitraryImport ?? DEFAULT_ARBITRARY_IMPORT;
  // The kernel strict `decode` lives beside the arbitrary walker under
  // `packages/core/src/schema/index.js`; derive its specifier from the arbitrary
  // import so both resolve from the same generated-test directory, whatever its
  // depth. (Replaces the effect `Schema.decodeUnknownSync` the verdict round-trip
  // used before the schema kernel landed.)
  const decodeImport = arbitraryImport.replace(/harness\/arbitrary-from-schema\.js$/, 'schema/index.js');

  if (ctx.bindingImport === undefined || ctx.bindingName === undefined) {
    // Wire-or-fail: a generator emits a real test or throws — never a skip.
    throw UnsupportedError(
      'policyGate harness',
      `cannot harness policyGate capsule '${cap.name}': capsule:compile resolved no importable binding ` +
        `(bindingImport + bindingName). A policyGate without an exported binding cannot be probed — export ` +
        `the binding (or remove the capsule) and re-run pnpm run capsule:compile.`,
    );
  }

  // COMPILE-TIME probe must have resolved the binding's SUBJECT schema as
  // arbitrary-derivable AND its `decide` verdict handler present. Wire-or-fail:
  // any lesser disposition throws here — a policyGate with no sampleable subject
  // or no decision core has nothing to drive, and a silent skip would launder
  // that gap green.
  if (ctx.arbitraryDerivable !== true || ctx.decidePresent !== true) {
    throw UnsupportedError(
      'policyGate harness',
      `cannot harness policyGate capsule '${cap.name}': capsule:compile did not resolve it as ` +
        `arbitrary-derivable (got ${String(ctx.arbitraryDerivable)}) with a decide handler present ` +
        `(got ${String(ctx.decidePresent)}). Both must probe true to emit a real allow/deny + reason-chain ` +
        `+ determinism traversal — narrow the subject schema so it is sampleable and add a pure ` +
        `\`decide(subject)\` core, then re-run pnpm run capsule:compile.`,
    );
  }

  const testFile = `// GENERATED — do not edit by hand
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { decode } from '${decodeImport}';
import type { Schema } from '${decodeImport}';
import { ${ctx.bindingName} } from '${ctx.bindingImport}';
import { schemaToArbitrary } from '${arbitraryImport}';

describe('${cap.name}', () => {
  const cap = ${ctx.bindingName} as {
    input: Schema<unknown>;
    output: Schema<unknown>;
    decide?: (subject: unknown) => { effect: 'allow' | 'deny'; reasons: ReadonlyArray<{ code: string; message: string }> };
    invariants: ReadonlyArray<{ name: string; check: (subject: unknown, verdict: unknown) => boolean }>;
  };
  // capsule:compile resolved the subject schema as arbitrary-derivable + \`decide\`
  // present, so we sample the subject via the canonical walker and drive the REAL
  // decide. A regression in the walker throws at schemaToArbitrary and fails the
  // suite RED — correct, never a green skip.
  const subjectArb = schemaToArbitrary(cap.input as never) as fc.Arbitrary<unknown>;
  const decide = cap.decide!;

  it('allow/deny coverage: every verdict is a well-formed Decision (reasons non-empty iff deny)', () => {
    fc.assert(
      fc.property(subjectArb, (subject) => {
        const verdict = decide(subject as never);
        expect(verdict.effect === 'allow' || verdict.effect === 'deny').toBe(true);
        expect(Array.isArray(verdict.reasons)).toBe(true);
        // The reason-chain law: a denial MUST name why (non-empty chain); an allow
        // carries an empty-or-informational chain. Non-empty EXACTLY when deny.
        if (verdict.effect === 'deny') {
          expect(verdict.reasons.length).toBeGreaterThan(0);
        } else {
          expect(verdict.reasons.length).toBe(0);
        }
        return true;
      }),
      { numRuns: 100 },
    );
  });

  it('reason-chain integrity: every reason has non-empty {code, message} and decodes against the verdict schema', () => {
    fc.assert(
      fc.property(subjectArb, (subject) => {
        const verdict = decide(subject as never);
        for (const reason of verdict.reasons) {
          expect(typeof reason.code).toBe('string');
          expect(reason.code.length).toBeGreaterThan(0);
          expect(typeof reason.message).toBe('string');
          expect(reason.message.length).toBeGreaterThan(0);
        }
        // The whole verdict decodes against the declared Decision schema — the
        // reasons decode as typed reasons, not arbitrary objects. Strict kernel
        // decode returns the verdict unchanged (the policyGate analogue of the
        // receipt byte law).
        const decoded = decode(cap.output as never, verdict);
        expect(decoded.ok).toBe(true);
        if (decoded.ok) expect(decoded.value).toEqual(verdict);
        return true;
      }),
      { numRuns: 100 },
    );
  });

  it('determinism: the same subject yields a deep-equal verdict twice (pure decide core)', () => {
    fc.assert(
      fc.property(subjectArb, (subject) => {
        expect(decide(subject as never)).toEqual(decide(subject as never));
        return true;
      }),
      { numRuns: 100 },
    );
  });

  for (const inv of cap.invariants) {
    it(\`invariant: \${inv.name}\`, () => {
      fc.assert(
        fc.property(subjectArb, (subject) => {
          const verdict = decide(subject as never);
          return inv.check(subject as never, verdict as never);
        }),
        { numRuns: 100 },
      );
    });
  }
});
`;

  return { testFile, benchFile: realBench(cap, ctx) };
}
