/**
 * The fully wired `liteship` adaptive composition root.
 *
 * Core owns the pure lowering kernel and structural contract. Quantizer and
 * compiler own their existing semantic implementations. This module composes
 * those owners explicitly, so `defineAdaptive(...).plan()` never depends on a
 * prior side-effect import or mutable ambient registration.
 *
 * @module
 */

import { lowerAdaptive } from '@liteship/core';
import type { Adaptive, AdaptiveLowering, AdaptiveSpec, Style } from '@liteship/core';
import { defineQuantizer, resolveQuantizerTargets } from '@liteship/quantizer';
import { StyleCSSCompiler } from '@liteship/compiler';

const lowering: AdaptiveLowering = {
  defineQuantizer: defineQuantizer as AdaptiveLowering['defineQuantizer'],
  resolveQuantizerTargets,
  compileAdaptiveCss: (style: Style): string => StyleCSSCompiler.compileAdaptive(style),
};

/** Define adaptive intent using the real core, quantizer, and compiler owners. */
export function defineAdaptive<const B extends AdaptiveSpec['boundary']>(spec: AdaptiveSpec<B>): Adaptive {
  return lowerAdaptive(spec, lowering);
}
