/**
 * DOM Diff Algorithm
 *
 * Idiomorph-inspired DOM diffing that:
 * - Matches nodes by semantic ID (data-liteship-id)
 * - Minimizes DOM mutations
 * - Preserves element identity where possible
 * - Captures and restores physical state
 * - Validates preserve constraints and emits rejections
 */

import { Diagnostics } from '@liteship/core';
import type { MorphConfig, MorphHints, MorphResult } from '../types.js';
import { dispatchLiteshipEvent } from '../wire/dispatch.js';
import * as SemanticIdModule from './semantic-id.js';
import * as HintsModule from './hints.js';
import * as Physical from '../physical/capture.js';
import * as PhysicalRestore from '../physical/restore.js';
// Import pure functions from diff-pure.ts (Effect-free)
import {
  defaultConfig,
  parseHTML,
  isSameNode,
  syncAttributes,
  syncChildren,
  findBestMatch,
  morphPure,
} from './diff-pure.js';

// Re-export pure functions for backwards compatibility
export { defaultConfig, parseHTML, isSameNode, syncAttributes, syncChildren, findBestMatch };

/**
 * Morph an existing DOM element to match new HTML using idiomorph-inspired
 * diffing that minimizes DOM mutations and preserves element identity.
 *
 * Prefer {@link morphWithState}: it is the default entry point. It layers
 * focus/scroll/selection capture+restore and preserve-constraint validation
 * on top of this bare morph, and degrades to exactly this behavior when no
 * config flags or preserve hints apply. Use bare `morph` only when you have
 * proven you need to skip physical state handling.
 */
export const morph = (oldNode: Element, newHTML: string, config?: Partial<MorphConfig>, hints?: MorphHints): void =>
  // ONE reconcile body: this entry delegates to `morphPure` so the morph-opaque
  // laws and callback wiring live in exactly one place and cannot drift between the
  // public entry point and the pure kernel.
  morphPure(oldNode, newHTML, config, hints);

/**
 * Morph with physical state capture and restore — the default entry point.
 *
 * Captures focus/scroll/selection before the morph (gated on config flags),
 * validates preserve hints afterwards (dispatching `liteship:morph-rejected` and
 * `liteship:request-snapshot` on violation), and restores physical state. When no
 * flags or hints apply it degrades to a plain {@link morph}.
 */
export const morphWithState = (
  oldNode: Element,
  newHTML: string,
  config?: Partial<MorphConfig>,
  hints?: MorphHints,
): MorphResult => {
  const finalConfig = { ...defaultConfig, ...config };

  const state =
    finalConfig.preserveFocus || finalConfig.preserveScroll || finalConfig.preserveSelection
      ? Physical.capture(oldNode)
      : null;

  const preserveIds = hints?.preserve ?? hints?.preserveIds ?? [];
  if (preserveIds.length > 0) {
    const preserveIndex = SemanticIdModule.buildIndex(oldNode);
    for (const id of preserveIds) {
      if (!preserveIndex.has(id)) {
        Diagnostics.warn({
          source: 'liteship/web.morph',
          code: 'preserve-id-missing',
          message: `Preserve ID "${id}" was not found in the old DOM tree before morphing. Preserve IDs are matched against data-liteship-id attributes — check for a typo, or add data-liteship-id="${id}" to the element you want preserved.`,
        });
      }
    }
  }

  morph(oldNode, newHTML, finalConfig, hints);

  const rejection = HintsModule.rejectIfMissing(hints ?? {}, oldNode);
  if (rejection) {
    dispatchLiteshipEvent(oldNode, 'liteship:morph-rejected', {
      ...rejection,
      recovery: 'A liteship:request-snapshot event was dispatched to recover — listen for it to fetch fresh state.',
    });

    dispatchLiteshipEvent(oldNode, 'liteship:request-snapshot', { reason: rejection.reason });

    return { type: 'rejected' as const, rejection };
  }

  const remapIds = hints?.remap ?? (hints?.idMap ? Object.fromEntries(hints.idMap) : undefined);
  if (remapIds) {
    SemanticIdModule.applyIdMap(oldNode, remapIds);
  }

  if (state) {
    const remappedState = remapIds ? HintsModule.applyRemap(state, remapIds) : state;
    PhysicalRestore.restore(remappedState, oldNode, remapIds);
  }

  return { type: 'success' as const };
};

/**
 * DOM morph namespace.
 *
 * {@link morphWithState} is the default entry point — it preserves focus,
 * scroll, and selection across the morph and validates preserve hints.
 * Bare {@link morph} skips all of that and is only for callers that have
 * proven they need to.
 */
export const Morph = {
  morph,
  morphWithState,
  parseHTML,
  defaultConfig,
} as const;
