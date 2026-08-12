// The cross-target binding. This file MUST compile.
//
// Astro declares a build-facility hole in upstream vocabulary and never imports
// Vite. Vite exposes a facility in the same vocabulary and never imports Astro.
// Neither child knows the other exists. This probe is the only place the two
// meet, and it may import both precisely because it is not a target and
// acquires no semantic ownership by doing so.
//
// Until this compiles, relation-shaped composition is approved and unproven:
// two independently authored public contracts agree by luck until something
// checks. This is the something.
//
// No casts. No local replicas. No shadow facility invented here -- every type
// below is either upstream vocabulary or a real public export of a child.

import type { Address, BindingsFor, CaseOf, NonEmptyTuple } from './types.js';
import type { RevisionId } from './00_core/02_identity/types.js';
import type {
  ArtifactProducer,
  ArtifactSlotId,
  ArtifactSlotReference,
  TargetConfigurationId,
  TargetParticipation,
} from './02_targets/types.js';
import type { AstroTargetId } from './02_targets/astro/00_integration/types.js';
import type { AstroBuildFacilityRequirement } from './02_targets/astro/03_build/types.js';
import type {
  ViteBuildFacility,
  ViteProjectionDisposition,
} from './02_targets/vite/01_projection/types.js';

// --- the exact axes the composition governs --------------------------------

type Revision = Address<
  'liteship.content:application/vnd.liteship.revision+cbor',
  'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
>;
type Config = TargetConfigurationId<'astro.build'>;
type Participation = TargetParticipation<AstroTargetId, Config, Revision>;
type Demands = readonly [ArtifactSlotReference<ArtifactSlotId<'astro.client-entry'>>];
type Producer = CaseOf<ArtifactProducer, 'direct-composition'>;

// --- the supplier, at those axes -------------------------------------------

type Supplier = ViteBuildFacility<Participation, Demands, Producer>;

// --- the join ---------------------------------------------------------------
//
// Through Astro's real requirement family and the real `BindingsFor` path a
// consumer would take. If Vite's independently chosen shape diverges from
// Astro's socket in any governed way, `Supplier` stops satisfying the
// requirement's constraint and this line stops compiling.

export type TheJoin = BindingsFor<
  [AstroBuildFacilityRequirement<Participation, Demands, Producer, Supplier>]
>;

// The binding must be a real one-element tuple of bindings, not `never`.
// `BindingsFor` collapses to `never` on a duplicate requirement key, and `never`
// would satisfy any downstream check while proving nothing.
declare const join: TheJoin;
export const theJoinIsInhabited: readonly [unknown] = join;

// --- both dispositions stay expressible -------------------------------------
//
// A lawful facility may answer that there was genuinely nothing to do, and it
// may answer with production. These are the positive counterparts of the
// negative forbidding a non-empty demand from becoming an empty success: the
// correction must not make the honest empty answer unrepresentable too.

declare const emptyDisposition: CaseOf<ViteProjectionDisposition<Producer>, 'empty'>;
export const emptyIsExpressible: { readonly _tag: 'empty' } = emptyDisposition;

declare const producedDisposition: CaseOf<ViteProjectionDisposition<Producer>, 'produced'>;
export const productionIsExpressible: {
  readonly produced: NonEmptyTuple<{ readonly producer: Producer }>;
} = producedDisposition;

// The supplier's exact axes survive on the public path, read from the facility
// rather than from a hand-built specimen.
declare const supplier: Supplier;
export const supplierAxesAreExact: {
  readonly participation: Participation;
  readonly slots: Demands;
} = supplier;

declare const _revision: RevisionId;
export const revisionIsReachable: RevisionId = _revision;
