/**
 * Harness template for the `pureTransform` assembly arm.
 *
 * Emits a property test per declared invariant: derives a fast-check
 * arbitrary from the capsule's input schema (`schemaToArbitrary`),
 * invokes the capsule's `run` handler against each sample, and asserts
 * the invariant `check(input, output)` holds.
 *
 * If the capsule does not export a `run` handler the test is emitted as
 * `it.skip` with a TODO comment — vacuous `() => true` placeholders are
 * banned (per memory: "no vanity tests, real APIs, deterministic
 * assertions").
 *
 * @module
 */
import type { CapsuleDef } from '../assembly.js';

/** Emitted file contents for a capsule harness (test + bench pair). */
export interface HarnessOutput {
  readonly testFile: string;
  readonly benchFile: string;
}

/**
 * Optional metadata the compile-time driver passes to harness templates so
 * the generated test file can `import` the real capsule binding from its
 * source file. When `bindingImport` is undefined, the harness emits an
 * `it.skip` placeholder rather than a vacuous test.
 */
export interface HarnessContext {
  /** ESM-style import specifier (with `.js` extension) for the test file. */
  readonly bindingImport?: string;
  /** Exported binding name to import from `bindingImport`. */
  readonly bindingName?: string;
  /** Import specifier for `schemaToArbitrary`, default to source path. */
  readonly arbitraryImport?: string;
  /**
   * Import specifier (with `.js` extension) for the canonical
   * `contentAddressOf` primitive from `@czap/core`'s content-address kernel.
   * The `cachedProjection` harness uses it as the cache KEY function for the
   * content-addressed cache-hit / invalidation probes — never a hand-rolled
   * hash. Defaults to the repo-relative source path when the driver omits it.
   */
  readonly contentAddressImport?: string;
  /**
   * COMPILE-TIME resolution for a `cachedProjection` whose binding the driver
   * has fully resolved: its `derive(bytes)` handler is present AND its
   * canonical byte fixture path is known to exist. When `true`, the harness
   * emits the FINAL real-only form — fixture-driven cache-hit / invalidation /
   * determinism / invariant probes with NO `it.skip` runtime-guard literals.
   * The random-source property test is OMITTED (not skipped): these capsules
   * take a Declaration-tagged `instanceOf(ArrayBuffer)` source schema that is
   * deliberately not arbitrary-derivable, so a random ArrayBuffer probe cannot
   * apply — the canonical `.wav` fixture is the source of truth instead.
   * `undefined`/`false` keeps the template on its self-reporting runtime branch.
   */
  readonly cachedProjectionRealOnly?: boolean;
  /**
   * Repo-root-relative path to a canonical source fixture (e.g. an asset
   * decl's `source`: `examples/scenes/intro-bed.wav`). When present,
   * `cachedProjection` harnesses emit fixture-based determinism/invariant
   * tests plus a REAL decode bench instead of a comment-only placeholder.
   * Resolved against `process.cwd()` at test runtime (vitest runs from the
   * repo root, matching the hosts' `loadAssetBytes` convention).
   */
  readonly fixturePath?: string;
  /**
   * COMPILE-TIME probe result: whether `schemaToArbitrary(cap.input)`
   * resolves a usable arbitrary. The driver (`scripts/capsule-compile.ts`)
   * imports the real binding and runs the walker once, so the generated
   * file can be emitted in its FINAL form — a real `it(...)` block when
   * derivable, never a literal `it.skip(...)` placeholder that would ship
   * green while claiming coverage it doesn't have. `undefined` means the
   * driver did not probe (legacy / no binding), and the template falls
   * back to its self-reporting runtime branch.
   */
  readonly arbitraryDerivable?: boolean;
  /**
   * COMPILE-TIME probe result: the kind-specific handler(s) the harness
   * drives are present on the real binding — `run` for `pureTransform`,
   * `step`+`initialState` for `stateMachine`. Paired with
   * {@link arbitraryDerivable} this lets the template emit only the branch
   * that will actually run, never an `it.skip` token.
   */
  readonly handlersPresent?: boolean;
  /**
   * COMPILE-TIME probe result: the schema is derivable and handlers are
   * present, yet the handler REJECTS structurally-conformant samples
   * because its true input domain is narrower than the declared schema
   * (e.g. a CBOR decoder typed `instanceOf(Uint8Array)` that throws on
   * non-canonical bytes). When set the harness emits ONE honest skip
   * carrying this reason rather than a false-RED test driven by inputs the
   * handler can't accept. This is a NON-SCHEMA cause — the fix lives in the
   * capsule's input schema, not the arbitrary walker.
   */
  readonly preconditionMismatch?: string;
  /**
   * COMPILE-TIME probe result (receiptedMutation): both the input AND output
   * schemas resolve a fast-check arbitrary, so the contract round-trip test
   * (encode→decode equality over each) can be emitted real. When false the
   * contract-shape check is non-emitted (a schema the walker can't sample
   * can't be round-tripped) rather than shipped as a green skip.
   */
  readonly contractRoundTrippable?: boolean;
  /**
   * COMPILE-TIME probe result (receiptedMutation): the capsule exposes a
   * typed `mutate` invocation handler. Only then can the harness drive the
   * idempotency + audit-receipt checks for real; absent it, those two checks
   * are non-emitted (no runtime channel to invoke — nothing to compare or
   * inspect), which is justified non-emission, not a skip.
   */
  readonly mutatePresent?: boolean;
  /**
   * COMPILE-TIME probe result (receiptedMutation): the capsule declares one
   * or more reachable faults (`faults` table). Only then is the
   * fault-injection check emitted; a capsule with no declared faults has no
   * faults to prove reachable, so the check is non-emitted.
   */
  readonly faultsDeclared?: boolean;
  /**
   * COMPILE-TIME probe result (receiptedMutation): the capsule declared the
   * TYPED `receiptKind: 'effect-outcome'` escape hatch — its receipt is the
   * outcome of an effect with no pure core to drive. Carries the capsule's
   * required `reason`. When set, the harness records this as a documented,
   * machine-readable EXEMPTION in the generated file (a waiver with teeth)
   * instead of the idempotency/audit/fault non-emission notes — never a skip.
   */
  readonly effectOutcomeReason?: string;
}

