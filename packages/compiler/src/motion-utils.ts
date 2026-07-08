/**
 * Shared motion compile helpers.
 *
 * @module
 */

import type { CssMotionPlan } from '@czap/core';
import type { MotionCompileResult } from './motion.js';

/** Emit a transform consumer so `@property`-interpolated translate axes actually move the element. */
export function appendTranslateConsumer(css: MotionCompileResult, plan: CssMotionPlan): MotionCompileResult {
  const target = plan.selector.match(/data-czap-boundary="([^"]+)"/)?.[1];
  if (target === undefined) return css;

  const hasTranslateAxis = plan.properties.some(
    (prop) => prop.property.startsWith(`--czap-${target}-`) && /-[xyz]$/.test(prop.property),
  );
  if (!hasTranslateAxis) return css;

  const rule = `${plan.selector} {\n  transform: translate3d(var(--czap-${target}-x,0px),var(--czap-${target}-y,0px),var(--czap-${target}-z,0px));\n}`;
  return { ...css, raw: `${css.raw}\n\n${rule}` };
}
