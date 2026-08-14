/**
 * Compile-only composition fixtures for `02_targets/`.
 *
 * `types.ts` is the shared target vocabulary, and it is upstream of every
 * target child. It cannot host a composition fixture, for two reasons that are
 * the same reason twice.
 *
 * The first is the one the root file already states about itself: a fixture
 * living in a declaration file becomes part of that file's addressed public
 * type surface. The second is sharper here and was a real regression. The
 * children import the umbrella for `TargetParticipation`, `ArtifactProducer`,
 * `SlotClaim`, and the slot vocabulary. An umbrella that imports them back to
 * check their composition closes a source-authority cycle:
 *
 *     02_targets/types.ts -> astro/03_build/types.ts -> 02_targets/types.ts
 *
 * TypeScript accepts that -- the imports are type-only and the project is one
 * program -- which is exactly why it needed catching by reading rather than by
 * compiling. Shared vocabulary is upstream of the homes that consume it, and
 * upstream cannot verify downstream.
 *
 * `system/types.ts` does import its children and is not the same situation,
 * though it was cited as precedent when this fixture was first written in the
 * wrong place. That file owns topology and nothing else: no system child
 * imports it, so nothing flows back and there is no cycle. The distinguishing
 * property is not "parent" but "owns vocabulary the children consume".
 *
 * This file owns no semantics. It declares no facility, request, disposition,
 * or participation of its own -- a local replica would prove that a copy fits a
 * socket, which is the defect `system/01_assurance/00_audit` exists to detect,
 * committed by the proof. Every type below is the real one, imported from the
 * home that owns it. It emits no JavaScript, exports no value, and participates
 * in no Type ABI surface.
 *
 * It is therefore allowed to import the umbrella and more than one child, and
 * that permission must be expressible by whichever import-boundary mechanism is
 * selected. Two canaries belong to that selection:
 *
 * - the shared umbrella importing any target child must be refused;
 * - this file importing several children must be admitted.
 *
 * A mechanism that cannot tell those apart is not the mechanism.
 *
 * @module
 */

import type {
  Assert,
  Binding,
  BindingRow,
  BindingsFor,
  CaseOf,
  Equal,
  HoleContract,
  IsExactlyTrue,
  Named,
  Tuple,
} from '../types.js';
import type { RevisionId } from '../00_core/02_identity/types.js';
import type { AstroTopology } from './astro/types.js';
import type { ViteTopology } from './vite/types.js';
import type { CloudflareTopology } from './cloudflare/types.js';
import type {
  ArtifactProducer,
  ArtifactSlotReference,
  TargetConfigurationId,
  TargetParticipation,
} from './types.js';
import type { AstroTargetId } from './astro/00_integration/types.js';
import type {
  AstroBuildFacility,
  AstroBuildFacilityRequirement,
} from './astro/03_build/types.js';
import type { ViteBuildFacility } from './vite/01_projection/types.js';

// ---------------------------------------------------------------------------
// The Astro/Vite composition
//
// Astro genuinely uses Vite, and neither may import the other: ecosystem usage
// and distribution dependency are not semantic authority. Astro's `03_build`
// therefore declares a socket without naming who fills it, and Vite's
// `01_projection` declares a facility "taken without reference to any
// requester". Both are honest and both are law-covered locally.
//
// What was missing is any place where the two meet. Whether the supplier
// actually fits the socket was an untested belief held by two files that had
// never been in the same compilation unit as each other's names.
//
// This is that place, and the relationship it establishes is **independent
// conformance**: two homes that share no contract, each declaring its half
// against upstream vocabulary, one of which satisfies the other at an exact
// composition. It is not derivation -- nothing here makes Vite's facility follow
// from Astro's socket, and a change on either side can end the conformance.
// That is a fact about the architecture rather than a hazard to paper over, and
// this fixture is what keeps it observed.
//
// An earlier draft carried a second law asserting that the two request types,
// the two disposition algebras, and the two slot aliases were pairwise `Equal`,
// on the theory that the conformance held by coincidence and the coincidence
// should be checked. Both halves of that were wrong, and measuring settled it.
//
// Redundant: the facility constraint alone already goes red when Vite widens its
// slot demands, gains a disposition arm, renames a disposition arm, or when
// Astro renames a request member. Four mutations, four failures, no equality law
// involved.
//
// And worse than redundant: it refused a change the type system correctly
// permits. `project` is a `Signature`, whose input slot is `(input: Input) =>
// void` -- a parameter position, therefore contravariant. A supplier whose
// request needs *fewer* members than the socket offers is sound and stays
// assignable. Dropping a member from Vite's request leaves this file compiling,
// exactly as it should; the equality law would have called that a divergence.
//
// A law that freezes two spellings into agreement is not checking a
// relationship. It is asserting that nobody will ever legally differ.
// ---------------------------------------------------------------------------

