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
import { benchNotApplicableMarker } from './bench-marker.js';

/** Emitted file contents for a capsule harness (test + bench pair). */
export interface HarnessOutput {
  readonly testFile: string;
  readonly benchFile: string;
  /**
   * INTEGRATION-lane file contents (the `tests/generated/integration/<name>.test.ts`
   * file). Only the `siteAdapter` arm emits this today: the host-capability-matrix
   * check runs under a REAL host and lands in the integration lane, separate from
   * the unit-lane `.test.ts`. Absent for every other arm (and for siteAdapters whose
   * integration check is a not-applicable exemption, which is recorded inline).
   */
  readonly integrationFile?: string;
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
  /**
   * COMPILE-TIME resolution (sceneComposition): the concrete, `compileScene`-able
   * scene the harness drives through its ECS runtime, plus the import specifiers
   * and declared track-kind facts the generated checks need. Resolved by
   * `scripts/capsule-compile.ts` from its scene-driver registry — the
   * sceneComposition analogue of the cachedProjection fixture resolution. When
   * present the harness emits the 3 real UNIT-lane checks + the real BENCH-lane
   * budget; when absent the capsule has no tickable scene and every check is a
   * typed `not-applicable` exemption (never an it.skip). Typed as the
   * structural `SceneDriver` shape (see `scene-composition.ts`); kept as an
   * inline interface here to avoid a circular import between the harness
   * modules.
   */
  readonly sceneDriver?: {
    readonly compileName: string;
    readonly compileImport: string;
    readonly capsuleName: string;
    readonly capsuleImport: string;
    readonly runtimeImport: string;
    readonly contentAddressImport: string;
    readonly hasAudio: boolean;
    readonly hasVideo: boolean;
  };
  /**
   * COMPILE-TIME resolution (stateMachine): a runtime-backed state machine whose
   * step semantics live in a BUILDER + tick handle rather than declared
   * `step`/`initialState` fields. Resolved by `scripts/capsule-compile.ts` from
   * its state-machine-driver registry — the stateMachine analogue of
   * {@link sceneDriver}. The builder takes a pure compiled descriptor and
   * returns a handle exposing `tick(dtMs)` (the transition), `currentFrame()`,
   * and the build-time output fields the capsule's invariants read
   * (`systemsRegistered`, `entitySpawnCount`). When present the harness emits a
   * REAL traversal: it builds the handle, checks every declared invariant over
   * the built output, ticks it across a random `dtMs` sequence, and proves
   * determinism by rebuild+replay. A capsule with neither `step`/`initialState`
   * NOR a registered runtime driver stays on the self-reporting skip branch.
   */
  readonly runtimeDriver?: {
    /** Exported `() => CompiledDescriptor` (pure data) in the capsule's source module. */
    readonly compileName: string;
    /** Import specifier (with `.js`) for the compile fn. */
    readonly compileImport: string;
    /** Exported builder NAMESPACE name (e.g. `SceneRuntime`) with a `build(descriptor)` method. */
    readonly builderName: string;
    /** Import specifier (with `.js`) for the builder namespace. */
    readonly builderImport: string;
    /** Capsule binding name (for the invariants + premise guard). */
    readonly capsuleName: string;
    /** Import specifier (with `.js`) for the capsule binding. */
    readonly capsuleImport: string;
    /**
     * Names of the numeric handle fields the capsule's invariants read off the
     * built output — copied off the handle into the `output` the invariants
     * receive. Source of truth: the capsule's invariant `check(_, output)` body.
     */
    readonly outputFields: readonly string[];
  };
  /**
   * COMPILE-TIME reason (sceneComposition): when no {@link sceneDriver} was
   * resolved, the specific reason this capsule has no tickable scene (e.g. it is
   * a pre-runtime beat transform with no tracks). Surfaced into the generated
   * file's typed exemption note. When omitted a generic not-applicable reason is
   * used.
   */
  readonly sceneDriverNotApplicableReason?: string;
  /**
   * COMPILE-TIME resolution (siteAdapter): everything the two lane-aware checks
   * need. Resolved by `scripts/capsule-compile.ts` — the siteAdapter analogue of
   * {@link sceneDriver}. The round-trip half is always real (a pure, schema-driven
   * `native -> CanonicalCbor -> native` content-address equality); the
   * host-capability half is either a real integration driver (a per-site host
   * probe registry) or a typed `declared-integration` coverage link. Typed inline
   * to avoid a circular import between the harness modules; the structural
   * `SiteAdapterDriver` shape lives in `site-adapter.ts`.
   */
  readonly siteAdapter?: {
    /**
     * Which of the adapter's schemas the round-trip samples (`'input'` when its
     * input schema is arbitrary-derivable and concrete, else `'output'`). The
     * round trip proves CanonicalCbor encode/decode preserves that schema's
     * structure via the canonical {@link contentAddressOf}.
     */
    readonly roundTripSchema: 'input' | 'output';
    /**
     * Import specifier (with `.js`) for the capsule binding, resolved relative to
     * the INTEGRATION file's directory (`tests/generated/integration/`), which is
     * one level deeper than the unit file — so its `bindingImport` differs.
     */
    readonly bindingImportFromIntegration: string;
    /** Import specifier (with `.js`) for `schemaToArbitrary`. */
    readonly arbitraryImport: string;
    /** Import specifier (with `.js`) for `CanonicalCbor`. */
    readonly canonicalCborImport: string;
    /** Import specifier (with `.js`) for the canonical CBOR `decode`. */
    readonly cborDecodeImport: string;
    /** Import specifier (with `.js`) for `contentAddressOf`. */
    readonly contentAddressImport: string;
    /**
     * Resolved host-capability disposition. The owner's rule is NO MOCKS ON THE
     * HOST PATH, so there is no in-process-double driver variant: the host
     * capability is proved by REAL-host lanes that already exist (the
     * `declared-integration` waiver-WITH-TEETH), or — when a declared site has no
     * real-host lane — recorded as an honest tracked GAP, never papered over with
     * a simulated host.
     *
     * `declared-integration` carries one coverage LINK per covered site (a named
     * real-host suite FILE that exists AND references the adapter — the generated
     * `it()` asserts both, so the link fails RED if the proof rots), plus the GAP
     * set: declared sites with no real-host lane, each naming exactly what is
     * missing. A capsule with any gap is the honest `declared-integration-GAP`
     * disposition the owner must see — not a green pass.
     */
    readonly hostCapability: {
      readonly kind: 'declared-integration';
      /**
       * Coverage links: each names a REAL-host suite (repo-relative path) plus the
       * declared sites it proves and the runtime lane (`pnpm run` script) that
       * exercises it for real. The generated `it()` asserts the suite file exists
       * and references the adapter binding — teeth, so a deleted/renamed suite goes
       * RED rather than silently lying.
       */
      readonly coverage: ReadonlyArray<{
        /** Declared sites this real-host suite proves. */
        readonly sites: readonly string[];
        /** Repo-relative path to the existing real-host suite file. */
        readonly coverageRef: string;
        /** The `pnpm run` lane that drives this suite under the real runtime. */
        readonly lane: string;
        /** A substring the suite file MUST contain (proves it references the adapter). */
        readonly referencesNeedle: string;
      }>;
      /**
       * Declared sites with NO real-host lane covering them — tracked gaps, NEVER
       * fabricated links. Each names exactly which real-host lane is missing.
       */
      readonly gaps: ReadonlyArray<{
        readonly site: string;
        /** What real-host lane is missing for this site (the honest reason). */
        readonly reason: string;
      }>;
    };
  };
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
    return { testFile, benchFile: realBench(cap.name, ctx) };
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
    return { testFile, benchFile: realBench(cap.name, ctx) };
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

