/**
 * Spine-relation facts — the pre-computed, host-built TWO-AXIS classification the
 * {@link spineRelationGate} folds into {@link Finding}s (Wave 8.5, the constitution's
 * STATIC-projection half — the spine mirror as a declared projection of the runtime
 * surface, Axiom 3).
 *
 * This module defines the {@link SpineRelationFacts} INTERFACE and the two PURE
 * classifiers ({@link classifyStructuralRelation}, {@link relationSatisfied}) — and
 * nothing else. Like {@link TransitionFacts} / {@link MutationFacts}, it carries no
 * heavy dependency: `@czap/gauntlet` stays the lean engine with NO `typescript`
 * dependency, so it never opens a `ts.Program` or runs the type checker. A HOST
 * (`@czap/audit`'s `buildSpineRelationFacts`) does the heavy lifting — generate a
 * bidirectional-assignability probe per admitted mirror type, compile it, read the
 * compiler's own diagnostics, classify each relation — and hands the engine these
 * flat, already-observed facts. The gate's only job is to FOLD them into Findings
 * (ADR-0023: the lean engine folds facts; the host computes them).
 *
 * THE TWO AXES (grounded in ADR-0010 — the spine is the canonical OWNER of branded
 * types; other declarations MIRROR runtime types). A mirror declaration is
 * classified on two ORTHOGONAL axes, never eight ad-hoc modes:
 *  - **Authority** `{spine | runtime | generated}` — WHO OWNS the type. `spine`: a
 *    branded scalar the spine declares and the runtime re-exports (ADR-0010's
 *    `import type X as _X` re-anchor). `runtime`: a shape the runtime owns and the
 *    spine hand-mirrors (CompositeState, CapSet, Codec…). `generated`: emitted by a
 *    codegen (none today — the arm is reserved, Conflict-1's `gen-spine` is
 *    superseded).
 *  - **SurfaceRelation** `{exact | public-narrower | public-wider | opaque |
 *    brand-reanchored | runtime-exists | intentionally-omitted}` — HOW the mirror
 *    relates to its source. The first four are the STRUCTURAL relation the checker
 *    observes via bidirectional assignability; `brand-reanchored` is the
 *    Authority-spine re-export (structurally identical, provenance recorded);
 *    `runtime-exists` is value-existence (a relation over types cannot prove a value
 *    EXISTS — those stay as the kept runtime-existence describes); `intentionally-
 *    omitted` is a runtime type deliberately NOT mirrored — made visible not by THIS
 *    gate but by the committed type-export SNAPSHOT (`tests/fixtures/type-export-
 *    surface.json`): a mirror type that vanishes reds the snapshot, and regenerating it
 *    is the deliberate omission. `runtime-exists` and `intentionally-omitted` are
 *    therefore vocabulary arms the structural fold defensively refuses (never admits),
 *    not relations this gate probes.
 *
 * The SOURCE is the hand-curated mirror; the gate is a PROJECTION observing the
 * relation with a declared fidelity (§7.4: curation derives the RELATION, never the
 * mirror bytes — a byte generator was the superseded S5.2 premise). A mirror type
 * whose OBSERVED relation no longer matches its ADMITTED relation is a drift — the
 * exact class the frozen spine-conformance pins caught by hand, now caught
 * mechanically over the complete admitted set (so no Codec-class type is forgotten).
 *
 * @module
 */

/** Axis 1 — who OWNS the type. */
export type SpineAuthority = 'spine' | 'runtime' | 'generated';

/** Axis 2 — how the mirror relates to its source. */
export type SurfaceRelation =
  | 'exact'
  | 'public-narrower'
  | 'public-wider'
  | 'opaque'
  | 'brand-reanchored'
  | 'runtime-exists'
  | 'intentionally-omitted';

/**
 * One observed mirror→runtime relation — the flat, already-classified outcome of
 * probing ONE admitted type's bidirectional assignability, plus everything the gate
 * needs to write a self-explaining Finding. A `resolved` observation whose
 * `observedRelation` satisfies its `admittedRelation` is conformant (no finding); a
 * mismatch is the drift the gate reports; an UNRESOLVED observation (an import that
 * did not typecheck-resolve — a renamed/removed mirror or runtime type) is a
 * structural drift the gate always reports.
 */
