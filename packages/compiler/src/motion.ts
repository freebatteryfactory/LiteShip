/**
 * Native-CSS motion compiler — emits `@property`, `@keyframes`, `@starting-style`,
 * state-keyed transitions, and an `@supports`-gated `animation-timeline` path.
 *
 * Consumes a `CssMotionPlan` from `interpretTransition` (#130 child 4).
 *
 * @module
 */

import {
  Easing,
  DEFAULT_MOTION_SPRING,
  formatTypedValue,
  type CssMotionPlan,
  type CssKeyframeStep,
  type MotionPropertyTween,
  type RuntimeEasing,
  type TypedValue,
} from '@czap/core';

/** Spring physics config — mirrors `Easing.spring` input. */
export interface MotionSpringConfig {
  readonly stiffness?: number;
  readonly damping?: number;
  readonly mass?: number;
}

/** Easing mode for emitted CSS timing functions. */
export type MotionEasing = 'linear' | 'ease' | 'spring';

/** Optional scroll/view timeline range for the `@supports`-gated path. */
export interface MotionViewTimeline {
  readonly range: readonly [string, string];
}

/** Standalone scroll-root timeline for `animation-timeline: scroll()` (#126). */
export interface MotionScrollTimeline {
  readonly axis?: 'block' | 'inline' | 'x' | 'y';
  readonly range: readonly [string, string];
}

/** Input to {@link MotionCompiler.compile}. */
export interface MotionCompileInput {
  readonly plan: CssMotionPlan;
  readonly easing?: MotionEasing;
  readonly spring?: MotionSpringConfig;
  readonly viewTimeline?: MotionViewTimeline;
  readonly scrollTimeline?: MotionScrollTimeline;
  /** Stagger offset applied as animation/transition delay (#124). */
  readonly delayMs?: number;
}

/** CSS artifacts emitted by {@link MotionCompiler.compile}. */
export interface MotionCompileResult {
  /** Full concatenated CSS sheet (sections joined by blank lines). */
  readonly raw: string;
  readonly propertyRegistrations: string;
  readonly keyframes: string;
  readonly startingStyle: string;
  readonly transition: string;
  /** `@supports (animation-timeline: …)` block; empty when no view timeline. */
  readonly scrollTimeline: string;
}

function syntaxForTypedValue(value: TypedValue): string | null {
  switch (value.k) {
    case 'number':
    case 'opacity':
      return '<number>';
    case 'length':
      return value.unit === '%' ? '<length-percentage>' : '<length>';
    case 'angle':
      return '<angle>';
    case 'color':
      return '<color>';
    case 'transform':
      return null;
  }
}

function keyframeName(plan: CssMotionPlan): string {
  const target = plan.selector.match(/data-czap-boundary="([^"]+)"/)?.[1] ?? 'motion';
  return `czap-motion-${target}-${plan.fromState}-${plan.toState}`;
}

function emitPropertyRegistrations(properties: readonly MotionPropertyTween[]): string {
  const blocks: string[] = [];
  const seen = new Set<string>();

  for (const prop of properties) {
    const cssVar = prop.property.startsWith('--') ? prop.property : null;
    if (!cssVar || seen.has(cssVar)) continue;

    const syntax = syntaxForTypedValue(prop.from);
    if (!syntax) continue;

    seen.add(cssVar);
    const initial = formatTypedValue(prop.from);
    blocks.push(`@property ${cssVar} {\n  syntax: "${syntax}";\n  inherits: false;\n  initial-value: ${initial};\n}`);
  }

  return blocks.join('\n\n');
}

/**
 * Format a normalized `[0,1]` keyframe offset as a CSS percentage, PRESERVING fractional
 * seams. A composed program (delays, stagger, uneven step durations) produces offsets like
 * `1/3` or `1/1000` — integer rounding would collapse those onto an adjacent stop (a 1ms
 * step in a 1000ms sequence becomes another `0%` keyframe), so the native `@keyframes`
 * timeline would diverge from the EXACT offsets the JS/stage/worker samplers read. Round to
 * 4 decimals (0.01% resolution) and strip trailing zeros so `0.25 → 25`, `1/3 → 33.3333`.
 */
function formatKeyframeOffsetPct(offset: number): string {
  return `${+(offset * 100).toFixed(4)}`;
}