/** One exact composition coordinate. A broad specimen satisfies every widening. */
type CompositionParticipation = TargetParticipation<
  AstroTargetId,
  TargetConfigurationId<'astro.vite.composition'>,
  RevisionId
>;
type CompositionDemands = readonly [ArtifactSlotReference];
type CompositionProducer = CaseOf<ArtifactProducer, 'direct-composition'>;

/** The supplier exactly as Vite declares it. */
type ViteSupplier = ViteBuildFacility<
  CompositionParticipation,
  CompositionDemands,
  CompositionProducer
>;

/**
 * Astro's socket, filled by Vite's facility.
 *
 * This declaration *is* the proof, and it is the whole positive case.
 * `AstroBuildFacilityRequirement` constrains its fourth parameter to
 * `AstroBuildFacility<Participation, Demands, Producer>`, so if Vite's facility
 * does not satisfy Astro's socket at these exact axes, `ViteSupplier` is not a
 * legal type argument and this file does not compile. No assertion is required:
 * the constraint is the assertion, and an assertion beside it would certify a
 * description of why the constraint holds rather than prove anything further.
 */
export type AstroBuildFilledByVite = AstroBuildFacilityRequirement<
  CompositionParticipation,
  CompositionDemands,
  CompositionProducer,
  ViteSupplier
>;

/** The prerequisite row a composition point would carry, and its bindings. */
export type AstroViteRequirements = readonly [AstroBuildFilledByVite];
export type AstroViteBindings = BindingsFor<AstroViteRequirements>;

/**
 * Compile-time law: the composition binds the exact supplier, through the real
 * calculus.
 *
 * Line one reads the hole the way a consumer does, so a requirement that hands
 * out a broadened stand-in fails here rather than at the first real bind. Lines
 * two and three use root's actual `BindingsFor` rather than a description of
 * it: a free `BindingRow` is not this row, which is the boundary defect
 * `01_hosts` states as a law and the reason a requirement row is a closed
 * tuple. Line four is the anti-vacuity partner, since `BindingsFor` resolves to
 * `never` for a row with duplicate holes and `never` satisfies everything.
 */
export type TheCompositionBindsTheExactSupplier = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<HoleContract<AstroBuildFilledByVite>, ViteSupplier>,
        Equal<AstroViteBindings, readonly [Binding<AstroBuildFilledByVite>]>,
        BindingRow extends AstroViteBindings ? true : false,
        [AstroViteBindings] extends [never] ? true : false,
      ],
      [true, true, false, false]
    >
  >
>;

/**
 * Compile-time law: a supplier that broadens any governed axis does not fit.
 *
 * Four axes, one line each, stated as the constraint the requirement's fourth
 * parameter actually imposes. Each is a supplier that is perfectly well-formed
 * on its own terms and wrong for *this* socket -- the only interesting kind of
 * wrong, and the kind a fixture built from local replicas cannot produce.
 *
 * The slot axis is stated as a *different* exact demand tuple rather than as a
 * widening to `readonly ArtifactSlotReference[]`, because Vite's own
 * `ViteSlotDemands` constrains to a non-empty tuple and refuses the array
 * outright. A negative that cannot be instantiated proves nothing about this
 * socket -- it proves something about Vite's constraint, which Vite already
 * asserts. Two slots where one was demanded is the real wrong answer.
 *
 * The last line is the lawful control. Without it the law would be satisfied by
 * a socket nothing can fill, and an empty socket refuses everything including
 * the right answer.
 */
