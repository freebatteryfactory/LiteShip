/**
 * Harness template for the `stateMachine` assembly arm.
 *
 * With a {@link HarnessContext} the generated test imports the REAL capsule
 * binding and probes its handlers at runtime: when the capsule declares
 * `step` + `initialState`, the test derives a fast-check arbitrary from the
 * input schema (events), drives randomized event sequences from the initial
 * state, asserts every declared invariant after each step, and replays the
 * same sequence twice to prove determinism. When the capsule cannot be
 * harnessed (no runtime driver and no importable binding, or an input schema
 * the arbitrary walker rejects) the generator THROWS a tagged
 * `UnsupportedError` so `capsule:compile` fails loud — never an `it.skip` or a
 * vacuous `() => true` placeholder (wire-or-fail).
 *
 * @module
 */

import { UnsupportedError } from '@liteship/error';
import type { CapsuleDef } from '../assembly.js';
import type { HarnessContext, HarnessOutput } from './pure-transform.js';

const DEFAULT_ARBITRARY_IMPORT = '../../packages/core/src/harness/arbitrary-from-schema.js';

/** Inputs presampled from the event arbitrary at module load (see pure-transform). */
const BENCH_SAMPLE_COUNT = 64;

/** Escape backtick + dollar-brace for a template-literal interpolation site. */
function escapeBacktick(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

/**
 * REAL bench for a runtime-backed stateMachine (scene.runtime): build the handle
 * from the pure compiled descriptor in setup, time ONE `tick(dtMs)` per iteration
 * (the real ECS transition — the same handle the generated test drives), release
 * in teardown. dtMs derives from the descriptor's fps, the source of truth.
 */
function runtimeDriverBench(name: string, d: NonNullable<HarnessContext['runtimeDriver']>): string {
  return `// GENERATED — do not edit by hand
import { bench } from 'vitest';
import { ${d.compileName} } from '${d.compileImport}';
import { ${d.builderName} } from '${d.builderImport}';

// REAL bench: time the runtime-backed transition — SceneRuntime.build(...).tick(dt).
// The compiled descriptor is pure data (built once); the handle is built in setup
// and ticked one frame per iteration, so the loop measures the real ECS tick.
const compiled = ${d.compileName}();
const dtMs = 1000 / (compiled as { fps: number }).fps;
let handle;

bench(
  \`${escapeBacktick(name)} — tick() throughput\`,
  async () => {
    await handle.tick(dtMs);
  },
  {
    time: 2000,
    setup: async () => {
      handle = await ${d.builderName}.build(compiled);
    },
    teardown: async () => {
      await handle.release();
    },
  },
);
`;
}

/**
 * REAL bench for a field-driven stateMachine (token-buffer): presample the event
 * arbitrary the generated test drives, then time `step(initialState, event)` over
 * the presampled batch — the real transition hot path. Samples are drawn once at
 * module load (fixed seed) so the timed loop measures `step`, never fast-check.
 */
function fieldStepBench(name: string, ctx: HarnessContext): string {
  const arbitraryImport = ctx.arbitraryImport ?? DEFAULT_ARBITRARY_IMPORT;
  return `// GENERATED — do not edit by hand
import { bench } from 'vitest';
import * as fc from 'fast-check';
import { ${ctx.bindingName} } from '${ctx.bindingImport}';
import { schemaToArbitrary } from '${arbitraryImport}';

// REAL bench: drive the capsule's \`step\` over presampled events — the SAME
// binding + arbitrary the generated test drives. The seed state is cloned per
// iteration (step may mutate-and-return its state), and events are presampled
// once at module load so the timed loop measures \`step\`, never fast-check.
const cap = ${ctx.bindingName};
const step = cap.step!;
const arb = schemaToArbitrary(cap.input as never) as fc.Arbitrary<unknown>;
const events = fc.sample(arb, { numRuns: ${BENCH_SAMPLE_COUNT}, seed: 0x5eed });
let i = 0;

bench(\`${escapeBacktick(name)} — step() over canonical events\`, () => {
  const state = structuredClone(cap.initialState!);
  step(state as never, events[i++ % events.length] as never);
}, { time: 500 });
`;
}

/** Required driver shape for {@link generateRuntimeDriverTest}. */
type RuntimeDriver = NonNullable<HarnessContext['runtimeDriver']>;

/**
 * Emit a REAL state-machine traversal for a runtime-backed capsule (its
 * transition is a BUILDER + `tick` handle, not declared `step`/`initialState`).
 *
 * Three real checks, no `it.skip`:
 *  1. PREMISE GUARD — pins the disposition: the capsule IS a stateMachine yet
 *     exposes NO `step`/`initialState` (so the field-driven path correctly does
 *     not apply) AND the builder exposes a `build` + the handle a `tick`. If the
 *     capsule ever gains `step`/`initialState`, this fails RED and the harness
 *     must switch to the field-driven traversal.
 *  2. INVARIANTS — build the handle from the pure compiled descriptor, copy the
 *     declared output fields off it, and assert every declared invariant holds.
 *  3. DETERMINISM — tick a fresh handle across a random `dtMs` sequence and
 *     replay the same sequence on another fresh handle; the per-tick frame
 *     index trajectory must be identical (the descriptor is pure data, so two
 *     builds are the canonical "same seed").
 */
function generateRuntimeDriverTest(name: string, d: RuntimeDriver): string {
  const fieldsLiteral = d.outputFields.map((f) => `'${f}'`).join(', ');
  return `// GENERATED — do not edit by hand
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ${d.capsuleName} } from '${d.capsuleImport}';
import { ${d.compileName} } from '${d.compileImport}';
import { ${d.builderName} } from '${d.builderImport}';
import { scaledTimeout } from '../../vitest.shared.js';

describe('${name}', () => {
  const cap = ${d.capsuleName} as {
    _kind?: unknown;
    step?: unknown;
    initialState?: unknown;
    invariants: ReadonlyArray<{ name: string; check: (input: unknown, output: unknown) => boolean }>;
  };
  // This stateMachine realizes its transition in a builder + tick handle, not
  // in declared step/initialState fields. The OUTPUT fields the declared
  // invariants read off the built handle.
  const OUTPUT_FIELDS = [${fieldsLiteral}] as const;

  // The compiled descriptor is PURE data — identical every call — so building a
  // fresh handle from it twice is the canonical "same seed".
  const buildHandle = async () => ${d.builderName}.build(${d.compileName}());
  const handleOutput = (handle: Record<string, () => unknown>): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const f of OUTPUT_FIELDS) {
      const v = (handle as Record<string, unknown>)[f];
      out[f] = typeof v === 'function' ? (v as () => unknown)() : v;
    }
    return out;
  };

  it('premise: a runtime-backed stateMachine — no step/initialState, drives via build + tick', async () => {
    // It IS a stateMachine (so a traversal nominally applies)...
    expect(cap._kind).toBe('stateMachine');
    // ...but carries NO field-driven transition — that absence is exactly what
    // routes it to this builder-driven traversal. If it ever gains these, this
    // guard fails RED and the harness must use the field-driven path instead.
    expect(cap.step).toBeUndefined();
    expect(cap.initialState).toBeUndefined();
    const handle = await buildHandle();
    try {
      expect(typeof handle.tick).toBe('function');
      expect(typeof handle.currentFrame).toBe('function');
    } finally {
      await handle.release();
    }
  });

  it('invariants hold over the built runtime output', async () => {
    const handle = await buildHandle();
    try {
      const output = handleOutput(handle as unknown as Record<string, () => unknown>);
      for (const inv of cap.invariants) {
        expect(inv.check({ scene: ${d.compileName}() }, output), inv.name).toBe(true);
      }
    } finally {
      await handle.release();
    }
  });

  it('deterministic replay: the same dtMs sequence yields the same frame trajectory', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Positive frame-scale dt steps (ms) — a realistic forward playback path.
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 24 }),
        async (dts) => {
          const trajectory = async (): Promise<readonly number[]> => {
            const handle = await buildHandle();
            try {
              const frames: number[] = [];
              for (const dt of dts) {
                await handle.tick(dt);
                frames.push(handle.currentFrame());
              }
              return frames;
            } finally {
              await handle.release();
            }
          };
          expect(await trajectory()).toEqual(await trajectory());
        },
      ),
      { numRuns: 20 },
    );
  }, scaledTimeout(30000));
});
`;
}

/**
 * Generate the test + bench file contents for a `stateMachine` capsule.
 * A runtime-backed machine drives via its build+tick handle; a field-driven
 * machine drives its real `step`. With neither a runtime driver nor an
 * importable binding the generator THROWS a tagged `UnsupportedError`
 * (wire-or-fail) rather than emitting a placeholder.
 */
export function generateStateMachine(
  cap: CapsuleDef<'stateMachine', unknown, unknown, unknown>,
  ctx: HarnessContext = {},
): HarnessOutput {
  const arbitraryImport = ctx.arbitraryImport ?? DEFAULT_ARBITRARY_IMPORT;

  // Runtime-backed state machines (e.g. `scene.runtime`) realize their
  // transition in a BUILDER + `tick` handle, not in declared `step`/`initialState`
  // fields, and carry no importable field binding. Handle them FIRST so the
  // no-binding guard below never mistakes them for an unwired capsule. The
  // generated traversal builds the handle, checks every declared invariant over
  // the built output, ticks across a random dtMs sequence, and proves determinism
  // by rebuild+replay. The bench times the REAL `tick`. No `it.skip` token.
  if (ctx.runtimeDriver !== undefined) {
    return {
      testFile: generateRuntimeDriverTest(cap.name, ctx.runtimeDriver),
      benchFile: runtimeDriverBench(cap.name, ctx.runtimeDriver),
    };
  }

  if (ctx.bindingImport === undefined || ctx.bindingName === undefined) {
    // Wire-or-fail: a generator emits a real test or throws — never a skip.
    throw UnsupportedError(
      'stateMachine harness',
      `cannot harness stateMachine capsule '${cap.name}': capsule:compile resolved neither a runtime tick ` +
        `driver nor an importable field binding (bindingImport + bindingName). Export the binding (or register ` +
        `a runtime driver) and re-run pnpm run capsule:compile.`,
    );
  }

  // COMPILE-TIME probe must have resolved the event schema as arbitrary-derivable
  // AND `step` + `initialState` present. Wire-or-fail: any lesser disposition
  // throws here — we emit ONLY the FINAL real-only test, never an `it.skip` token.
  if (ctx.arbitraryDerivable !== true || ctx.handlersPresent !== true) {
    throw UnsupportedError(
      'stateMachine harness',
      `cannot harness stateMachine capsule '${cap.name}': capsule:compile did not resolve it as ` +
        `arbitrary-derivable (got ${String(ctx.arbitraryDerivable)}) with step + initialState present ` +
        `(got ${String(ctx.handlersPresent)}). All must probe true to emit a real traversal — fix the ` +
        `binding/schema and re-run pnpm run capsule:compile.`,
    );
  }

  const testFile = `// GENERATED — do not edit by hand
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ${ctx.bindingName} } from '${ctx.bindingImport}';
import { schemaToArbitrary } from '${arbitraryImport}';

describe('${cap.name}', () => {
  const cap = ${ctx.bindingName};
  // Resolved arbitrary-derivable + step/initialState present at capsule:compile.
  const eventArb = schemaToArbitrary(cap.input as never) as fc.Arbitrary<unknown>;
  const step = cap.step!;
  // The contract's step(state, event) signature permits implementations
  // that mutate and return their state object — a shared seed would let
  // one fast-check case contaminate the next. Clone the seed per fold.
  const seedState = (): unknown => structuredClone(cap.initialState!);

  it('invariants hold after every step across random event paths', () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 50 }), (events) => {
        let state = seedState();
        for (const event of events) {
          state = step(state as never, event as never);
          for (const inv of cap.invariants) {
            if (!inv.check(event as never, state as never)) return false;
          }
        }
        return true;
      }),
      { numRuns: 100 },
    );
  });

  it('replays deterministically from an event log', () => {
    fc.assert(
      fc.property(fc.array(eventArb, { maxLength: 50 }), (events) => {
        const replay = (): unknown =>
          events.reduce((state, event) => step(state as never, event as never), seedState());
        expect(replay()).toEqual(replay());
      }),
      { numRuns: 50 },
    );
  });
});
`;

  // Both throws above are passed, so this is a real field-driven machine
  // (arbitrary-derivable event schema ✕ step + initialState present): the bench
  // times the REAL `step` over presampled events. There is no not-applicable
  // disposition that returns from here — every lesser case threw.
  return { testFile, benchFile: fieldStepBench(cap.name, ctx) };
}
