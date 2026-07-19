/**
 * Active-surface FactPack — the type-only fact shape for field-level
 * active-modeled-surface-has-reader (#132). NO `typescript` dependency: the
 * HOST (`@liteship/audit`'s `buildActiveSurfaceFacts`) produces these facts;
 * the {@link activeModeledSurfaceReaderGate} decides over them.
 *
 * @module
 */

/** Blocking promotion — gates earn blocking via fixtures. The live TransitionNode path is now
 * `'blocking'` (#130 landed `interpretTransition`, which reads the fields — the gate self-proves green). */
export type ActiveSurfacePromotion = 'advisory' | 'blocking';

/**
 * One active modeled surface and the field-read verdict the oracle computed.
 * Obligations derive from the node-family union + status — never a hand-maintained
 * string registry in gauntlet.
 */
export interface ActiveSurfaceEntry {
  /** Document-graph node family — e.g. `'transition'`. */
  readonly family: string;
  /** Load-bearing fields that MUST be read when this surface is active. */
  readonly requiredFields: readonly string[];
  /** Fields the oracle observed a reader path accessing. */
  readonly readFields: readonly string[];
  /** Whether this surface is live in the repo (constructed / imported / sealed). */
  readonly active: boolean;
  /** Reader paths the oracle scanned (interpreter / lowerer / runtime). */
  readonly readerFiles: readonly string[];
  /** Required fields with no observed read — empty when inactive or fully wired. */
  readonly unreadFields: readonly string[];
  /**
   * Severity floor for unread fields. Now `'blocking'` for the live TransitionNode path —
   * #130 landed the `interpretTransition` reader, so the gate self-proves green at blocking.
   * (`'advisory'` remains available; self-proof fixtures also exercise `'blocking'`.)
   */
  readonly promotion: ActiveSurfacePromotion;
}

/** The injected FactPack — one row per enrolled active surface. */
export interface ActiveSurfaceFacts {
  readonly surfaces: readonly ActiveSurfaceEntry[];
}
