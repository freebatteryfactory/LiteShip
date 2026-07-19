/**
 * Capsule declaration locking the {@link GLSLCompiler.compile} contract as a
 * standing `pureTransform` over a SEEDED Boundary + per-state value domain.
 *
 * WHY `pureTransform`: `compile` is a pure function of (boundary, states) — no
 * receipt byte law, no async hashing, no mutate channel. The schema-derived
 * property harness fits the value-level laws exactly.
 *
 * WHY THE INPUT IS SEED MATERIAL (not a raw `Boundary` + `Record` map): the
 * arbitrary-from-schema walker supports string / number / array / struct
 * but THROWS on index signatures (`S.record`), so a per-state
 * `Record<fieldName, number>` cannot be schema-arbitrary-minted, and a raw
 * `Boundary` carries a content-addressed `id` the walker can't forge. So the
 * input schema generates a small, fully-supported SEED domain — state-name and
 * field-name lists plus a value MATRIX — and `run` builds a real, valid
 * `Boundary` (deduped names, strictly-ascending thresholds) and zips the matrix
 * into the per-state value maps `GLSLCompiler.compile` consumes. The invariants
 * then assert over the REAL compile output, never a weakened stand-in.
 *
 * THE COMPLETENESS LAW (invariant c) is the regression guard for the
 * omitted-uniform-reset fix: WebGL uniforms persist across draws, so a uniform
 * authored in only some states must be explicitly RESET (0) where omitted —
 * `stateUniforms[state]` must therefore carry EVERY authored uniform name for
 * EVERY state. The seed deliberately exercises ragged per-state field coverage
 * (a state row shorter than the field list omits the tail), so the property test
 * regularly hits the omitted-uniform case the unit test pins by hand.
 *
 * @module
 */

import { defineCapsule, Boundary, glslIdent, S } from '@liteship/core';
import type { Infer } from '@liteship/core';
import { GLSLCompiler } from '../glsl.js';
import type { GLSLCompileResult } from '../glsl.js';

/**
 * Seed material the schema-arbitrary CAN produce (string / number / array are
 * fully supported kernel AST nodes). `run` normalizes it into a valid Boundary +
 * the per-state value maps.
 */
const GLSLCompileSeed = S.struct({
  /** Candidate state names → deduped, ascending-thresholded boundary states. */
  states: S.array(S.string),
  /** Candidate field names → deduped authored uniform key set. */
  fields: S.array(S.string),
  /**
   * Value matrix `values[stateIdx][fieldIdx]`. A row shorter than `fields`
   * omits that state's trailing fields (ragged coverage → exercises the
   * omitted-uniform-reset completeness law). All values are integers (the
   * number arbitrary mints `fc.integer()`), so the int-type law holds.
   */
  values: S.array(S.array(S.number)),
});

type GLSLCompileSeedValue = Infer<typeof GLSLCompileSeed>;

/** Per-state value maps in the shape `GLSLCompiler.compile` consumes. */
type StateMaps = { [s: string]: Record<string, number> };

/** The output: the realized boundary inputs plus the compile result. */
interface GLSLCompileOutput {
  readonly stateNames: readonly string[];
  readonly fieldNames: readonly string[];
  /** The per-state value maps actually fed to `compile` (post-normalization). */
  readonly states: Record<string, Record<string, number>>;
  readonly result: GLSLCompileResult;
}

/** Build a valid Boundary from a recorded (deduped) state-name list. */
function makeBoundary(stateNames: readonly string[]): Boundary.Shape {
  const at = stateNames.map((name, i) => [i, name] as const);
  return Boundary.make({
    input: 'seed.signal',
    at: at as unknown as readonly [readonly [number, string]],
  }) as unknown as Boundary.Shape;
}

/**
 * Normalize a seed into a real, valid Boundary plus the per-state value maps.
 * Dedups state names (so thresholds stay strictly ascending without collision),
 * caps the domain to keep the budget honest, and zips the value matrix into
 * `{ [state]: { [field]: number } }`. A missing matrix cell (ragged row) simply
 * omits that field for that state — the very condition the completeness law
 * guards.
 */
