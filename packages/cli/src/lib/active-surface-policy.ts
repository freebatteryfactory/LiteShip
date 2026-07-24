/**
 * LiteShip-local active-surface enrollment — the HOST derives load-bearing field
 * names from the real `@liteship/core` type union and injects them into `@liteship/audit`'s
 * reader oracle (ADR-0012 / audit-leaf-purity: audit names no core dialect).
 *
 * @module
 */
import type { ExportNode, TransitionNode } from '@liteship/core';

/** Load-bearing TransitionNode fields — derived from the real type, not string literals. */
export const LITESHIP_TRANSITION_REQUIRED_FIELDS = [
  'fromPose',
  'toPose',
  'routing',
  'durationMs',
] as const satisfies readonly (keyof TransitionNode)[];

/** Load-bearing ExportNode fields read by enrolled export interpreter paths. */
export const LITESHIP_EXPORT_REQUIRED_FIELDS = [
  'sourceRefs',
  'artifactDigest',
] as const satisfies readonly (keyof ExportNode)[];
