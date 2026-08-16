/**
 * Compile-time laws for `02_targets/astro/04_island`.
 *
 * A law is a fixture about the specification, not part of it. Root states the
 * reason and this file applies it: a fixture living in a declaration file
 * becomes part of that file's addressed public type surface, so the proofs live
 * beside the declarations they constrain rather than inside them.
 *
 * Nothing imports this file. It emits no JavaScript and exports no value.
 *
 * @module
 */

import type { Diagnostic } from '../../../00_core/00_error/types.js';
import type { RevisionId } from '../../../00_core/02_identity/types.js';
import type { IslandActivationAuthority, IslandJoin } from '../../../01_hosts/web/11_island/types.js';
import type { Assert, CaseOf, Equal, NonEmptyTuple } from '../../../types.js';
import type { ProducedArtifact, TargetConfigurationId, TargetConfigurationRevision } from '../../types.js';
import type { AstroIslandEntry, IslandPreparation, IslandPreparationRefusal } from './types.js';

// ---------------------------------------------------------------------------
// Laws

type LawConfig = TargetConfigurationId<'astro.build'>;

type LawRevision = RevisionId;


/**
 * Compile-time law: the join is web's authority, not a local twin.
 *
 * `Equal` is invariant, so a structurally identical local declaration would
 * fail this even though the compiler treats the two shapes as the same type.
 * That is the whole reason the law is written against the imported name.
 */
export type TheJoinIsTheWebAuthority = Assert<
  Equal<AstroIslandEntry['join'], IslandJoin>
>;


/**
 * Compile-time law: this home does not own the activation decision.
 *
 * No `activate`, no authority, no instance. Astro prepares; web activates. A
 * target that could activate would be a second execution host.
 */
export type AstroPreparesButDoesNotActivate = Assert<
  Equal<
    [
      'activate' extends keyof AstroIslandEntry ? true : false,
      'authority' extends keyof AstroIslandEntry ? true : false,
      'instance' extends keyof AstroIslandEntry ? true : false,
      AstroIslandEntry extends IslandActivationAuthority ? true : false,
    ],
    [false, false, false, false]
  >
>;


/** Compile-time law: an island entry pins its exact configuration revision. */
export type AnIslandEntryPinsItsExactConfiguration = Assert<
  Equal<
    AstroIslandEntry<LawConfig, LawRevision>['configuration'],
    TargetConfigurationRevision<LawConfig, LawRevision>
  >
>;


/** Compile-time law: the island entry binds the produced artifact whole. */
export type AnIslandEntryBindsTheProducedArtifact = Assert<
  Equal<AstroIslandEntry['entry'], ProducedArtifact>
>;


/**
 * Compile-time law: unresolved ancestry is refused out loud.
 *
 * The predecessor's stale-manifest path produced a rendered island with no
 * diagnostic. Here the refusal carries a non-empty diagnostic tuple, so the
 * quiet version is unrepresentable.
 */
export type UnresolvedAncestryIsRefusedOutLoud = Assert<
  Equal<
    [
      Equal<CaseOf<IslandPreparationRefusal, 'unresolved-ancestry'>['diagnostics'], NonEmptyTuple<Diagnostic>>,
      'entry' extends keyof CaseOf<IslandPreparation, 'refused'> ? true : false,
    ],
    [true, false]
  >
>;