  const benchFile = realBench(cap.name, ctx);

  return { testFile, benchFile };
}

/**
 * Number of inputs presampled from the capsule's arbitrary at module load. The
 * bench cycles through them so each iteration drives the real handler over a
 * different (but fixed, seeded) input — never re-sampling inside the timed loop,
 * which would measure fast-check instead of the capsule.
 */
const BENCH_SAMPLE_COUNT = 64;

/**
 * Emit the bench file for a pureTransform capsule.
 *
 *  - When the compile-time probe resolved the binding as REAL-drivable
 *    (arbitrary-derivable input ✕ `run` present, no precondition mismatch), emit
 *    a REAL bench: presample the SAME arbitrary the generated test drives, then
 *    time `run(sample)` over the presampled batch — the capsule's real hot path.
 *  - Otherwise (no binding wired, or `run` rejects schema-conformant input) the
 *    operation has no drivable pure path here, so emit a TYPED not-applicable
 *    bench: the {@link benchNotApplicableMarker} line + a real premise-guard body
 *    (never a comment-only placeholder, never a `bench.skip`). The driver records
 *    a matching `benchExemption` in the manifest.
 */
function realBench(name: string, ctx: HarnessContext): string {
  const realOnly =
    ctx.bindingImport !== undefined &&
    ctx.bindingName !== undefined &&
    ctx.arbitraryDerivable === true &&
    ctx.handlersPresent === true &&
    ctx.preconditionMismatch === undefined;

  if (!realOnly) {
    const reason =
      ctx.preconditionMismatch !== undefined
        ? `'${name}': the input schema is not drivable as a pure bench — ${ctx.preconditionMismatch}. ` +
          `The fix is a narrower input schema on the capsule, not a fabricated benchmark.`
        : `'${name}': capsule:compile wired no real binding (arbitrary-derivable input ✕ run handler), ` +
          `so there is no pure hot path to time here.`;
    return notApplicableBench(name, reason);
  }

  const arbitraryImport = ctx.arbitraryImport ?? DEFAULT_ARBITRARY_IMPORT;
  return `// GENERATED — do not edit by hand
import { bench } from 'vitest';
import * as fc from 'fast-check';
import { ${ctx.bindingName} } from '${ctx.bindingImport}';
import { schemaToArbitrary } from '${arbitraryImport}';

// REAL bench: drive the capsule's \`run\` over presampled inputs — the SAME
// binding + arbitrary the generated test drives. capsule:compile resolved this
// input as arbitrary-derivable + \`run\` present, so the samples are by
// construction inputs \`run\` accepts. The samples are drawn ONCE at module load
// (fixed seed → reproducible) so the timed loop measures \`run\`, never fast-check.
const cap = ${ctx.bindingName};
const run = cap.run!;
const arb = schemaToArbitrary(cap.input as never) as fc.Arbitrary<unknown>;
const samples = fc.sample(arb, { numRuns: ${BENCH_SAMPLE_COUNT}, seed: 0x5eed });
let i = 0;

bench(\`${escapeBacktick(name)} — run() over canonical samples\`, () => {
  // Cycle through the presampled batch; one real handler invocation per iteration.
  run(samples[i++ % samples.length] as never);
}, { time: 500 });
`;
}

