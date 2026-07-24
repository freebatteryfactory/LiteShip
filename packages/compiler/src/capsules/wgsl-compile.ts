/**
 * Capsule declaration locking the {@link WGSLCompiler.compile} contract as a
 * standing `pureTransform` over a SEEDED Boundary + per-state value domain — the
 * WGSL mirror of `glsl-compile.ts`.
 *
 * WHY `pureTransform` / WHY SEED MATERIAL: identical to the GLSL arm — `compile`
 * is pure over (boundary, states), and the arbitrary-from-schema walker cannot
 * mint a per-state `Record` (index signatures throw) nor a content-addressed
 * `Boundary` id. So the input is a state-name + field-name + value-matrix seed
 * `run` normalizes into a real Boundary + the per-state value maps the compiler
 * consumes; the invariants assert over the REAL compile output.
 *
 * THE PER-STATE `stateBindings` LAW (invariant c) is the GLSL-mirror
 * isomorphism: the WGSL compiler must expose each state's AUTHORED field values
 * via `stateBindings[state]`, not just the merged last-state default — the WGSL
 * analog of GLSL's `stateUniforms`, carried end-to-end so a crossing resolves
 * `stateBindings[currentState]`. (Unlike GLSL, WGSL does NOT pad omitted fields
 * to 0 — the per-snapshot buffer clear handles resets — so the law is exact-set
 * equality with the AUTHORED keys, not completion to 0.)
 *
 * @module
 */

import { defineCapsule, wgslIdent, defineBoundary, schema } from '@liteship/core';
import type { Infer, Boundary } from '@liteship/core';
import { WGSLCompiler } from '../wgsl.js';
import type { WGSLCompileResult } from '../wgsl.js';

/** Seed material the schema-arbitrary CAN produce. `run` normalizes it. */
const WGSLCompileSeed = schema.struct({
  /** Candidate state names → deduped, ascending-thresholded boundary states. */
  states: schema.array(schema.string),
  /** Candidate field names → deduped authored struct-field key set. */
  fields: schema.array(schema.string),
  /** Value matrix `values[stateIdx][fieldIdx]`; a short row omits the tail. */
  values: schema.array(schema.array(schema.number)),
});

type WGSLCompileSeedValue = Infer<typeof WGSLCompileSeed>;

/** Per-state value maps in the shape `WGSLCompiler.compile` consumes. */
type StateMaps = { [s: string]: Record<string, number> };

/** The output: the realized boundary inputs plus the compile result. */
interface WGSLCompileOutput {
  readonly stateNames: readonly string[];
  readonly fieldNames: readonly string[];
  readonly states: Record<string, Record<string, number>>;
  readonly result: WGSLCompileResult;
}

/** Build a valid Boundary from a recorded (deduped) state-name list. */
function makeBoundary(stateNames: readonly string[]): Boundary {
  const at = stateNames.map((name, i) => [i, name] as const);
  return defineBoundary({
    input: 'seed.signal',
    at: at as unknown as readonly [readonly [number, string]],
  }) as unknown as Boundary;
}

/** Normalize a seed into a real Boundary + per-state value maps (see glsl-compile.ts). */
function buildInputs(seed: WGSLCompileSeedValue): {
  boundary: Boundary;
  states: StateMaps;
  stateNames: string[];
  fieldNames: string[];
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

  // Dedup field names by their FOLDED identity (`wgslIdent`), not the raw string —
  // two raw keys that fold to the same struct field (e.g. `C` and `c`) are the
  // SAME field. The real pipeline feeds canonical folded keys, so colliding raw
  // keys never co-occur; synthesizing both would make the per-state value-fidelity
  // law impossible (two values, one folded slot). Mirrors the GLSL capsule fix.
  const fieldNames: string[] = [];
  const seenFields = new Set<string>();
  for (const raw of seed.fields) {
    const folded = wgslIdent(raw);
    if (seenFields.has(folded)) continue;
    seenFields.add(folded);
    fieldNames.push(raw);
    if (fieldNames.length >= 6) break;
  }

  const boundary = makeBoundary(stateNames);

  // NULL-PROTOTYPE: author-controlled state/field names (a literal `__proto__` or
  // `constructor`) must land as OWN properties, not mutate the prototype — else a
  // bracket-access read in the compiler and an own-keys read in an invariant
  // disagree. Mirrors the GLSL capsule fix and the compiler's own null-proto maps.
  const states: StateMaps = Object.create(null) as StateMaps;
  for (let s = 0; s < stateNames.length; s++) {
    const row = seed.values[s] ?? [];
    const map: Record<string, number> = Object.create(null) as Record<string, number>;
    for (let f = 0; f < fieldNames.length; f++) {
      const v = row[f];
      if (v === undefined) continue;
      map[fieldNames[f]!] = v;
    }
    states[stateNames[s]!] = map;
  }

  return { boundary, states, stateNames, fieldNames };
}