const DEFAULT_ARBITRARY_IMPORT = '../../packages/core/src/harness/arbitrary-from-schema.js';

/**
 * Generate the test + bench file contents for a `pureTransform` capsule.
 * The emitted files are strings; the repo compiler writes them to
 * `tests/generated/<name>.{test,bench}.ts`.
 */
export function generatePureTransform(
  cap: CapsuleDef<'pureTransform', unknown, unknown, unknown>,
  ctx: HarnessContext = {},
): HarnessOutput {
  const arbitraryImport = ctx.arbitraryImport ?? DEFAULT_ARBITRARY_IMPORT;

  if (ctx.bindingImport === undefined || ctx.bindingName === undefined) {
    // No real binding wired — emit honest skip per task constraint.
    const testFile = `// GENERATED — do not edit by hand
import { describe, it } from 'vitest';

describe('${cap.name}', () => {
  it.skip('invariants under random input (no binding wired)', () => {
    // TODO(harness): no capsule binding import wired by capsule-compile.
    // Add bindingImport + bindingName to the manifest entry to enable.
  });
});
`;
    const benchFile = `// GENERATED — do not edit by hand
import { bench } from 'vitest';

bench('${cap.name}', () => {
  // handler invocation with a canonical fixture
}, { time: 500 });
`;
    return { testFile, benchFile };
  }

  // Derivable + handler present, but the handler rejects schema-conformant
  // samples (its true domain is narrower than the input schema). Emit ONE
  // honest skip naming the non-schema cause — never a false-RED test driven
  // by inputs the handler cannot accept.
  if (ctx.preconditionMismatch !== undefined) {
    // The reason is interpolated into a single-quoted `it.skip('...')`
    // literal: escape backslashes and single quotes, and strip newlines so
    // the emitted file always parses.
    const reason = ctx.preconditionMismatch
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/[\r\n]+/g, ' ');
    const testFile = `// GENERATED — do not edit by hand
import { describe, it } from 'vitest';

describe('${cap.name}', () => {
  // capsule:compile probed the real binding: the input schema is
  // arbitrary-derivable and \`run\` exists, but \`run\` rejects
  // structurally-conformant samples. The fix is a narrower input schema on
  // the capsule, NOT the arbitrary walker. Honest skip until then.
  it.skip('invariants — ${reason}', () => {});
});
`;
    const benchFile = `// GENERATED — do not edit by hand
import { bench } from 'vitest';

bench('${cap.name}', () => {
  // handler invocation with a canonical fixture
}, { time: 500 });
`;
    return { testFile, benchFile };
  }

  // COMPILE-TIME probe resolved: the binding's input schema IS
  // arbitrary-derivable AND its `run` handler exists. Emit the FINAL,
  // real-only test — no `it.skip` token, so the generated file never
  // ships a green placeholder. A regression in the arbitrary walker would
  // throw at `schemaToArbitrary` and fail the suite RED, which is correct.
  const realOnly = ctx.arbitraryDerivable === true && ctx.handlersPresent === true;

  const testFile = realOnly
    ? `// GENERATED — do not edit by hand
import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { ${ctx.bindingName} } from '${ctx.bindingImport}';
import { schemaToArbitrary } from '${arbitraryImport}';
import { scaledTimeout } from '../../vitest.shared.js';

describe('${cap.name}', () => {
  const cap = ${ctx.bindingName};
  // Resolved arbitrary-derivable + run handler present at capsule:compile.
  const arb = schemaToArbitrary(cap.input as never) as fc.Arbitrary<unknown>;
  const run = cap.run!;

  for (const inv of cap.invariants) {
    it(\`invariant: \${inv.name}\`, () => {
      fc.assert(
        fc.property(arb, (input) => {
          const output = run(input as never);
          return inv.check(input as never, output as never);
        }),
        { numRuns: 100 },
      );
      // Generous per-invariant timeout: 100 property runs over a heavier capsule
      // (e.g. the cast compilers) can exceed vitest's 10s default on a slow/loaded
      // CI runner (esp. Windows) — give headroom rather than reduce coverage.
      // scaledTimeout keeps the repo's central CI-scaling policy (no raw literals).
    }, scaledTimeout(30000));
  }
});
`
    : `// GENERATED — do not edit by hand
import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { ${ctx.bindingName} } from '${ctx.bindingImport}';
import { schemaToArbitrary, UnsupportedSchemaError } from '${arbitraryImport}';
import { scaledTimeout } from '../../vitest.shared.js';

describe('${cap.name}', () => {
  const cap = ${ctx.bindingName};
  let arb: fc.Arbitrary<unknown>;
  let arbError: unknown;
  try {
    arb = schemaToArbitrary(cap.input as never) as fc.Arbitrary<unknown>;
  } catch (err) {
    arbError = err;
  }
  if (arbError !== undefined && !(arbError instanceof UnsupportedSchemaError)) {
    // Only a non-derivable schema is honest-skip material; anything else
    // (a defect in the arbitrary builder, a malformed capsule) must fail.
    throw arbError;
  }
  if (cap.run === undefined || arbError !== undefined) {
    it.skip(
      arbError instanceof UnsupportedSchemaError
        ? \`invariants — input schema not arbitrary-derivable (\${arbError.message})\`
        : 'invariants — capsule has no run handler',
      () => {},
    );
  } else {
    for (const inv of cap.invariants) {
      it(\`invariant: \${inv.name}\`, () => {
        fc.assert(
          fc.property(arb, (input) => {
            const output = cap.run!(input as never);
            return inv.check(input as never, output as never);
          }),
          { numRuns: 100 },
        );
        // Generous per-invariant timeout: 100 property runs over a heavier capsule
        // (e.g. the cast compilers) can exceed vitest's 10s default on a slow/loaded
        // CI runner (esp. Windows) — give headroom rather than reduce coverage.
        // scaledTimeout keeps the repo's central CI-scaling policy (no raw literals).
      }, scaledTimeout(30000));
    }
  }
});
`;

  const benchFile = `// GENERATED — do not edit by hand
import { bench } from 'vitest';

bench('${cap.name}', () => {
  // handler invocation with a canonical fixture
}, { time: 500 });
`;

  return { testFile, benchFile };
}
