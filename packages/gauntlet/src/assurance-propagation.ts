/**
 * Assurance-level propagation along the import graph — the governing principle
 * made real (Slice B, B3.4; the `assurance-map.ts:70` RESERVED deliverable).
 *
 * The base assurance map ({@link assurance-map.ts}) answers "what level is THIS
 * file?" purely from its PATH GLOB. But the owner's law is **AUTHORITY decides
 * assurance, not folder names**: a helper a tools-folder regex would call `L1`
 * is part of the safety case the instant an `L4` file IMPORTS it — if that helper
 * lies, the L4 file produces wrong output, and "downstream trusts bad reality."
 * The glob can't see that; the IMPORT GRAPH can. This module reads the IR's
 * import edges and PROPAGATES levels along them, so a file (transitively)
 * imported by an L4 file INHERITS at least L4 — its glob level is only the FLOOR.
 *
 * The semantics (the core — read carefully):
 *
 * - An {@link ImportEdge} `{fromFile, targetFile}` means `fromFile` IMPORTS
 *   `targetFile` — i.e. `fromFile` DEPENDS ON `targetFile`. Only INTERNAL edges
 *   (`relative` / `internal-package`) carry a `targetFile`; `external` edges have
 *   none and are skipped (we cannot raise a file we do not have).
 * - An importer's level flows DOWN to its dependencies: `targetFile` inherits
 *   `≥ fromFile`'s effective level. (If an L4 file relies on a helper and the
 *   helper lies, the L4 file's output is wrong → the helper is L4-critical too.)
 * - The recurrence is therefore a FIXPOINT (an importer's own level may itself be
 *   propagated from a higher importer):
 *
 *       effective(f) = max( base(f),
 *                           max over { e : e.targetFile === f } of effective(e.fromFile) )
 *
 * - Levels only ever RISE (a `max`) and are BOUNDED (`L0..L4`), so the fixpoint
 *   CONVERGES: each iteration can only raise a finite ladder a finite number of
 *   steps. CYCLES in the import graph (the repo's internal graph can have them)
 *   are safe — iterating to stability needs no acyclicity, only monotonicity +
 *   boundedness. The result is fully deterministic (no clock, no rng, no I/O —
 *   pure graph math over the injected IR).
 *
 * This is contained to the IR-present (`--ir`) path: the lean `liteship check` / MCP
 * path never builds an IR, so it keeps the glob-only levels unchanged. The
 * propagation AUGMENTS the base map; it never lowers a level and never edits the
 * map. This module carries NO `typescript` dependency — it is pure math over the
 * already-built {@link RepoIR}, keeping `@liteship/gauntlet` lean.
 *
 * @module
 */

import { InvariantViolationError } from '@liteship/error';
import { type AssuranceLevel, rankOf, maxLevel } from './assurance.js';
import type { RepoIR, FileId } from './repo-ir.js';

/**
 * Propagate assurance levels along the IR's INTERNAL import edges, returning the
 * EFFECTIVE level of every file in the IR: the fixpoint of
 *
 *     effective(f) = max( base(f),
 *                         max over { e : e.targetFile === f } of effective(e.fromFile) ).
 *
 * `base(f)` is `baseLevelOf(f)` — the file's floor (the glob level in production;
 * a stub in tests). The returned map has an entry for EVERY {@link FileId} in
 * `ir.files`; a file with no high importer maps to exactly its base level (the
 * propagation only ever RAISES, never lowers).
 *
 * The fixpoint is computed by iterating to stability over the reverse-reachability
 * the import edges describe: each pass walks every internal edge and raises the
 * target's level to at least the source's CURRENT effective level, repeating until
 * a full pass changes nothing. Because levels only rise on the bounded `L0..L4`
 * ladder, the loop terminates (the total rank-sum strictly increases each
 * non-final pass and is bounded by `4 * |files|`). Cycle-safe by construction —
 * a cycle simply lifts its whole strongly-connected set to its highest member and
 * then stops changing.
 *
 * Pure + deterministic: no clock, no randomness, no filesystem; the same IR +
 * `baseLevelOf` always yields an identical map.
 *
 * @param ir          the injected repo-IR whose `imports` graph drives propagation.
 * @param baseLevelOf the floor level of a file (production: a glob-map lookup).
 * @throws InvariantViolationError if an internal import edge's endpoints are not in
 *         `ir.files` (a dangling edge — `makeRepoIR` already guards this, so this is
 *         a defence-in-depth invariant, never a silent skip).
 */
export function propagateAssuranceLevels(
  ir: RepoIR,
  baseLevelOf: (file: FileId) => AssuranceLevel,
): ReadonlyMap<FileId, AssuranceLevel> {
  // Seed every file at its base (floor) level. The map is the live working set
  // the fixpoint raises in place; it starts as a faithful copy of the base map.
  const effective = new Map<FileId, AssuranceLevel>();
  for (const id of ir.files.keys()) {
    effective.set(id, baseLevelOf(id));
  }

  // The INTERNAL edges only — an edge with a resolved `targetFile`. `external`
  // edges have no target file in the IR (we don't own the target), so they cannot
  // propagate a level and are skipped. Validate endpoints once (defence in depth:
  // makeRepoIR already enforces this, but a hand-built IR must never silently drop
  // a dangling edge — that would under-propagate, the dangerous direction).
  interface InternalEdge {
    readonly fromFile: FileId;
    readonly targetFile: FileId;
  }
  const internalEdges: InternalEdge[] = [];
  for (const edge of ir.imports) {
    if (edge.targetFile === undefined) continue;
    if (!ir.files.has(edge.fromFile)) {
      throw InvariantViolationError(
        'propagateAssuranceLevels',
        `import edge from "${edge.fromFile}" (specifier "${edge.specifier}") has a fromFile not in the IR files table — cannot propagate assurance`,
      );
    }
    if (!ir.files.has(edge.targetFile)) {
      throw InvariantViolationError(
        'propagateAssuranceLevels',
        `import edge "${edge.fromFile}" -> "${edge.specifier}" resolves to targetFile "${edge.targetFile}" not in the IR files table — cannot propagate assurance`,
      );
    }
    internalEdges.push({ fromFile: edge.fromFile, targetFile: edge.targetFile });
  }

  // Iterate to stability: each pass flows every importer's CURRENT effective level
  // down to its dependency (`target ← max(target, source)`). A pass that raises
  // nothing means the fixpoint is reached. Levels only rise on the bounded L0..L4
  // ladder, so this converges (and is cycle-safe — a cycle lifts to its peak then
  // stops). The pass order does not affect the FINAL map (a fixpoint is unique for
  // a monotone bounded recurrence), so the result is deterministic.
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of internalEdges) {
      // Non-null assertion: both endpoints are in ir.files (validated above) and
      // every ir.files key was seeded into `effective`, so neither get() is undefined.
      const sourceLevel = effective.get(edge.fromFile)!;
      const targetLevel = effective.get(edge.targetFile)!;
      if (rankOf(sourceLevel) > rankOf(targetLevel)) {
        effective.set(edge.targetFile, maxLevel(targetLevel, sourceLevel));
        changed = true;
      }
    }
  }

  return effective;
}