/**
 * Declared capsule for the WGSL compiler. The generated property test feeds
 * schema-seeds; `run` builds a real Boundary + state maps and calls
 * `WGSLCompiler.compile`; the invariants assert the state_index / determinism /
 * per-state-stateBindings / type-promotion LAWS over the REAL compile output.
 */
export const wgslCompileCapsule = defineCapsule({
  _kind: 'pureTransform',
  name: 'compiler.wgsl-compile',
  input: WGSLCompileSeed,
  output: schema.unknown,
  capabilities: { reads: [], writes: [] },
  invariants: [
    {
      name: 'state-index-first-field-u32',
      check: (_input: unknown, output: unknown): boolean => {
        const o = output as WGSLCompileOutput;
        // The struct's first field is ALWAYS `{ name: 'state_index', type: 'u32' }`.
        const struct = o.result.structs[0];
        const first = struct?.fields[0];
        return first !== undefined && first.name === 'state_index' && first.type === 'u32';
      },
      message: "the struct's first field must be { name: 'state_index', type: 'u32' }",
    },
    {
      name: 'determinism',
      check: (_input: unknown, output: unknown): boolean => {
        const o = output as WGSLCompileOutput;
        const again = WGSLCompiler.compile(makeBoundary(o.stateNames), o.states as StateMaps);
        return (
          again.declarations === o.result.declarations &&
          JSON.stringify(again.bindingValues) === JSON.stringify(o.result.bindingValues) &&
          JSON.stringify(again.structs) === JSON.stringify(o.result.structs)
        );
      },
      message: 'compile must be deterministic (same boundary + states → identical output)',
    },
    {
      name: 'per-state-bindings-carry-authored-fields',
      check: (_input: unknown, output: unknown): boolean => {
        const o = output as WGSLCompileOutput;
        // The GLSL-mirror isomorphism: stateBindings[state] carries EXACTLY each
        // state's AUTHORED fields (snake-folded). Unlike GLSL, omitted fields are
        // NOT padded to 0 (the per-snapshot buffer clear handles resets), so this
        // is exact-set equality with the authored keys, plus value fidelity.
        for (const state of o.stateNames) {
          const authored = o.states[state] ?? {};
          const binding = o.result.stateBindings[state];
          if (binding === undefined) return false;
          const expectedKeys = new Set(Object.keys(authored).map(wgslIdent));
          const actualKeys = new Set(Object.keys(binding));
          if (expectedKeys.size !== actualKeys.size) return false;
          for (const k of expectedKeys) if (!actualKeys.has(k)) return false;
          // Value fidelity: each authored value survives to its folded field.
          for (const [key, v] of Object.entries(authored)) {
            if (binding[wgslIdent(key)] !== v) return false;
          }
        }
        return true;
      },
      message: "stateBindings[state] must carry exactly each state's authored fields (the GLSL stateUniforms mirror)",
    },
    {
      name: 'type-promotion-f32-i32-u32',
      check: (_input: unknown, output: unknown): boolean => {
        const o = output as WGSLCompileOutput;
        // All authored values are integers (the Number arbitrary mints
        // integers), so f32 never appears here; the i32>u32 tier is exercised by
        // negative values. Pin the exact promotion: a field carrying any
        // negative value is i32, otherwise u32. (Float→f32 is unit-tested
        // separately since the arbitrary domain is integer-only.)
        const struct = o.result.structs[0];
        if (struct === undefined) return false;
        for (const field of struct.fields) {
          if (field.name === 'state_index') continue;
          const vals: number[] = [];
          for (const map of Object.values(o.states)) {
            for (const [key, v] of Object.entries(map)) {
              if (wgslIdent(key) === field.name) vals.push(v);
            }
          }
          if (vals.length === 0) continue;
          const expected = vals.some((v) => v < 0) ? 'i32' : 'u32';
          if (field.type !== expected) return false;
        }
        return true;
      },
      message: 'integer fields promote to i32 when any value is negative, else u32 (f32 > i32 > u32)',
    },
  ],
  budgets: { p95Ms: 8, allocClass: 'bounded' },
  site: ['node', 'browser', 'worker', 'edge'],
  run: (input: WGSLCompileSeedValue): WGSLCompileOutput => {
    const { boundary, states, stateNames, fieldNames } = buildInputs(input);
    const result = WGSLCompiler.compile(boundary, states);
    return { stateNames, fieldNames, states, result };
  },
});

/** Internal helpers exported for direct unit assertions over the seed→inputs builder. */
export const _wgslCompileInternals = { buildInputs, makeBoundary } as const;
