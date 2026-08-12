// Every way the cross-target binding could appear to work while proving
// nothing. This file MUST compile, and that is not a contradiction.
//
// Each negative sits under `@ts-expect-error`. The directive is satisfied only
// while the line below it really is refused, and TypeScript reports an unused
// directive the moment one stops failing. So a compiling file means every
// negative is still negative, and the failure names the exact site rather than
// moving a total.
//
// The lawful probe next door demonstrates convergence; this one demonstrates
// that convergence was a constraint rather than a coincidence.
//
// Each negative is written on one line, because the directive suppresses only
// the line immediately after it and a wrapped generic puts the error somewhere
// else entirely -- which reads as six passing fixtures and is six holes.

import type { Address, Binding, BindingRow, BindingsFor, Brand, CaseOf, NonEmptyTuple, Reference, Signature } from './types.js';
import type { Diagnostic } from './00_core/00_error/types.js';
import type { ArtifactProducer, ArtifactSlotId, ArtifactSlotReference, SlotClaim, TargetConfigurationId, TargetParticipation } from './02_targets/types.js';
import type { AstroTargetId } from './02_targets/astro/00_integration/types.js';
import type { AstroBuildFacilityRequirement, AstroProjectionDisposition, AstroProjectionRequest } from './02_targets/astro/03_build/types.js';
import type { ViteBuildFacility } from './02_targets/vite/01_projection/types.js';

type Revision = Address<
  'liteship.content:application/vnd.liteship.revision+cbor',
  'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
>;
type Config = TargetConfigurationId<'astro.build'>;
type P = TargetParticipation<AstroTargetId, Config, Revision>;
type D = readonly [ArtifactSlotReference<ArtifactSlotId<'astro.client-entry'>>];
type Prod = CaseOf<ArtifactProducer, 'direct-composition'>;

/** The lawful supplier, for contrast. */
type Good = ViteBuildFacility<P, D, Prod>;

// Every negative instantiates the requirement directly. A local convenience
// alias wrapping the constraint is exactly where a softened constraint would
// hide, so there is none.

// --- N1. An incompatible supplier --------------------------------------------
// Right member names, wrong projection operation. A check that only counted
// members would wave this through.
interface IncompatibleSupplier {
  readonly participation: P;
  readonly slots: D;
  readonly claims: NonEmptyTuple<SlotClaim>;
  readonly project: Signature<P, NonEmptyTuple<Diagnostic>>;
}
// prettier-ignore
// @ts-expect-error N1: an incompatible projection operation does not fill the socket
export type N1 = BindingsFor<[AstroBuildFacilityRequirement<P, D, Prod, IncompatibleSupplier>]>;

// --- N2. Supplier broadening --------------------------------------------------
// The mutation contravariance would have hidden, had the exact axes lived only
// inside the projection request.
// prettier-ignore
// @ts-expect-error N2a: a supplier broadening its participation does not fill an exact socket
export type N2a = BindingsFor<[AstroBuildFacilityRequirement<P, D, Prod, ViteBuildFacility<TargetParticipation, D, Prod>>]>;
// prettier-ignore
// @ts-expect-error N2b: a supplier broadening its slot demands does not fill an exact socket
export type N2b = BindingsFor<[AstroBuildFacilityRequirement<P, D, Prod, ViteBuildFacility<P, NonEmptyTuple<ArtifactSlotReference>, Prod>>]>;
// prettier-ignore
// @ts-expect-error N2c: a supplier broadening its producer does not fill an exact socket
export type N2c = BindingsFor<[AstroBuildFacilityRequirement<P, D, Prod, ViteBuildFacility<P, D, ArtifactProducer>>]>;

// --- N3. Requester broadening -------------------------------------------------
// The socket itself loosened. If an exact requester still accepted this, the
// requirement was decorative.
declare const broadenedRequest: AstroProjectionRequest<TargetParticipation, D>;
// @ts-expect-error N3: a broadened request is not the exact request the socket governs
export const n3: AstroProjectionRequest<P, D> = broadenedRequest;

// --- N4. Free binding substitution --------------------------------------------
// The shape that makes every join compile and no join mean anything.
declare const freeRow: BindingRow;
declare const looseBinding: Binding;
type ExactRow = BindingsFor<[AstroBuildFacilityRequirement<P, D, Prod, Good>]>;
// @ts-expect-error N4a: a free binding row does not satisfy an exact requirement row
export const n4a: ExactRow = freeRow;
// @ts-expect-error N4b: an unconstrained binding does not satisfy the exact one
export const n4b: ExactRow = [looseBinding];

// --- N5. A structurally similar, non-authoritative lookalike -------------------
// Same shape, foreign nominal tags. TypeScript cannot see provenance, so this is
// the case that decides whether the brands do any work at all.
type ForeignSlotId<Name extends string = string> = Brand<Name, 'someone-else.artifact-slot-id'>;
type ForeignDemands = readonly [Reference<'their-artifact-slot', ForeignSlotId<'astro.client-entry'>>];
interface LookalikeSupplier {
  readonly participation: P;
  readonly slots: ForeignDemands;
  readonly claims: NonEmptyTuple<SlotClaim>;
  readonly project: Signature<
    { readonly participation: P; readonly planned: unknown; readonly demands: ForeignDemands },
    AstroProjectionDisposition<Prod>
  >;
}
// prettier-ignore
// @ts-expect-error N5: foreign nominal kinds do not bind, however similar the shape
export type N5 = BindingsFor<[AstroBuildFacilityRequirement<P, D, Prod, LookalikeSupplier>]>;

// --- N6. A non-empty demand answered with empty success ------------------------
// The predecessor's silent degradation, stated as a type.
declare const emptyArm: CaseOf<AstroProjectionDisposition<Prod>, 'empty'>;
// @ts-expect-error N6: an empty disposition is not a production, whatever was demanded
export const n6: CaseOf<AstroProjectionDisposition<Prod>, 'produced'> = emptyArm;
