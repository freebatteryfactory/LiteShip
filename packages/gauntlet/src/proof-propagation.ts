/**
 * Proof-strength propagation along the dep DAG — the lax-functor made real (the
 * LOCAL-VS-GLOBAL correctness family; the SISTER of {@link propagateAssuranceLevels}).
 *
 * {@link propagateAssuranceLevels} folds the import graph MAXIMIZING a criticality
 * level (a file imported by an L4 file INHERITS ≥ L4 — risk flows DOWN to
 * dependencies). THIS module folds the SAME dep DAG but MINIMIZING a proof scalar:
 * a module's EFFECTIVE (global) proof is the MINIMUM of its own local proof and the
 * effective proof of every module it DEPENDS ON. Where assurance asks "how critical
 * is this, given who relies on it?", proof asks "how proven is this, given what it
 * relies on?". The two are duals over the one graph.
 *
 * The semantics (the core — read carefully):
 *
 * - An {@link ImportEdge} `{fromFile, targetFile}` means `fromFile` IMPORTS
 *   `targetFile` — i.e. `fromFile` DEPENDS ON `targetFile`. Only INTERNAL edges
 *   (a resolved `targetFile`) carry a dependency we can score; `external` edges have
 *   no in-IR target (we cannot score code we do not have) and are skipped.
 * - A dependency's effective proof flows UP to its importer (the dual direction of
 *   assurance, which flows the importer's level DOWN to the dependency): `fromFile`'s
 *   effective proof is capped by `targetFile`'s effective proof. If `A` calls into
 *   `B` and `B` is unproven, `A`'s correctness is conditioned on `B`'s — so `A`'s
 *   proof cannot exceed `B`'s.
 * - The recurrence is therefore a FIXPOINT (a dependency's own effective proof may
 *   itself be capped by ITS dependency, transitively):
 *
 *       effective(f) = min( local(f),
 *                           min over { e : e.fromFile === f } of effective(e.targetFile) )
 *
 * - Proofs only ever FALL (a `min`) and are BOUNDED below by 0, so the fixpoint
 *   CONVERGES: each iteration can only lower a bounded scalar a finite number of
 *   steps. CYCLES in the dep graph are safe — iterating to stability needs no
 *   acyclicity, only monotonicity (here: monotone DECREASING) + boundedness. A cycle
 *   simply drops its whole strongly-connected set to its minimum member and stops
 *   changing. The result is fully deterministic (no clock, no rng, no I/O — pure
 *   graph math over the injected IR + the injected `localProofOf`).
 *
 * SOUND AS A RISK SIGNAL, NEVER A GLOBAL-CORRECTNESS CLAIM. The effective proof is a
 * lower bound on "how much of this module's behaviour-and-its-dependencies' is
 * proven" — it genuinely reports that local proof does not compose past a measured
 * weak link. It does NOT claim the module is globally CORRECT (full semantic global
 * correctness is undecidable — Rice). It is a deterministic, redlinable RISK number.
 *
 * Pure + deterministic: no clock, no randomness, no filesystem; the same IR +
 * `localProofOf` always yields an identical map. Carries NO `typescript` dep — pure
 * math over the already-built {@link RepoIR}, keeping `@czap/gauntlet` lean.
 *
 * @module
 */

import { InvariantViolationError } from '@czap/error';
import type { RepoIR, FileId } from './repo-ir.js';

/**
 * Propagate proof strength along the IR's INTERNAL import edges, returning the
 * EFFECTIVE (global) proof of every file in the IR: the fixpoint of
 *
 *     effective(f) = min( local(f),
 *                         min over { e : e.fromFile === f } of effective(e.targetFile) ).
 *
 * `local(f)` is `localProofOf(f)` — the module's blended local proof scalar in
 * `[0, 1]` (the host's mutation/coverage/property/invariant blend; in tests a stub).
 * The returned map has an entry for EVERY {@link FileId} in `ir.files`; a file with
 * no weaker dependency maps to exactly its local proof (the propagation only ever
 * LOWERS, never raises).
 *
 * The fixpoint is computed by iterating to stability over the dependency edges: each
 * pass walks every internal edge and lowers the IMPORTER's effective proof to at
 * most the dependency's CURRENT effective proof, repeating until a full pass changes
 * nothing. Because proofs only fall on the bounded `[0, 1]` interval, the loop
 * terminates (the total proof-sum strictly decreases each non-final pass and is
 * bounded below by 0). Cycle-safe by construction. The pass order does not affect
 * the FINAL map (a fixpoint is unique for a monotone bounded recurrence), so the
 * result is deterministic.
 *
 * @param ir            the injected repo-IR whose `imports` graph drives propagation.
 * @param localProofOf  the local proof scalar of a file in `[0, 1]` (production: the
 *                      host's blend; tests: a stub). A value outside `[0, 1]` is a
 *                      tagged throw (a malformed proof scalar must be visible, never
 *                      silently clamped into a lie).
 * @throws InvariantViolationError if a `localProofOf` value is not a finite number in
 *         `[0, 1]`, or if an internal import edge's endpoints are not in `ir.files`
 *         (a dangling edge — `makeRepoIR` already guards this; defence in depth).
 */
