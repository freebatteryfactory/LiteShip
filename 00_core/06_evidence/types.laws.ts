/**
 * Compile-time laws for `00_core/06_evidence`.
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

import type { Assert, Brand, CaseOf, Equal, Reference, TagOf } from '../../types.js';
import type { Diagnostic } from '../00_error/types.js';
import type { ContentAddress } from '../01_encoding/types.js';
import type { TimeCoordinate } from '../04_time/types.js';
import type { EvidenceCut, EvidenceCutId, EvidenceCutReference, EvidenceObservation, ReproducibilityClaim } from './types.js';

/** A literal profile carrier, so the laws below compare something real. */
type ReproLawProfile = Reference<'law-profile', Brand<'liteship.law.profile-a', 'liteship.law-profile'>>;


/**
 * Compile-time law: the three arms carry three different obligations, and no
 * arm may borrow another's evidence.
 *
 * Each member is compared individually rather than as one whole-algebra
 * comparison, because a whole-shape comparison stays green while an individual
 * arm quietly acquires or loses a member.
 */
export type AReproducibilityClaimSeparatesItsThreeArms = Assert<
  Equal<
    [
      TagOf<ReproducibilityClaim<ReproLawProfile>>,
      keyof CaseOf<ReproducibilityClaim<ReproLawProfile>, 'unclaimed'>,
      keyof CaseOf<ReproducibilityClaim<ReproLawProfile>, 'reproducible-under-profile'>,
      keyof CaseOf<ReproducibilityClaim<ReproLawProfile>, 'observed-variable'>,
    ],
    [
      'unclaimed' | 'reproducible-under-profile' | 'observed-variable',
      '_tag' | 'limitations',
      '_tag' | 'profile' | 'witness',
      '_tag' | 'profile' | 'evidence',
    ]
  >
>;


/**
 * Compile-time law: an unclaimed result names no profile and holds no witness.
 *
 * This is the arm a stage reaches for when it has measured nothing, so it is
 * the arm most likely to be quietly upgraded into a free reproducibility claim.
 */
export type AnUnclaimedResultCannotCarryAWitness = Assert<
  Equal<
    [
      'witness' extends keyof CaseOf<ReproducibilityClaim<ReproLawProfile>, 'unclaimed'> ? true : false,
      'profile' extends keyof CaseOf<ReproducibilityClaim<ReproLawProfile>, 'unclaimed'> ? true : false,
      'evidence' extends keyof CaseOf<ReproducibilityClaim<ReproLawProfile>, 'unclaimed'> ? true : false,
      // And the limitations must be a non-empty population. A member that
      // accepts `[]` lets "unclaimed" mean "we have nothing to say about why we
      // have nothing to say", which is the silence this arm exists to prevent.
      readonly Diagnostic[] extends CaseOf<
        ReproducibilityClaim<ReproLawProfile>,
        'unclaimed'
      >['limitations']
        ? true
        : false,
    ],
    [false, false, false, false]
  >
>;


/**
 * Compile-time law: a claim is exact over the profile it names, and a claim
 * made under one profile cannot substitute for the same claim under another.
 */
export type AReproducibilityClaimIsExactOverItsProfile = Assert<
  Equal<
    [
      ReproducibilityClaim<ReproLawProfile> extends ReproducibilityClaim<ReproLawProfileB> ? true : false,
      ReproducibilityClaim<ReproLawProfile> extends ReproducibilityClaim<ReproLawProfile> ? true : false,
    ],
    [false, true]
  >
>;


/** A second literal profile carrier, distinct from the first. */
type ReproLawProfileB = Reference<'law-profile', Brand<'liteship.law.profile-b', 'liteship.law-profile'>>;


/**
 * Compile-time law: an observation retains the whole operational state algebra.
 *
 * Narrowing the contributed state to the ready arm would make every cut look
 * complete, which is exactly the shape that turns a partial evaluation into a
 * confident reproducibility claim.
 */
export type AnObservationRetainsUnavailableAndFailedStates = Assert<
  Equal<
    [
      TagOf<EvidenceObservation['state']>,
      EvidenceObservation['observedAt'] extends TimeCoordinate ? true : false,
    ],
    ['unavailable' | 'pending' | 'ready' | 'failed', true]
  >
>;


/**
 * Compile-time law: a cut is exact over its identity and is addressed.
 *
 * Written against literal carriers rather than the alias compared with itself,
 * because the self-comparison survives deletion of the type parameter.
 */
export type AnEvidenceCutIsExactOverItsIdentity = Assert<
  Equal<
    [
      EvidenceCutReference<EvidenceCutId<'liteship.law.cut-a'>> extends EvidenceCutReference<
        EvidenceCutId<'liteship.law.cut-b'>
      >
        ? true
        : false,
      EvidenceCutReference<EvidenceCutId<'liteship.law.cut-a'>> extends EvidenceCutReference<
        EvidenceCutId<'liteship.law.cut-a'>
      >
        ? true
        : false,
      // Read through the cut rather than off the reference alias. Comparing the
      // alias with itself still passes once the cut stops threading its own
      // parameter — the parameter simply becomes unused, and an unused type
      // parameter is a hygiene death no named law can attribute.
      EvidenceCut<EvidenceCutId<'liteship.law.cut-a'>>['id'],
      EvidenceCut['address'] extends ContentAddress<'application/vnd.liteship.evidence-cut+cbor'>
        ? true
        : false,
    ],
    [
      false,
      true,
      EvidenceCutReference<EvidenceCutId<'liteship.law.cut-a'>>,
      true,
    ]
  >
>;
