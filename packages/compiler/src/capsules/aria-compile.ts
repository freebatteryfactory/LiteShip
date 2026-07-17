/**
 * Capsule declaration locking the {@link ARIACompiler.compile} contract as a
 * standing `pureTransform` over a SEEDED Boundary + per-state ARIA attribute
 * domain.
 *
 * WHY `pureTransform` / WHY SEED MATERIAL: `compile` is pure over (boundary,
 * states, currentState). The arbitrary-from-schema walker cannot mint a
 * per-state `Record` (index signatures throw) nor a content-addressed
 * `Boundary` id, so the input is a state-name list plus per-state attribute
 * ENTRY lists (key + value), which `run` normalizes into a real Boundary and the
 * per-state attribute maps the compiler consumes. The invariants assert over the
 * REAL compile output.
 *
 * DIAGNOSTIC HYGIENE: `ARIACompiler.compile` warns through `Diagnostics` on every
 * dropped (non-`aria-*`/non-`role`) key. The default diagnostics sink writes to
 * `console.warn`, which a 100-run property test would flood. `run` therefore
 * swaps in a throwaway buffer sink for the duration of the compile and restores
 * the default afterwards — anti-fragile (no console noise, no flaky timer), and
 * the drop COUNT is still observable for the survival law via the realized
 * authored-vs-output key sets.
 *
 * @module
 */

import { defineCapsule, Boundary, Diagnostics, BoundaryAttribute, S } from '@czap/core';
import type { Infer } from '@czap/core';
import { ARIACompiler } from '../aria.js';
import type { ARIACompileResult } from '../aria.js';

/** A single authored attribute entry (key + value), the seed unit for a state map. */
const AttrEntry = S.struct({
  key: S.string,
  value: S.string,
});

/** Seed material the schema-arbitrary CAN produce. `run` normalizes it. */
const ARIACompileSeed = S.struct({
  /** Candidate state names → deduped, ascending-thresholded boundary states. */
  states: S.array(S.string),
  /**
   * Per-state authored attribute entries `entries[stateIdx]`. Keys are free
   * strings, so the domain spans both valid (`aria-*`/`role`) and invalid keys —
   * exercising both the survival and the drop branches of the validator.
   */
  entries: S.array(S.array(AttrEntry)),
});

type ARIACompileSeedValue = Infer<typeof ARIACompileSeed>;

/** Per-state attribute maps in the shape `ARIACompiler.compile` consumes. */
type StateAttrs = Record<string, Record<string, string>>;

/** The output: realized boundary inputs + the compile result. */
interface ARIACompileOutput {
  readonly stateNames: readonly string[];
  readonly currentState: string;
  /** The per-state authored attribute maps actually fed to `compile`. */
  readonly authored: StateAttrs;
  readonly result: ARIACompileResult;
}

/** Build a valid Boundary from a recorded (deduped) state-name list. */
function makeBoundary(stateNames: readonly string[]): Boundary.Shape {
  const at = stateNames.map((name, i) => [i, name] as const);
  return Boundary.make({
    input: 'seed.signal',
    at: at as unknown as readonly [readonly [number, string]],
  }) as unknown as Boundary.Shape;
}

/** Normalize a seed into a real Boundary + per-state attribute maps + currentState. */
function buildInputs(seed: ARIACompileSeedValue): {
  boundary: Boundary.Shape;
  authored: StateAttrs;
  stateNames: string[];
  currentState: string;
} {
  const stateNames: string[] = [];
  const seenStates = new Set<string>();
  for (const raw of seed.states) {
    if (seenStates.has(raw)) continue;
    seenStates.add(raw);
    stateNames.push(raw);
    if (stateNames.length >= 6) break;
  }
  if (stateNames.length === 0) stateNames.push('s0');

  // NULL-PROTOTYPE: author-controlled state names and attr keys (a literal
  // `__proto__`/`constructor`) must land as OWN properties, not mutate the
  // prototype — else a bracket-access read in the compiler and an own-keys read
  // in an invariant disagree. Mirrors the GLSL/WGSL capsule fixes.
  const authored: StateAttrs = Object.create(null) as StateAttrs;
  for (let s = 0; s < stateNames.length; s++) {
    const entries = seed.entries[s] ?? [];
    const map: Record<string, string> = Object.create(null) as Record<string, string>;
    for (const { key, value } of entries) map[key] = value; // later entry wins on dup key
    authored[stateNames[s]!] = map;
  }

  // currentState is always one of the boundary's states (the first).
  return { boundary: makeBoundary(stateNames), authored, stateNames, currentState: stateNames[0]! };
}

