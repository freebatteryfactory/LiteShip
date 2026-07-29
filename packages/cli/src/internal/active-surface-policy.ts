/**
 * LiteShip-local active-surface enrollment — the HOST derives load-bearing field
 * names from the real `@liteship/core` type union and injects them into `@liteship/audit`'s
 * reader oracle (audit-leaf-purity: audit names no core dialect).
 *
 * @module
 */
import type { ExportNode, TransitionNode } from '@liteship/core';
import type { EnrolledActiveSurface } from '@liteship/audit';

/** Project-owned reader enrollment for the active modeled-surface oracle. */
export const LITESHIP_ACTIVE_SURFACES = Object.freeze([
  {
    family: 'transition',
    switchCaseLabel: 'transition',
    readerFiles: [
      'packages/astro/src/runtime/graph-lower.ts',
      'packages/astro/src/runtime/graph-runtime.ts',
      'packages/core/src/motion/interpret-transition.ts',
    ],
    dedicatedReaderFiles: ['packages/core/src/motion/interpret-transition.ts'],
    dedicatedReaderSubject: 'transition',
  },
  {
    family: 'export',
    switchCaseLabel: 'export',
    readerFiles: ['packages/stage/src/dual-export.ts', 'packages/astro/src/runtime/graph-runtime.ts'],
    dedicatedReaderFiles: ['packages/stage/src/dual-export.ts'],
    dedicatedReaderSubject: 'exportNode',
  },
] as const satisfies readonly EnrolledActiveSurface[]);

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

/** Field obligations keyed by the project-owned family names above. */
export const LITESHIP_ACTIVE_SURFACE_REQUIRED_FIELDS = Object.freeze({
  transition: LITESHIP_TRANSITION_REQUIRED_FIELDS,
  export: LITESHIP_EXPORT_REQUIRED_FIELDS,
});
