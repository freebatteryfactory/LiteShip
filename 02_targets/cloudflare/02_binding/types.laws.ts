/**
 * Compile-time laws for `02_targets/cloudflare/02_binding`.
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
import type { GroundingReference } from '../../../00_core/14_compiler/types.js';
import type { Assert, CaseOf, Equal, NonEmptyTuple } from '../../../types.js';
import type { BindingResolution, PlatformBinding } from './types.js';

// ---------------------------------------------------------------------------
// Laws

/**
 * Compile-time law: a binding satisfies a core grounding rather than declaring
 * its own resource kind.
 *
 * Written against the imported authority. A local enumeration of platform
 * resource types would be a second vocabulary for a fact core already owns.
 */
export type ABindingSatisfiesACoreGrounding = Assert<
  Equal<
    [
      Equal<PlatformBinding['grounding'], GroundingReference>,
      'kind' extends keyof PlatformBinding ? true : false,
      'resource' extends keyof PlatformBinding ? true : false,
      'type' extends keyof PlatformBinding ? true : false,
    ],
    [true, false, false, false]
  >
>;


/**
 * Compile-time law: necessity is exact on the binding that carries it.
 *
 * A required binding must not be assignable where an optional one is expected.
 * If the parameter stops being read, both instantiations collapse to the union
 * and this flips.
 */
export type ARequiredBindingIsNotAnOptionalOne = Assert<
  Equal<PlatformBinding<'required'> extends PlatformBinding<'optional'> ? true : false, false>
>;


/**
 * Compile-time law: a binding holds no credential and no account.
 *
 * The absences are the law. This home declares what a deployment needs; it is
 * not a place for secrets to accumulate on the way to being deployed.
 */
export type ABindingHoldsNoSecret = Assert<
  Equal<
    [
      'token' extends keyof PlatformBinding ? true : false,
      'secret' extends keyof PlatformBinding ? true : false,
      'account' extends keyof PlatformBinding ? true : false,
      'credential' extends keyof PlatformBinding ? true : false,
      'connection' extends keyof PlatformBinding ? true : false,
    ],
    [false, false, false, false, false]
  >
>;


/** Compile-time law: an unsatisfied binding names itself and says why. */
export type AnUnsatisfiedBindingExplainsItself = Assert<
  Equal<
    [
      Equal<BindingResolution['_tag'], 'satisfied' | 'unsatisfied'>,
      Equal<CaseOf<BindingResolution, 'unsatisfied'>['diagnostics'], NonEmptyTuple<Diagnostic>>,
      Equal<CaseOf<BindingResolution, 'unsatisfied'>['binding'], PlatformBinding>,
    ],
    [true, true, true]
  >
>;
