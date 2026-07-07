/**
 * LiteShip-local active-surface enrollment — the HOST derives load-bearing field
 * names from the real `@czap/core` type union and injects them into `@czap/audit`'s
 * reader oracle (ADR-0012 / audit-leaf-purity: audit names no core dialect).
 *
 * @module
 */
import type { TransitionNode } from '@czap/core';

/** Load-bearing TransitionNode fields — derived from the real type, not string literals. */
export const LITESHIP_TRANSITION_REQUIRED_FIELDS = [
  'fromPose',
  'toPose',
  'routing',
  'durationMs',
] as const satisfies readonly (keyof TransitionNode)[];
