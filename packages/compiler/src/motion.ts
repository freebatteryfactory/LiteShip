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

function emitKeyframeStep(step: CssKeyframeStep): string {
  const pct = Math.round(step.offset * 100);
  const decls = Object.entries(step.properties)
    .map(([k, v]) => `    ${k}: ${v};`)
    .join('\n');
  return `  ${pct}% {\n${decls}\n  }`;
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

function delaySuffix(delayMs: number | undefined): string {
  return delayMs !== undefined && delayMs > 0 ? ` ${delayMs}ms` : '';
}

function transitionDecls(plan: CssMotionPlan, easingFn: string, delayMs?: number): string {
  const duration = `${plan.durationMs}ms`;
  const delay = delaySuffix(delayMs);
  return plan.transitionProperty.trim().length > 0
    ? plan.transitionProperty
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => `${p} ${duration} ${easingFn}${delay}`)
        .join(', ')
    : `all ${duration} ${easingFn}${delay}`;
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

  const fallback = [
    `@supports not (animation-timeline: view()) {`,
    `  ${plan.selector}[data-czap-state="${plan.toState}"] {`,
    `    transition: ${transitionDecls(plan, easingFn, delayMs)};`,
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

  const fallback = [
    `@supports not (animation-timeline: scroll()) {`,
    `  ${plan.selector}[data-czap-state="${plan.toState}"] {`,
    `    transition: ${transitionDecls(plan, easingFn, delayMs)};`,
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
