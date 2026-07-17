/**
 * Shared motion compile helpers.
 *
 * @module
 */

import type { CssMotionPlan } from '@czap/core';
import type { MotionCompileResult } from './motion.js';

/**
 * Client-side reduced-motion floor: an `@media (prefers-reduced-motion: reduce)`
 * block that kills the tween AND settles the boundary at its end pose.
 *
 * Emitted UNCONDITIONALLY when the intent's policy is `reducedMotion: 'settle'`
 * — not only when the compiler was called with a server-side
 * `prefersReducedMotion` hint. The hint path (Sec-CH detection) zeroes durations
 * for a better first paint, but a default/cached/no-hint compile must still
 * respect the user's OS preference in the browser; that is the whole point of
 * the media query. Targets the plan's real selector (the stamped
 * `data-czap-boundary` attribute), and applies the end-state declarations so a
 * `from { opacity: 0 }` boundary settles VISIBLE instead of freezing hidden.
 */
export function appendReducedMotionGuard(css: MotionCompileResult, plan: CssMotionPlan): MotionCompileResult {
  const end = plan.keyframes.find((step) => step.offset === 1) ?? plan.keyframes.at(-1);
  const endDecls = end
    ? Object.entries(end.properties)
        .map(([property, value]) => `    ${property}: ${value};`)
        .join('\n')
    : '';

  const guard = [
    `@media (prefers-reduced-motion: reduce) {`,
    `  ${plan.selector} {`,
    `    animation: none !important;`,
    `    transition: none !important;`,
    ...(endDecls.length > 0 ? [endDecls] : []),
    `  }`,
    `}`,
  ].join('\n');

  return { ...css, raw: `${css.raw}\n\n${guard}` };
}

/**
 * Emit an INDIVIDUAL-transform consumer so `@property`-interpolated translate axes
 * actually move the element (Wave-4, #148): the CSS `translate:` property reads the
 * per-axis `--czap-<target>-{x,y,z}` custom props directly — NOT a composite
 * `transform: translate3d(...)`. The individual `translate` property composes
 * independently of `rotate`/`scale` and any authored `transform`, so a boundary can carry
 * a translate track alongside other transforms without one clobbering the other; the
 * runtime floor keeps writing the SAME `--czap-<target>-*` vars, so both legs read one
 * source (cross-target parity). Absent unless the plan actually tweens a translate axis.
 */
export function appendTranslateConsumer(css: MotionCompileResult, plan: CssMotionPlan): MotionCompileResult {
  const target = plan.selector.match(/data-czap-boundary="([^"]+)"/)?.[1];
  if (target === undefined) return css;

  const hasTranslateAxis = plan.properties.some(
    (prop) => prop.property.startsWith(`--czap-${target}-`) && /-[xyz]$/.test(prop.property),
  );
  if (!hasTranslateAxis) return css;

  const rule = `${plan.selector} {\n  translate: var(--czap-${target}-x,0px) var(--czap-${target}-y,0px) var(--czap-${target}-z,0px);\n}`;
  return { ...css, raw: `${css.raw}\n\n${rule}` };
}