function emitKeyframeStep(step: CssKeyframeStep): string {
  const pct = formatKeyframeOffsetPct(step.offset);
  const decls = Object.entries(step.properties).map(([k, v]) => `    ${k}: ${v};`);
  // A composed program with non-default easing carries the segment's own curve here so the
  // native animation samples each segment with its authored easing — matching the JS/stage/worker
  // per-window floors (cross-target parity). Per-keyframe `animation-timing-function` governs
  // the segment STARTING at this stop and overrides the animation-level function for it.
  // Absent on default-`ease` plans and single-step transitions (no output change there).
  if (step.easing) {
    decls.push(`    animation-timing-function: ${resolveStepEasing(step.easing)};`);
  }
  return `  ${pct}% {\n${decls.join('\n')}\n  }`;
}

function emitKeyframes(plan: CssMotionPlan): string {
  const name = keyframeName(plan);
  const steps = plan.keyframes.map(emitKeyframeStep).join('\n');
  return [`@keyframes ${name} {`, steps, `}`].join('\n');
}

function emitStartingStyle(plan: CssMotionPlan): string {
  const start = plan.keyframes.find((k) => k.offset === 0);
  if (!start || Object.keys(start.properties).length === 0) return '';

  const decls = Object.entries(start.properties)
    .map(([k, v]) => `      ${k}: ${v};`)
    .join('\n');

  return [`@starting-style {`, `    ${plan.selector} {`, decls, `    }`, `}`].join('\n');
}

/** From-state declarations for the base rule (persist outside starting-style only). */
function fromStateDecls(plan: CssMotionPlan): string {
  const start = plan.keyframes.find((k) => k.offset === 0);
  if (!start || Object.keys(start.properties).length === 0) return '';
  return Object.entries(start.properties)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');
}

function resolveEasing(easing: MotionEasing | undefined, spring?: MotionSpringConfig): string {
  switch (easing ?? 'ease') {
    case 'linear':
      return 'linear';
    case 'spring':
      return Easing.springToLinearCSS(spring ?? DEFAULT_MOTION_SPRING);
    case 'ease':
      return 'ease';
  }
}

/**
 * Resolve a PER-KEYFRAME {@link RuntimeEasing} descriptor to a CSS timing function.
 * Generalizes {@link resolveEasing} to the widened easing vocabulary: a serialized
 * `points` list is emitted VERBATIM as the `linear()` string the JS floor lerps (Law 4,
 * the byte-law — one producer feeds both legs); the analytic `linear`/`ease`/`spring`
 * kinds keep their closed forms, and any widened-catalog kind lacking a points arm lowers
 * through {@link Easing.easingToLinearCSS} — the SAME sampler `sampleRuntimeEasing` reads.
 */
function resolveStepEasing(easing: RuntimeEasing): string {
  if (easing.points !== undefined && easing.points.length >= 2) {
    return `linear(${easing.points.join(', ')})`;
  }
  switch (easing.kind) {
    case 'linear':
      return 'linear';
    case 'ease':
      return 'ease';
    case 'spring':
      return Easing.springToLinearCSS(easing.spring ?? DEFAULT_MOTION_SPRING);
    case 'bounce':
      return Easing.easingToLinearCSS(Easing.easeOutBounce);
    case 'elastic':
      return Easing.easingToLinearCSS(Easing.easeOutElastic);
    case 'back':
      return Easing.easingToLinearCSS(Easing.easeOutBack);
    case 'points':
    case 'cubicBezier':
      return 'ease';
  }
}

function delaySuffix(delayMs: number | undefined): string {
  return delayMs !== undefined && delayMs > 0 ? ` ${delayMs}ms` : '';
}

/**
 * The `[start, end]` offsets a property ACTIVELY tweens over, read from the keyframe
 * stops: the last offset it still holds its initial value (before it FIRST departs) and
 * the offset it becomes PERMANENTLY final (the stop after its LAST departure from the
 * final value). A single-transition plan has exactly two stops, so every property yields
 * `[0, 1]` — the whole span. A multi-window program (`par` / `seq` / stagger) is where
 * they differ: a `par` opacity that completes at `200/600` yields `[0, 1/3]`, a `seq`
 * step yields `[0.25, 1]`. `end` is the LAST departure (not the first final-value stop):
 * a property that reaches its final value early, LEAVES it, and RE-reaches it later keeps
 * animating until that last return, so the fallback must not finish and hold early. A
 * constant property (`initial === final`) collapses and falls back to the full span.
 */