function buildInputs(seed: GLSLCompileSeedValue): {
  boundary: Boundary.Shape;
  states: StateMaps;
  stateNames: string[];
  fieldNames: string[];
} {
  // Dedup state names; ensure at least one (Boundary requires a non-empty tuple).
  const stateNames: string[] = [];
  const seenStates = new Set<string>();
  for (const raw of seed.states) {
    if (seenStates.has(raw)) continue;
    seenStates.add(raw);
    stateNames.push(raw);
    if (stateNames.length >= 6) break; // bound the domain for budget honesty
  }
  if (stateNames.length === 0) stateNames.push('s0');

  // Dedup field names by their FOLDED identity (`glslIdent`), not the raw string.
  // Two distinct raw keys that fold to the same uniform (e.g. `C` and `c` both →
  // `u_c`) denote the SAME uniform: the real projection pipeline feeds canonical,
  // already-folded keys, so colliding raw keys never co-occur. Synthesizing both
  // would make the per-state value-fidelity law impossible (two authored values,
  // one folded slot) and the type-inference law ambiguous (one uniform, two
  // types). Deduping on the fold keeps the seed faithful and the laws well-defined.
  const fieldNames: string[] = [];
  const seenFields = new Set<string>();
  for (const raw of seed.fields) {
    const folded = glslIdent(raw);
    if (seenFields.has(folded)) continue;
    seenFields.add(folded);
    fieldNames.push(raw);
    if (fieldNames.length >= 6) break;
  }

  const boundary = makeBoundary(stateNames);

  // Zip the value matrix into per-state value maps. A short row omits the tail.
  // NULL-PROTOTYPE (both the outer state map and each inner field map): state and
  // field names are author-controlled seed strings, so a name literally `__proto__`
  // or `constructor` must land as an OWN property, never mutate the object's
  // prototype. A plain `{}` here would make `states['__proto__'] = map` set the
  // PROTOTYPE — the production `GLSLCompiler.compile` then reads it back via bracket
  // access (`states[name]`, reaching through the chain) while the invariant's
  // `Object.values(o.states)` sees only own keys, and the two disagree on the
  // inferred type. This mirrors the compiler's own `stateUniforms = Object.create(null)`
  // (glsl.ts) so the harness faithfully represents what it feeds the compiler.
  const states: StateMaps = Object.create(null) as StateMaps;
  for (let s = 0; s < stateNames.length; s++) {
    const row = seed.values[s] ?? [];
    const map: Record<string, number> = Object.create(null) as Record<string, number>;
    for (let f = 0; f < fieldNames.length; f++) {
      const v = row[f];
      if (v === undefined) continue; // ragged → omit this field for this state
      map[fieldNames[f]!] = v;
    }
    states[stateNames[s]!] = map;
  }

  return { boundary, states, stateNames, fieldNames };
}

/**
 * Declared capsule for the GLSL compiler. Registered at import time; walked by
 * the factory compiler. The generated property test feeds schema-seeds, `run`
 * builds a real Boundary + state maps and calls `GLSLCompiler.compile`, and the
 * invariants assert the u_state / determinism / per-state-completeness /
 * int-type LAWS over the REAL compile output.
 */
export const glslCompileCapsule = defineCapsule({
  _kind: 'pureTransform',
  name: 'compiler.glsl-compile',
  input: GLSLCompileSeed,
  output: S.unknown,
  capabilities: { reads: [], writes: [] },
  invariants: [
    {
      name: 'u-state-uniform-present-and-int',
      check: (_input: unknown, output: unknown): boolean => {
        const o = output as GLSLCompileOutput;
        // The state-index uniform is ALWAYS present, first, and typed `int`.
        const u = o.result.uniforms[0];
        return u !== undefined && u.name === 'u_state' && u.type === 'int';
      },
      message: 'u_state must be present as the first uniform and typed int',
    },
    {
      name: 'determinism',
      check: (_input: unknown, output: unknown): boolean => {
        const o = output as GLSLCompileOutput;
        // Re-compiling the SAME inputs reproduces the same declarations /
        // bindUniforms / values byte-for-byte.
        const again = GLSLCompiler.compile(makeBoundary(o.stateNames), o.states as StateMaps);
        return (
          again.declarations === o.result.declarations &&
          again.bindUniforms === o.result.bindUniforms &&
          JSON.stringify(again.uniformValues) === JSON.stringify(o.result.uniformValues)
        );
      },
      message: 'compile must be deterministic (same boundary + states → identical output)',
    },
    {
      name: 'per-state-completeness',
      check: (_input: unknown, output: unknown): boolean => {
        const o = output as GLSLCompileOutput;
        // The omitted-uniform-reset law: every authored uniform name appears in
        // EVERY state's map (omitted → 0). This is the WebGL-uniforms-persist
        // regression guard — a partial per-state map would leave the shader
        // sampling the prior state's value forever.
        const authored = new Set<string>();
        for (const map of Object.values(o.states)) {
          for (const key of Object.keys(map)) authored.add(glslIdent(key));
        }
        for (const state of o.stateNames) {
          const perState = o.result.stateUniforms[state];
          if (perState === undefined) return false;
          for (const uniformName of authored) {
            if (!(uniformName in perState)) return false;
          }
        }
        return true;
      },
      message: 'every state map must carry every authored uniform name (omitted → 0): WebGL uniforms persist',
    },
    {
      name: 'integer-values-infer-int',
      check: (_input: unknown, output: unknown): boolean => {
        const o = output as GLSLCompileOutput;
        // All authored values are integers (the Number arbitrary mints
        // integers). A NON-NEGATIVE integer field must infer `int`; a field
        // carrying any negative value promotes to float (GLSL sign-extension
        // safety). Pin the exact rule over the realized values.
        for (const u of o.result.uniforms) {
          if (u.name === 'u_state') continue;
          const vals: number[] = [];
          for (const map of Object.values(o.states)) {
            for (const [key, v] of Object.entries(map)) {
              if (glslIdent(key) === u.name) vals.push(v);
            }
          }
          if (vals.length === 0) continue;
          const expected = vals.some((v) => v < 0) ? 'float' : 'int';
          if (u.type !== expected) return false;
        }
        return true;
      },
      message: 'non-negative integer values must infer int; any negative value promotes to float',
    },
  ],
  budgets: { p95Ms: 5, allocClass: 'bounded' },
  site: ['node', 'browser', 'worker', 'edge'],
  run: (input: GLSLCompileSeedValue): GLSLCompileOutput => {
    const { boundary, states, stateNames, fieldNames } = buildInputs(input);
    const result = GLSLCompiler.compile(boundary, states);
    return { stateNames, fieldNames, states, result };
  },
});

/** Internal helpers exported for direct unit assertions over the seed→inputs builder. */
export const _glslCompileInternals = { buildInputs, makeBoundary } as const;
