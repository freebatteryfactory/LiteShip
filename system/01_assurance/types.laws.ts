/**
 * The assurance child topology.
 *
 * `types.ts` is the shared assurance vocabulary and it is upstream of both
 * children: `00_audit` and `01_gauntlet` import `GateDefinition`,
 * `PlannedCheck`, `EvaluatedGate`, and the rest from it. An umbrella that
 * imports them back to name their surfaces closes a source-authority cycle,
 * which is the regression `02_targets` and `02_wires` each recorded fixing.
 * A file nobody imports may hold what neither of them can.
 *
 * What lived in `types.ts` instead was `AssuranceChildRoster`, a tuple of two
 * strings. It asserted that two children exist and could not tell whether they
 * did — delete either child's `types.ts` and the umbrella compiled clean.
 * `02_wires/README.md` describes rejecting exactly that shape, and the layer
 * whose entire subject is detecting whether the repository is what it claims
 * to be was the last one still carrying it.
 *
 * This file declares no assurance semantics. Both surfaces below are the real
 * ones, imported from the homes that own them. It emits no JavaScript and
 * exports no value.
 *
 * @module
 */

import type { Assert, Equal, IsExactlyTrue, Named, Tuple } from '../../types.js';
import type { AuditTypeSurface } from './00_audit/types.js';
import type { GauntletTypeSurface } from './01_gauntlet/types.js';

/** One assurance child, named beside the surface it exports. */
export interface AssuranceTypeChild<Name extends string, Surface> extends Named<Name> {
  readonly Type: Surface;
}

/**
 * The assurance children, each named beside the real surface it exports.
 *
 * Audit acquires; gauntlet evaluates. They are separate because their
 * dependencies and costs are, not because separation is tidy — acquisition
 * needs a compiler lane and a filesystem, evaluation needs neither and can run
 * wherever the facts are shipped. A third child would be an edit somebody makes
 * on purpose rather than a folder that appears because a need did, and now the
 * compiler is the thing that says so.
 */
export type AssuranceTypeTopology = Tuple<
  [
    AssuranceTypeChild<'00_audit', AuditTypeSurface>,
    AssuranceTypeChild<'01_gauntlet', GauntletTypeSurface>,
  ]
>;

/** The child names, derived from the topology. */
export type AssuranceChildName = AssuranceTypeTopology[number]['name'];

/** Select one child surface by its name. */
export type AssuranceTypeAt<Name extends AssuranceChildName> = Extract<
  AssuranceTypeTopology[number],
  { readonly name: Name }
>['Type'];

/**
 * Compile-time law: every entry names its own child's surface.
 *
 * Naming the surface is what gives the population teeth — deleting a child
 * breaks the import, so the topology cannot outlive what it names. The
 * mis-wired entry is the likelier defect of the two: a child is deleted
 * deliberately and loudly, while an entry is copy-pasted and edited in one of
 * its two positions while the next one is being added.
 *
 * The right-hand side is written independently of the topology, so this
 * compares rather than restates, and the last line pins the population so a
 * child added here and nowhere else fails rather than passing unexamined.
 */
export type EachAssuranceEntryNamesItsOwnChildsSurface = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<AssuranceTypeAt<'00_audit'>, AuditTypeSurface>,
        Equal<AssuranceTypeAt<'01_gauntlet'>, GauntletTypeSurface>,
        Equal<AssuranceChildName, '00_audit' | '01_gauntlet'>,
      ],
      [true, true, true]
    >
  >
>;