function propertyActiveWindow(
  sortedStops: readonly CssKeyframeStep[],
  property: string,
): { readonly start: number; readonly end: number } {
  const values = sortedStops.map((stop) => stop.properties[property]);
  const first = sortedStops[0]!.offset;
  const last = sortedStops[sortedStops.length - 1]!.offset;
  const initial = values[0];
  const final = values[values.length - 1];

  // start: the last stop of the contiguous run that still holds `initial` — where it
  // FIRST departs (a later return to `initial` does not un-start the tween).
  let start = first;
  for (let i = 0; i < sortedStops.length; i++) {
    if (values[i] === initial) start = sortedStops[i]!.offset;
    else break;
  }
  // end: the stop AFTER the property's LAST departure from `final` — where it settles
  // permanently. Scanning for the FIRST final-value stop would end (and hold) too early
  // when the property leaves and re-reaches its final value in a later window.
  let lastDeparture = -1;
  for (let i = sortedStops.length - 1; i >= 0; i--) {
    if (values[i] !== final) {
      lastDeparture = i;
      break;
    }
  }
  const end = lastDeparture === -1 ? first : sortedStops[Math.min(lastDeparture + 1, sortedStops.length - 1)]!.offset;

  // A constant property (initial === final) collapses to end <= start — there is no real
  // tween, so hand it the full span rather than a zero/negative duration.
  return end > start ? { start, end } : { start: first, end: last };
}

/**
 * Compose the `transition` shorthand. Each property animates over ITS OWN window
 * (`propertyActiveWindow`), so a `par`/stagger program whose opacity completes at
 * `200/600` emits `opacity 200ms` (with the right delay) — not the composed total for
 * every property, which would make the transition fallback diverge from the keyframe /
 * JS-floor path (cross-target parity). A single-transition plan yields `[0,1]` for every
 * property, so this is byte-identical to a uniform `durationMs` there.
 *
 * KNOWN LIMITATION (inherent to CSS `transition`, not the window math): a `transition` is a
 * single point-to-point interpolation from the property's start value to its END-STATE value
 * (the `t=1` keyframe). It CANNOT render a NON-MONOTONIC / returning path — a program whose
 * opacity goes `0 → 1 → 0` has equal start and end, so the transition is a `0 → 0` no-op and
 * the middle peak never shows in this fallback. The multi-offset `@keyframes` and the JS floor
 * DO render the arc faithfully; the single-segment transition is the last-resort tier (no
 * `animation-timeline`, no JS) and only approximates monotonic motion. Rendering the arc in the
 * fallback would require a time-based `@keyframes` animation instead of a transition (a
 * deliberate change to the tier's semantics), not a different window.
 */
function transitionDecls(plan: CssMotionPlan, easingFn: string, delayMs?: number): string {
  const baseDelayMs = delayMs !== undefined && delayMs > 0 ? delayMs : 0;
  const props = plan.transitionProperty
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (props.length === 0) {
    return `all ${plan.durationMs}ms ${easingFn}${delaySuffix(delayMs)}`;
  }

  const stops = [...plan.keyframes].sort((a, b) => a.offset - b.offset);
  if (stops.length < 2) {
    // No window structure to read — every property spans the full duration.
    return props.map((p) => `${p} ${plan.durationMs}ms ${easingFn}${delaySuffix(delayMs)}`).join(', ');
  }

  return props
    .map((p) => {
      const { start, end } = propertyActiveWindow(stops, p);
      const durationMs = Math.round((end - start) * plan.durationMs);
      const delayMsForProp = Math.round(baseDelayMs + start * plan.durationMs);
      return `${p} ${durationMs}ms ${easingFn}${delayMsForProp > 0 ? ` ${delayMsForProp}ms` : ''}`;
    })
    .join(', ');
}

function emitBaseRule(plan: CssMotionPlan): string {
  const fromDecls = fromStateDecls(plan);
  if (fromDecls.length === 0) return '';
  return [`${plan.selector} {`, fromDecls, `}`].join('\n');
}

function emitTransitionRule(plan: CssMotionPlan, easingFn: string, delayMs?: number): string {
  const end = plan.keyframes.find((k) => k.offset === 1) ?? plan.keyframes.at(-1);
  const endDecls =
    end && Object.keys(end.properties).length > 0
      ? Object.entries(end.properties)
          .map(([k, v]) => `  ${k}: ${v};`)
          .join('\n')
      : '';

  return [
    `${plan.selector}[data-czap-state="${plan.toState}"] {`,
    ...(endDecls.length > 0 ? [endDecls] : []),
    `  transition: ${transitionDecls(plan, easingFn, delayMs)};`,
    `}`,
  ].join('\n');
}

function scrollTimelineFn(scrollTimeline: MotionScrollTimeline): string {
  switch (scrollTimeline.axis) {
    case 'x':
      return 'scroll(nearest inline)';
    case 'y':
      return 'scroll(nearest block)';
    case 'inline':
      return 'scroll(nearest inline)';
    case 'block':
    default:
      return 'scroll()';
  }
}

