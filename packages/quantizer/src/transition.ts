/**
 * Transition configuration for state crossings.
 * Maps `from->to` state pairs to duration/easing/delay configs.
 *
 * @module
 */

import type { Boundary, StateUnion, Quantizer, Easing, Millis } from '@czap/core';
import { Millis as mkMillis } from '@czap/core';

/**
 * Per-transition animation parameters.
 *
 * Used by {@link AnimatedQuantizer} to drive interpolation between two
 * state output records. `duration` of `0` produces an instantaneous snap.
 */
export interface TransitionConfig {
  /** Animation duration in milliseconds (branded via {@link Millis}). */
  readonly duration: Millis;
  /** Easing function applied to progress; defaults to linear. */
  readonly easing?: Easing.Fn;
  /** Delay before the animation begins, in milliseconds. */
  readonly delay?: Millis;
}

/**
 * State-transition map keyed by `"from->to"` literal or `"*"` wildcard.
 *
 * Lookup resolves exact keys first, then the wildcard, then falls back to
 * an instantaneous transition (duration: 0).
 *
 * The key template is generic over the state union `S`, so with a concrete
 * boundary (`TransitionMap<'mobile' | 'tablet'>`) only real `from->to`
 * pairs type-check — keys like `'*->*'` (which never match at runtime;
 * the any-to-any wildcard is `'*'`) are compile errors, not silent
 * duration-0 transitions.
 */
export type TransitionMap<S extends string = string> = {
  /** Wildcard fallback applied when no exact `from->to` key matches. */
  readonly '*'?: TransitionConfig;
} & {
  /** Exact `"from->to"` transition keys derived from the state union `S`. */
  readonly [K in `${S}->${S}`]?: TransitionConfig;
};

/**
 * Resolver that maps a boundary crossing to its {@link TransitionConfig}.
 *
 * Produced by {@link Transition.for}; consumed by {@link AnimatedQuantizer}
 * during animation loop setup.
 */
export interface Transition<B extends Boundary.Shape> {
  /** The raw transition map used to create this resolver. */
  readonly config: TransitionMap<StateUnion<B> & string>;
  /** Resolve the transition config for a specific `from -> to` state pair. */
  getTransition(from: StateUnion<B>, to: StateUnion<B>): TransitionConfig;
}

const DEFAULT_TRANSITION: TransitionConfig = {
  duration: mkMillis(0),
};

/**
 * Build a Transition resolver for a given quantizer and transition map.
 *
 * Resolution order:
 *   1. Exact match: `"stateA->stateB"`
 *   2. Wildcard: `"*"`
 *   3. Fallback: instant transition (duration: 0)
 */
function createTransition<B extends Boundary.Shape>(
  _quantizer: Quantizer<B>,
  transitionConfig: TransitionMap<StateUnion<B> & string>,
): Transition<B> {
  return {
    config: transitionConfig,
    getTransition(from: StateUnion<B>, to: StateUnion<B>): TransitionConfig {
      // Exact match first. TransitionMap's pair keys are a generic template
      // over the state union; the union is erased at runtime, so this seam
      // reads the map as a plain string-keyed record.
      const exactKey = `${from as string}->${to as string}`;
      const lookup: Readonly<Record<string, TransitionConfig | undefined>> = transitionConfig;
      const exact = lookup[exactKey];
      if (exact !== undefined) return exact;

      // Wildcard fallback
      const wildcard = transitionConfig['*'];
      if (wildcard !== undefined) return wildcard;

      // No transition configured -- instant
      return DEFAULT_TRANSITION;
    },
  };
}

/**
 * Transition resolver namespace.
 *
 * `Transition.for(quantizer, map)` produces a {@link Transition} that looks
 * up animation parameters by `from->to` state pairs. Consumed by
 * {@link AnimatedQuantizer} for interpolation setup.
 */
export const Transition = {
  /** Build a {@link Transition} resolver for the given quantizer and transition map. */
  for: createTransition,
} as const;