/**
 * Run `ARIACompiler.compile` with the diagnostics sink redirected to a throwaway
 * buffer (suppressing console noise from dropped-key warnings), then restore the
 * default sink. Pure from the caller's view.
 */
function compileQuietly(boundary: Boundary.Shape, authored: StateAttrs, currentState: string): ARIACompileResult {
  const { sink } = Diagnostics.createBufferSink();
  // Restore the PREVIOUSLY-active sink (not the default) so a host that installed
  // a custom sink keeps capturing diagnostics after this capsule runs — the
  // capsule stays pure w.r.t. global diagnostics state.
  const previous = Diagnostics.setSink(sink);
  try {
    return ARIACompiler.compile(boundary, authored as { [s: string]: Record<string, string> }, currentState);
  } finally {
    Diagnostics.setSink(previous);
  }
}

/**
 * Declared capsule for the ARIA compiler. The generated property test feeds
 * schema-seeds; `run` builds a real Boundary + attribute maps and calls
 * `ARIACompiler.compile`; the invariants assert the coverage / determinism /
 * allowed-keys-only LAWS over the REAL compile output.
 */
export const ariaCompileCapsule = defineCapsule({
  _kind: 'pureTransform',
  name: 'compiler.aria-compile',
  input: ARIACompileSeed,
  output: S.unknown,
  capabilities: { reads: [], writes: [] },
  invariants: [
    {
      name: 'every-state-covered',
      check: (_input: unknown, output: unknown): boolean => {
        const o = output as ARIACompileOutput;
        // Every boundary state has an entry in stateAttributes (a defined map,
        // possibly empty) — no state may be dropped from the projection.
        for (const state of o.stateNames) {
          const map = (o.result.stateAttributes as Record<string, Record<string, string>>)[state];
          if (map === undefined || typeof map !== 'object') return false;
        }
        return true;
      },
      message: 'every boundary state must appear in stateAttributes',
    },
    {
      name: 'determinism',
      check: (_input: unknown, output: unknown): boolean => {
        const o = output as ARIACompileOutput;
        const again = compileQuietly(makeBoundary(o.stateNames), o.authored, o.currentState);
        return (
          JSON.stringify(again.stateAttributes) === JSON.stringify(o.result.stateAttributes) &&
          JSON.stringify(again.currentAttributes) === JSON.stringify(o.result.currentAttributes)
        );
      },
      message: 'compile must be deterministic (same boundary + attributes → identical output)',
    },
    {
      name: 'only-allowed-aria-keys-survive',
      check: (_input: unknown, output: unknown): boolean => {
        const o = output as ARIACompileOutput;
        // Survival law (both directions): the output for each state contains
        // EXACTLY the authored keys that pass BoundaryAttribute.isAllowedKey —
        // every allowed key survives, every disallowed key is dropped, and no
        // key is invented.
        const stateAttrs = o.result.stateAttributes as Record<string, Record<string, string>>;
        for (const state of o.stateNames) {
          const authored = o.authored[state] ?? {};
          const out = stateAttrs[state] ?? {};
          // No surviving key may be disallowed, and value fidelity holds.
          for (const [key, value] of Object.entries(out)) {
            if (!BoundaryAttribute.isAllowedKey(key)) return false;
            if (authored[key] !== value) return false;
          }
          // Every allowed authored key must survive.
          for (const [key, value] of Object.entries(authored)) {
            if (BoundaryAttribute.isAllowedKey(key) && out[key] !== value) return false;
          }
        }
        // currentAttributes mirrors the active state's surviving set.
        const expectedCurrent = stateAttrs[o.currentState] ?? {};
        return JSON.stringify(o.result.currentAttributes) === JSON.stringify(expectedCurrent);
      },
      message: 'only aria-* / role keys survive, all of them do, and values are preserved',
    },
  ],
  budgets: { p95Ms: 1, allocClass: 'bounded' },
  site: ['node', 'browser', 'worker', 'edge'],
  run: (input: ARIACompileSeedValue): ARIACompileOutput => {
    const { boundary, authored, stateNames, currentState } = buildInputs(input);
    const result = compileQuietly(boundary, authored, currentState);
    return { stateNames, currentState, authored, result };
  },
});

/** Internal helpers exported for direct unit assertions over the seed→inputs builder. */
export const _ariaCompileInternals = { buildInputs, makeBoundary, compileQuietly } as const;
