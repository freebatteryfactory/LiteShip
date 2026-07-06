/**
 * Active-surface FactPack — the type-only fact shape for field-level
 * active-modeled-surface-has-reader (#132). NO `typescript` dependency: the
 * HOST ({@link @czap/audit}'s `buildActiveSurfaceFacts`) produces these facts;
 * the {@link activeModeledSurfaceReaderGate} decides over them.
 *
 * @module
 */

/** Blocking promotion — gates earn blocking via fixtures; live orphans stay advisory until #130. */
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
   * Severity floor for unread fields. `'advisory'` for the live TransitionNode orphan
   * until #130 lands the real interpreter; `'blocking'` in self-proof fixtures.
   */
  readonly promotion: ActiveSurfacePromotion;
}

/** The injected FactPack — one row per enrolled active surface. */
export interface ActiveSurfaceFacts {
  readonly surfaces: readonly ActiveSurfaceEntry[];
}