function emitViewTimeline(
  plan: CssMotionPlan,
  viewTimeline: MotionViewTimeline,
  easingFn: string,
  delayMs?: number,
): string {
  const name = keyframeName(plan);
  const [start, end] = viewTimeline.range;
  const delay = delayMs !== undefined && delayMs > 0 ? `\n    animation-delay: ${delayMs}ms;` : '';

  const fallback = [
    `@supports not (animation-timeline: view()) {`,
    `  ${plan.selector}[data-czap-state="${plan.toState}"] {`,
    `    transition: ${transitionDecls(plan, easingFn, delayMs)};`,
    `  }`,
    `}`,
  ].join('\n');

  // A plan DENIED native-timeline ownership (overlapping windows disagree on easing, #148)
  // emits NO `@supports (animation-timeline)` ownership block: without an `animation-name`
  // binding `getComputedStyle(el).animationName` carries no `czap-motion-*` name, so the
  // Astro runtime's `nativeTimelineOwnsElement` stays false and the per-window runtime floor
  // renders each child at its own easing (ADR-0041). The no-support transition fallback still
  // ships for browsers lacking `animation-timeline` (where the floor already owns rendering).
  if (!plan.nativeTimeline.eligible) return fallback;

  const supported = [
    `@supports (animation-timeline: view()) {`,
    `  ${plan.selector} {`,
    `    animation-name: ${name};`,
    `    animation-duration: auto;`,
    `    animation-timing-function: ${easingFn};`,
    `    animation-fill-mode: both;`,
    `    animation-timeline: view();`,
    `    animation-range: ${start} ${end};${delay}`,
    `  }`,
    `}`,
  ].join('\n');

  return [supported, fallback].join('\n\n');
}

function emitScrollRootTimeline(
  plan: CssMotionPlan,
  scrollTimeline: MotionScrollTimeline,
  easingFn: string,
  delayMs?: number,
): string {
  const name = keyframeName(plan);
  const [start, end] = scrollTimeline.range;
  const timeline = scrollTimelineFn(scrollTimeline);
  const delay = delayMs !== undefined && delayMs > 0 ? `\n    animation-delay: ${delayMs}ms;` : '';

  const fallback = [
    `@supports not (animation-timeline: scroll()) {`,
    `  ${plan.selector}[data-czap-state="${plan.toState}"] {`,
    `    transition: ${transitionDecls(plan, easingFn, delayMs)};`,
    `  }`,
    `}`,
  ].join('\n');

  // See emitViewTimeline: a plan denied native ownership (#148) emits only the no-support
  // fallback, leaving the per-window runtime floor to own rendering (ADR-0041).
  if (!plan.nativeTimeline.eligible) return fallback;

  const supported = [
    `@supports (animation-timeline: scroll()) {`,
    `  ${plan.selector} {`,
    `    animation-name: ${name};`,
    `    animation-duration: auto;`,
    `    animation-timing-function: ${easingFn};`,
    `    animation-fill-mode: both;`,
    `    animation-timeline: ${timeline};`,
    `    animation-range: ${start} ${end};${delay}`,
    `  }`,
    `}`,
  ].join('\n');

  return [supported, fallback].join('\n\n');
}

function compile(input: MotionCompileInput): MotionCompileResult {
  const { plan, easing, spring, viewTimeline, scrollTimeline, delayMs } = input;
  const easingFn = resolveEasing(easing, spring);

  const propertyRegistrations = emitPropertyRegistrations(plan.properties);
  const keyframes = emitKeyframes(plan);
  const startingStyle = emitStartingStyle(plan);
  const baseRule = emitBaseRule(plan);
  const transition = emitTransitionRule(plan, easingFn, delayMs);
  const timelineBlock = scrollTimeline
    ? emitScrollRootTimeline(plan, scrollTimeline, easingFn, delayMs)
    : viewTimeline
      ? emitViewTimeline(plan, viewTimeline, easingFn, delayMs)
      : '';
  const scrollTimelineCss = timelineBlock;

  const sections = [propertyRegistrations, keyframes, startingStyle, baseRule, transition, scrollTimelineCss].filter(
    (s) => s.length > 0,
  );

  return {
    raw: sections.join('\n\n'),
    propertyRegistrations,
    keyframes,
    startingStyle,
    transition,
    scrollTimeline: scrollTimelineCss,
  };
}

/**
 * Native-CSS motion compiler namespace.
 *
 * Compiles a `CssMotionPlan` into `@property` registrations, `@keyframes`,
 * `@starting-style`, state-keyed transitions, and an optional `@supports`-gated
 * scroll/view timeline path with spring easing via `Easing.springToLinearCSS`.
 */
export const MotionCompiler = {
  compile,
} as const;