export function propagateProofStrength(
  ir: RepoIR,
  localProofOf: (file: FileId) => number,
): ReadonlyMap<FileId, number> {
  // Seed every file at its local proof. The map is the live working set the fixpoint
  // LOWERS in place; it starts as a faithful copy of the local-proof map. A malformed
  // scalar fails LOUD here (never silently clamped — that would launder a bad signal).
  const effective = new Map<FileId, number>();
  for (const id of ir.files.keys()) {
    const local = localProofOf(id);
    if (!Number.isFinite(local) || local < 0 || local > 1) {
      throw InvariantViolationError(
        'propagateProofStrength',
        `local proof for "${id}" is ${String(local)} — must be a finite number in [0, 1] (a normalized proof scalar)`,
      );
    }
    effective.set(id, local);
  }

  // The INTERNAL edges only — an edge with a resolved `targetFile` (a dependency in
  // the IR). `external` edges have no in-IR target, so they cannot cap a proof and
  // are skipped. Validate endpoints once (defence in depth: makeRepoIR already
  // enforces this, but a hand-built IR must never silently drop a dangling edge —
  // that would UNDER-cap, the dangerous direction for a risk signal).
  interface InternalEdge {
    readonly fromFile: FileId;
    readonly targetFile: FileId;
  }
  const internalEdges: InternalEdge[] = [];
  for (const edge of ir.imports) {
    if (edge.targetFile === undefined) continue;
    if (!ir.files.has(edge.fromFile)) {
      throw InvariantViolationError(
        'propagateProofStrength',
        `import edge from "${edge.fromFile}" (specifier "${edge.specifier}") has a fromFile not in the IR files table — cannot propagate proof`,
      );
    }
    if (!ir.files.has(edge.targetFile)) {
      throw InvariantViolationError(
        'propagateProofStrength',
        `import edge "${edge.fromFile}" -> "${edge.specifier}" resolves to targetFile "${edge.targetFile}" not in the IR files table — cannot propagate proof`,
      );
    }
    internalEdges.push({ fromFile: edge.fromFile, targetFile: edge.targetFile });
  }

  // Iterate to stability: each pass caps every IMPORTER's CURRENT effective proof at
  // its dependency's (`from ← min(from, target)`). A pass that lowers nothing means
  // the fixpoint is reached. Proofs only fall on the bounded [0, 1] interval, so this
  // converges (cycle-safe — a cycle drops to its minimum then stops).
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of internalEdges) {
      // Non-null assertion: both endpoints are in ir.files (validated above) and
      // every ir.files key was seeded into `effective`, so neither get() is undefined.
      const importerProof = effective.get(edge.fromFile)!;
      const dependencyProof = effective.get(edge.targetFile)!;
      if (dependencyProof < importerProof) {
        effective.set(edge.fromFile, dependencyProof);
        changed = true;
      }
    }
  }

  return effective;
}

/**
 * The WEAKEST-LINK path from a module to the dependency that caps its effective
 * proof — a dependency chain `[module, …, weakLink]` where `weakLink`'s local proof
 * equals `module`'s effective proof (it is the dependency that dragged the module
 * down). Deterministic (lexicographically-smallest shortest path via a BFS over the
 * dep edges in sorted order), cycle-safe (visited set). Returns `[from]` when the
 * module's own local proof is already the minimum (no weaker dependency).
 *
 * This names the link to STRENGTHEN in the weak-link finding — REPORT-not-DECIDE: the
 * gate points at the exact dependency, the human/agent strengthens it or reassesses
 * the criticality.
 *
 * @param ir            the dep DAG.
 * @param from          the module whose weak-link path to trace.
 * @param effective     the propagated effective-proof map (from {@link propagateProofStrength}).
 * @param localProofOf  the local proof scalar (to identify the capping dependency).
 */
export function weakestLinkPath(
  ir: RepoIR,
  from: FileId,
  effective: ReadonlyMap<FileId, number>,
  localProofOf: (file: FileId) => number,
): readonly FileId[] {
  const target = effective.get(from);
  if (target === undefined) return [from];
  // The capping dependency is one whose LOCAL proof equals `from`'s effective proof
  // (it is the floor the min bottomed out at). BFS the dep edges to find the shortest
  // such chain; ties broken lexicographically (sorted adjacency) for determinism.
  const adjacency = new Map<FileId, FileId[]>();
  for (const edge of ir.imports) {
    if (edge.targetFile === undefined) continue;
    const list = adjacency.get(edge.fromFile) ?? [];
    list.push(edge.targetFile);
    adjacency.set(edge.fromFile, list);
  }
  for (const list of adjacency.values()) list.sort((a, b) => a.localeCompare(b));

  // If `from`'s own local proof is already the minimum, it is its own weak link.
  if (localProofOf(from) <= target + Number.EPSILON) return [from];

  const queue: FileId[][] = [[from]];
  const visited = new Set<FileId>([from]);
  while (queue.length > 0) {
    const path = queue.shift()!;
    const tail = path[path.length - 1]!;
    for (const next of adjacency.get(tail) ?? []) {
      if (visited.has(next)) continue;
      visited.add(next);
      const nextPath = [...path, next];
      // `next` is the capping link iff its LOCAL proof equals `from`'s effective proof.
      if (Math.abs(localProofOf(next) - target) <= Number.EPSILON) return nextPath;
      queue.push(nextPath);
    }
  }
  // Defensive: a cycle of equally-weak modules where no single node's local proof
  // equals the effective floor exactly (floating-point). Return the start — the
  // finding still reports the effective drop; the path is a best-effort locator.
  return [from];
}