export interface SpineRelationObservation {
  /** The mirror type being classified (e.g. `CompositeState`, `Codec.Shape`, `Millis`). */
  readonly typeName: string;
  /** Axis 1 — who owns the type (recorded for the two-axis report + convergence evidence). */
  readonly authority: SpineAuthority;
  /** Axis 2, DECLARED — the frozen relation this type is admitted to hold (the seed). */
  readonly admittedRelation: SurfaceRelation;
  /** Axis 2, OBSERVED — the relation the assignability probe actually measured. */
  readonly observedRelation: SurfaceRelation;
  /** Did the SPINE type prove assignable to the RUNTIME type? (the `_s2r` probe). */
  readonly assignableSpineToRuntime: boolean;
  /** Did the RUNTIME type prove assignable to the SPINE type? (the `_r2s` probe). */
  readonly assignableRuntimeToSpine: boolean;
  /** Did BOTH sides import + typecheck-resolve? A false here is a hard structural drift. */
  readonly resolved: boolean;
  /** Optional witness/context — e.g. a resolution error, when `resolved` is false. */
  readonly detail?: string;
}

/**
 * The host-supplied two-axis classification over the admitted spine mirror set. The
 * probe is HEAVY (a `ts.Program` per build, one bidirectional assertion per admitted
 * type), so production runs it OPT-IN + cached; when the host did not run it this
 * whole capability is simply ABSENT from the {@link GateContext} and the gate is not
 * in the set (no cost, no noise).
 */
export interface SpineRelationFacts {
  /** Every admitted mirror type's observed relation — the substrate the gate folds. */
  readonly observations: readonly SpineRelationObservation[];
}

/**
 * Classify the STRUCTURAL relation from the two assignability directions — a total
 * function over the 2×2 truth table:
 *  - `(true, true)`  → `exact` — bidirectional structural identity.
 *  - `(true, false)` → `public-narrower` — the spine is a SUBTYPE (a narrower public
 *    contract than the runtime).
 *  - `(false, true)` → `public-wider` — the spine is a SUPERTYPE (a wider public port
 *    than the runtime, e.g. `Codec.schema: SchemaPort` over the runtime `Schema`).
 *  - `(false, false)` → `opaque` — structurally incompatible in both directions.
 */
export function classifyStructuralRelation(
  assignableSpineToRuntime: boolean,
  assignableRuntimeToSpine: boolean,
): SurfaceRelation {
  if (assignableSpineToRuntime && assignableRuntimeToSpine) return 'exact';
  if (assignableSpineToRuntime && !assignableRuntimeToSpine) return 'public-narrower';
  if (!assignableSpineToRuntime && assignableRuntimeToSpine) return 'public-wider';
  return 'opaque';
}

/**
 * Whether an OBSERVED structural relation satisfies the ADMITTED relation — the
 * two-axis conformance check the gate folds on.
 *  - `brand-reanchored` (Authority-spine): the runtime re-exports the brand FROM the
 *    spine (ADR-0010), so the two are structurally IDENTICAL — the probe observes
 *    `exact`. A reanchored brand that stopped being identical (a runtime
 *    redeclaration that changed the brand) observes non-`exact` → not satisfied.
 *  - `runtime-exists` / `intentionally-omitted`: NOT structurally probed here (value
 *    existence stays with the runtime-existence describes; deliberate omission is the
 *    type-export enumerator's plane) — a defensive `false` if one ever reaches the
 *    structural fold, so it can never be silently laundered green.
 *  - the four structural arms: satisfied iff the observed relation is identical.
 */
export function relationSatisfied(observed: SurfaceRelation, admitted: SurfaceRelation): boolean {
  if (admitted === 'brand-reanchored') return observed === 'exact';
  if (admitted === 'runtime-exists' || admitted === 'intentionally-omitted') return false;
  return observed === admitted;
}