export type ABroadenedSupplierDoesNotFillTheAstroSocket = Assert<
  IsExactlyTrue<
    Equal<
      [
        ViteBuildFacility<
          TargetParticipation,
          CompositionDemands,
          CompositionProducer
        > extends AstroBuildFacility<
          CompositionParticipation,
          CompositionDemands,
          CompositionProducer
        >
          ? true
          : false,
        ViteBuildFacility<
          CompositionParticipation,
          readonly [ArtifactSlotReference, ArtifactSlotReference],
          CompositionProducer
        > extends AstroBuildFacility<
          CompositionParticipation,
          CompositionDemands,
          CompositionProducer
        >
          ? true
          : false,
        ViteBuildFacility<
          CompositionParticipation,
          CompositionDemands,
          ArtifactProducer
        > extends AstroBuildFacility<
          CompositionParticipation,
          CompositionDemands,
          CompositionProducer
        >
          ? true
          : false,
        ViteBuildFacility<
          TargetParticipation,
          readonly [ArtifactSlotReference, ArtifactSlotReference],
          ArtifactProducer
        > extends AstroBuildFacility<
          CompositionParticipation,
          CompositionDemands,
          CompositionProducer
        >
          ? true
          : false,
        ViteSupplier extends AstroBuildFacility<
          CompositionParticipation,
          CompositionDemands,
          CompositionProducer
        >
          ? true
          : false,
      ],
      [false, false, false, false, true]
    >
  >
>;

// ---------------------------------------------------------------------------
// The child topology
// ---------------------------------------------------------------------------

/** One target child, named beside the topology it exports. */
export interface TargetTypeChild<Name extends string, Topology> extends Named<Name> {
  readonly Type: Topology;
}

/**
 * The target children, each named beside the real topology it exports.
 *
 * This replaced `TargetChildRoster`, which was `readonly ['astro', 'vite',
 * 'cloudflare']` — a tuple of strings asserting three children exist and unable
 * to tell whether they do. Delete a child's `types.ts` and the umbrella still
 * compiled. `02_wires` documented rejecting exactly that shape and then fixed
 * it; the identical shape stayed here.
 *
 * It lives in this file for the same reason the composition does: the umbrella
 * owns vocabulary the children consume, so an umbrella importing them back
 * closes a source-authority cycle. A file nobody imports may hold both.
 */
export type TargetTypeTopology = Tuple<
  [
    TargetTypeChild<'astro', AstroTopology>,
    TargetTypeChild<'vite', ViteTopology>,
    TargetTypeChild<'cloudflare', CloudflareTopology>,
  ]
>;

/** The child names, derived from the topology. */
export type TargetChildName = TargetTypeTopology[number]['name'];

/** Select one child topology by its name. */
export type TargetTypeAt<Name extends TargetChildName> = Extract<
  TargetTypeTopology[number],
  { readonly name: Name }
>['Type'];

/**
 * Compile-time law: every entry names its own child's topology.
 *
 * Naming the topology is what gives the roster teeth — deleting a child breaks
 * the import — and the mis-wired entry is the likelier defect, so the
 * right-hand side is written independently and compared rather than restated.
 * The last line pins the population, so a child added here and nowhere else
 * fails rather than passing unexamined.
 */
export type EachTargetEntryNamesItsOwnChildsTopology = Assert<
  IsExactlyTrue<
    Equal<
      [
        Equal<TargetTypeAt<'astro'>, AstroTopology>,
        Equal<TargetTypeAt<'vite'>, ViteTopology>,
        Equal<TargetTypeAt<'cloudflare'>, CloudflareTopology>,
        Equal<TargetChildName, 'astro' | 'vite' | 'cloudflare'>,
      ],
      [true, true, true, true]
    >
  >
>;