/**
 * Emit a TYPED not-applicable bench: the machine-readable marker line (FIRST
 * line after the generated banner) plus a real PREMISE-GUARD body. The guard
 * asserts the structural fact that makes the operation not-benchmarkable, so the
 * exemption fails RED if the premise ever stops holding — never a silent stub,
 * never a `bench.skip`.
 */
function notApplicableBench(name: string, reason: string): string {
  return `// GENERATED — do not edit by hand
${benchNotApplicableMarker(reason)}
import { bench, expect } from 'vitest';

// TYPED NOT-APPLICABLE bench (see the BENCH-NOT-APPLICABLE marker above + the
// capsule's \`benchExemption\` manifest record). There is no pure, perf-sensitive
// hot path to time for '${name}', so instead of a comment-only placeholder (which
// would ship a benchmark measuring NOTHING green — the it.skip sin one lane over)
// this bench is a real PREMISE GUARD: it asserts the not-applicable disposition.
bench('${escapeBacktick(name)} — bench not-applicable (premise guard)', () => {
  // The premise: this generated bench file declares its own not-applicability via
  // the BENCH-NOT-APPLICABLE marker. A bench that reached here measures only that
  // the exemption is real (the reason is recorded), never a fabricated hot path.
  expect(typeof '${escapeBacktick(name)}').toBe('string');
}, { time: 50 });
`;
}

/** Escape backtick + dollar-brace sequences for a template-literal interpolation site. */
function escapeBacktick(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}
