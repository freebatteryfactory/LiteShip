/**
 * Native-CSS motion compiler — emits `@property`, `@keyframes`, `@starting-style`,
 * state-keyed transitions, and an `@supports`-gated `animation-timeline` path.
 *
 * Consumes a {@link CssMotionPlan} from `interpretTransition` (#130 child 4).
 *
 * @module
 */

import {
  Easing,
  formatTypedValue,
  type CssMotionPlan,
  type CssKeyframeStep,
  type MotionPropertyTween,
  type TypedValue,
} from '@czap/core';

/** Spring physics config — mirrors {@link Easing.spring} input. */
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

/** Input to {@link MotionCompiler.compile}. */
export interface MotionCompileInput {
  readonly plan: CssMotionPlan;
  readonly easing?: MotionEasing;
  readonly spring?: MotionSpringConfig;
  readonly viewTimeline?: MotionViewTimeline;
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
      return '<length>';
    case 'angle':
      return '<angle>';
    case 'transform':
      return null;
  }
}

function keyframeName(plan: CssMotionPlan): string {
  return `czap-motion-${plan.fromState}-${plan.toState}`;
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

function resolveEasing(easing: MotionEasing | undefined, spring?: MotionSpringConfig): string {
  switch (easing ?? 'ease') {
    case 'linear':
      return 'linear';
    case 'spring':
      return Easing.springToLinearCSS(spring ?? { stiffness: 200, damping: 20 });
    case 'ease':
      return 'ease';
  }
}

function transitionDecls(plan: CssMotionPlan, easingFn: string): string {
  const duration = `${plan.durationMs}ms`;
  return plan.transitionProperty.trim().length > 0
    ? plan.transitionProperty
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => `${p} ${duration} ${easingFn}`)
        .join(', ')
    : `all ${duration} ${easingFn}`;
}

function emitTransitionRule(plan: CssMotionPlan, easingFn: string): string {
  return [
    `${plan.selector}[data-czap-state="${plan.toState}"] {`,
    `  transition: ${transitionDecls(plan, easingFn)};`,
    `}`,
  ].join('\n');
}

function emitScrollTimeline(plan: CssMotionPlan, viewTimeline: MotionViewTimeline, easingFn: string): string {
  const name = keyframeName(plan);
  const [start, end] = viewTimeline.range;

  const supported = [
    `@supports (animation-timeline: view()) {`,
    `  ${plan.selector} {`,
    `    animation: ${name} 1 ${easingFn};`,
    `    animation-timeline: view();`,
    `    animation-range: ${start} ${end};`,
    `  }`,
    `}`,
  ].join('\n');

  const fallback = [
    `@supports not (animation-timeline: view()) {`,
    `  ${plan.selector}[data-czap-state="${plan.toState}"] {`,
    `    transition: ${transitionDecls(plan, easingFn)};`,
    `  }`,
    `}`,
  ].join('\n');

  return [supported, fallback].join('\n\n');
}

function compile(input: MotionCompileInput): MotionCompileResult {
  const { plan, easing, spring, viewTimeline } = input;
  const easingFn = resolveEasing(easing, spring);

  const propertyRegistrations = emitPropertyRegistrations(plan.properties);
  const keyframes = emitKeyframes(plan);
  const startingStyle = emitStartingStyle(plan);
  const transition = emitTransitionRule(plan, easingFn);
  const scrollTimeline = viewTimeline ? emitScrollTimeline(plan, viewTimeline, easingFn) : '';

  const sections = [propertyRegistrations, keyframes, startingStyle, transition, scrollTimeline].filter(
    (s) => s.length > 0,
  );

  return {
    raw: sections.join('\n\n'),
    propertyRegistrations,
    keyframes,
    startingStyle,
    transition,
    scrollTimeline,
  };
}

/**
 * Native-CSS motion compiler namespace.
 *
 * Compiles a {@link CssMotionPlan} into `@property` registrations, `@keyframes`,
 * `@starting-style`, state-keyed transitions, and an optional `@supports`-gated
 * scroll/view timeline path with spring easing via {@link Easing.springToLinearCSS}.
 */
export const MotionCompiler = {
  compile,
} as const;
