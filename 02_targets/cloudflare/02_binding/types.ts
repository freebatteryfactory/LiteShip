/**
 * Platform resource bindings, declared as requirements against core's grounding
 * vocabulary rather than modelled as a resource catalogue.
 *
 * A key-value namespace, a database, an object store, a durable coordinator, a
 * connection pool — the platform provides each of these, and LiteShip already
 * has a word for "a capability something else grounds". Inventing a parallel
 * resource model here would mean two vocabularies for one fact, and the
 * deployment would have to reconcile them.
 *
 * So a binding says three things: what the program calls it, which grounding it
 * satisfies, and whether the deployment can proceed without it. Nothing here
 * holds a credential, an account, or a connection.
 *
 * @module
 */

import type {
  Algebra,
  Assert,
  Brand,
  CaseOf,
  Equal,
  NonEmptyTuple,
} from '../../../types.js';
import type { GroundingReference } from '../../../00_core/14_compiler/types.js';
import type { Diagnostic } from '../../../00_core/00_error/types.js';

/** The name a program uses to reach a platform resource. */
export type BindingName = Brand<string, 'liteship.target.cloudflare.binding-name'>;

/**
 * Whether a deployment can proceed without this binding.
 *
 * Carried, not inferred. A binding whose absence is fatal and one whose absence
 * degrades a feature are different deployments, and a consumer that cannot tell
 * them apart will treat the first as the second exactly once.
 */
export type BindingNecessity = 'required' | 'optional';

/** One declared platform binding. */
export interface PlatformBinding<Necessity extends BindingNecessity = BindingNecessity> {
  readonly name: BindingName;
  readonly grounding: GroundingReference;
  readonly necessity: Necessity;
}

/**
 * Whether the platform actually satisfied a declared binding.
 *
 * `unsatisfied` is a first-class arm carrying diagnostics. The predecessor's
 * general failure shape was silent degradation, and a missing binding resolved
 * to a no-op is the same shape wearing infrastructure clothes.
 */
export type BindingResolution = Algebra<{
  satisfied: { readonly binding: PlatformBinding };
  unsatisfied: {
    readonly binding: PlatformBinding;
    readonly diagnostics: NonEmptyTuple<Diagnostic>;
  };
}>;

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

/** The families this home owns, so none is correct and unreached. */
export interface CloudflareBindingTypeSurface {
  readonly name: BindingName;
  readonly necessity: BindingNecessity;
  readonly binding: PlatformBinding;
  readonly resolution: BindingResolution;
}
