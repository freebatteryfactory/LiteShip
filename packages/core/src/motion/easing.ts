/**
 * Easing -- pure math easing functions.
 *
 * All functions map t in [0,1] to value in [0,1].
 * Zero dependencies -- pure arithmetic.
 *
 * @module
 */

import { EASING_SPRING_STEPS, SPRING_DEFAULT_STIFFNESS, SPRING_DEFAULT_DAMPING } from '../authoring/defaults.js';
import { ValidationError } from '@liteship/error';

type EasingFnShape = (t: number) => number;

interface SpringConfigShape {
  /** Default: 170. */
  readonly stiffness?: number;
  /** Default: 26. */
  readonly damping?: number;
  /** Default: 1. */
  readonly mass?: number;
}

interface EasingFns {
  readonly linear: EasingFnShape;
  readonly easeInCubic: EasingFnShape;
  readonly easeOutCubic: EasingFnShape;
  readonly easeInOutCubic: EasingFnShape;
  readonly easeOutExpo: EasingFnShape;
  readonly easeOutBack: EasingFnShape;
  readonly easeOutElastic: EasingFnShape;
  readonly easeOutBounce: EasingFnShape;
  readonly ease: EasingFnShape;
  readonly easeIn: EasingFnShape;
  readonly easeOut: EasingFnShape;
  readonly easeInOut: EasingFnShape;
  spring(config: SpringConfigShape): EasingFnShape;
  cubicBezier(x1: number, y1: number, x2: number, y2: number): EasingFnShape;
  easingToLinearCSS(fn: EasingFnShape, sampleCount?: number): string;
  springToLinearCSS(config: SpringConfigShape, sampleCount?: number): string;
  springNaturalDuration(config: SpringConfigShape, epsilon?: number): number;
}

/**
 * Linear easing -- no acceleration, constant rate of change.
 *
 * @example
 * ```ts
 * Easing.linear(0.5); // 0.5
 * ```
 */
const linear: EasingFnShape = (t) => t;

/**
 * Cubic ease-in -- starts slow, accelerates.
 *
 * @example
 * ```ts
 * Easing.easeInCubic(0.5); // 0.125
 * ```
 */
const easeInCubic: EasingFnShape = (t) => t * t * t;

/**
 * Cubic ease-out -- starts fast, decelerates.
 *
 * @example
 * ```ts
 * Easing.easeOutCubic(0.5); // 0.875
 * ```
 */
const easeOutCubic: EasingFnShape = (t) => {
  const u = 1 - t;
  return 1 - u * u * u;
};

/**
 * Cubic ease-in-out -- slow start and end, fast middle.
 *
 * @example
 * ```ts
 * Easing.easeInOutCubic(0.25); // 0.0625
 * Easing.easeInOutCubic(0.75); // 0.9375
 * ```
 */
const easeInOutCubic: EasingFnShape = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Exponential ease-out -- very fast deceleration.
 *
 * @example
 * ```ts
 * Easing.easeOutExpo(0.5); // ~0.969
 * ```
 */
const easeOutExpo: EasingFnShape = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * Ease-out with overshoot -- overshoots target, then settles.
 *
 * @example
 * ```ts
 * Easing.easeOutBack(0.8); // ~1.037 (overshoots past 1.0)
 * Easing.easeOutBack(1.0); // 1.0
 * ```
 */
const easeOutBack: EasingFnShape = (t) => {
  /** Penner's back easing overshoot coefficient — controls how far the animation overshoots before settling. */
  const BACK_OVERSHOOT = 1.70158;
  const c3 = BACK_OVERSHOOT + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + BACK_OVERSHOOT * Math.pow(t - 1, 2);
};

/**
 * Elastic ease-out -- spring-like oscillation that settles at 1.
 *
 * @example
 * ```ts
 * Easing.easeOutElastic(0.5); // ~1.015 (oscillates around target)
 * Easing.easeOutElastic(1.0); // 1.0
 * ```
 */
const easeOutElastic: EasingFnShape = (t) => {
  if (t === 0 || t === 1) return t;
  /** One-third rotation for elastic oscillation — produces ~3 bounces in elastic easing. */
  const ELASTIC_PERIOD = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ELASTIC_PERIOD) + 1;
};

/**
 * Bounce ease-out -- simulates a bouncing ball settling at target.
 *
 * @example
 * ```ts
 * Easing.easeOutBounce(0.5);  // 0.765625
 * Easing.easeOutBounce(1.0);  // 1.0
 * ```
 */
const easeOutBounce: EasingFnShape = (t) => {
  /** Penner bounce easing coefficients — BOUNCE_AMPLITUDE controls peak height, BOUNCE_DIVISOR controls number of bounces. */
  const BOUNCE_AMPLITUDE = 7.5625;
  const BOUNCE_DIVISOR = 2.75;
  if (t < 1 / BOUNCE_DIVISOR) return BOUNCE_AMPLITUDE * t * t;
  if (t < 2 / BOUNCE_DIVISOR) {
    const u = t - 1.5 / BOUNCE_DIVISOR;
    return BOUNCE_AMPLITUDE * u * u + 0.75;
  }
  if (t < 2.5 / BOUNCE_DIVISOR) {
    const u = t - 2.25 / BOUNCE_DIVISOR;
    return BOUNCE_AMPLITUDE * u * u + 0.9375;
  }
  const u = t - 2.625 / BOUNCE_DIVISOR;
  return BOUNCE_AMPLITUDE * u * u + 0.984375;
};

/**
 * Creates a CSS cubic-bezier easing function from four control points.
 * Uses binary search to approximate the bezier curve evaluation.
 *
 * @example
 * ```ts
 * const customEase = Easing.cubicBezier(0.42, 0, 0.58, 1);
 * customEase(0.5); // ~0.5 (equivalent to CSS ease-in-out)
 * customEase(0.0); // 0.0
 * customEase(1.0); // 1.0
 * ```
 */
function cubicBezier(x1: number, y1: number, x2: number, y2: number): EasingFnShape {
  return (t: number): number => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let lo = 0,
      hi = 1;
    /** Binary search iterations for cubic-bezier — 20 iterations converges to `<0.001` error for any control points. */
    const BEZIER_ITERATIONS = 20;
    for (let i = 0; i < BEZIER_ITERATIONS; i++) {
      const mid = (lo + hi) / 2;
      const x = 3 * (1 - mid) * (1 - mid) * mid * x1 + 3 * (1 - mid) * mid * mid * x2 + mid * mid * mid;
      if (x < t) lo = mid;
      else hi = mid;
    }
    const u = (lo + hi) / 2;
    return 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u;
  };
}

const ease = cubicBezier(0.25, 0.1, 0.25, 1.0);
const easeIn = cubicBezier(0.42, 0, 1, 1);
const easeOut = cubicBezier(0, 0, 0.58, 1);
const easeInOut = cubicBezier(0.42, 0, 0.58, 1);

/**
 * Evaluate raw spring physics at time `t` (in the spring's natural time domain,
 * not normalized). Used internally by both `spring` and `springNaturalDuration`
 * to avoid circular dependency.
 */
function springRaw(t: number, omega: number, zeta: number): number {
  if (zeta < 1) {
    // Underdamped
    const omegaD = omega * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * omega * t) * (Math.cos(omegaD * t) + ((zeta * omega) / omegaD) * Math.sin(omegaD * t));
  }
  if (zeta === 1) {
    // Critically damped
    return 1 - (1 + omega * t) * Math.exp(-omega * t);
  }
  // Overdamped (zeta > 1)
  const s = Math.sqrt(zeta * zeta - 1);
  const r1 = -omega * (zeta + s);
  const r2 = -omega * (zeta - s);
  const c1 = r2 / (r2 - r1);
  const c2 = -r1 / (r2 - r1);
  return 1 - (c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t));
}

/**
 * Find the natural settling duration of a spring (in the spring's own time domain).
 * Returns the smallest `t` where `|springRaw(t')|` is within epsilon of 1 for all `t' >= t`.
 * Scans backward at 0.5ms resolution up to 2 seconds.
 *
 * @example
 * ```ts
 * const duration = Easing.springNaturalDuration({ stiffness: 200, damping: 15 });
 * // duration is ~0.4 (seconds in spring time domain)
 * ```
 */
function _resolveSpringConfig(config: SpringConfigShape): { stiffness: number; damping: number; mass: number } {
  const stiffness = config.stiffness ?? SPRING_DEFAULT_STIFFNESS;
  const damping = config.damping ?? SPRING_DEFAULT_DAMPING;
  const mass = config.mass ?? 1;
  if (stiffness <= 0 || !Number.isFinite(stiffness)) {
    throw ValidationError('Easing.spring', `stiffness must be a positive finite number, got ${stiffness}`);
  }
  if (damping < 0 || !Number.isFinite(damping)) {
    throw ValidationError('Easing.spring', `damping must be a non-negative finite number, got ${damping}`);
  }
  if (mass <= 0 || !Number.isFinite(mass)) {
    throw ValidationError('Easing.spring', `mass must be a positive finite number, got ${mass}`);
  }
  return { stiffness, damping, mass };
}

function springNaturalDuration(config: SpringConfigShape, epsilon = 0.001): number {
  const { stiffness, damping, mass } = _resolveSpringConfig(config);
  const omega = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  // Scan steps (at 1ms resolution) to find spring settling point
  const steps = EASING_SPRING_STEPS;
  for (let ms = steps; ms > 0; ms--) {
    const t = ms / steps;
    if (Math.abs(springRaw(t, omega, zeta) - 1) >= epsilon) return t + 0.025;
  }
  // Fallback 300ms duration if spring never settles within scan window
  return 0.3;
}

/**
 * Creates a physics-based spring easing function.
 * Maps t in [0,1] through a damped spring simulation.
 *
 * Omitted config fields fall back to engine defaults
 * (stiffness 170, damping 26, mass 1) — `Easing.spring({})` just works.
 *
 * @example
 * ```ts
 * const bounce = Easing.spring({ stiffness: 200, damping: 10 });
 * bounce(0.0);  // 0.0
 * bounce(0.5);  // overshoots past 1.0 before settling
 * bounce(1.0);  // 1.0
 * ```
 */
function spring(config: SpringConfigShape): EasingFnShape {
  const { stiffness, damping, mass } = _resolveSpringConfig(config);
  const omega = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const naturalDuration = springNaturalDuration(config);

  return (t: number): number => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const scaledT = t * naturalDuration;
    return springRaw(scaledT, omega, zeta);
  };
}

/**
 * Sample ANY easing function at `sampleCount + 1` evenly-spaced stops (both endpoints
 * inclusive) and return a CSS `linear()` timing function string.
 *
 * This is the ONE producer of the point list behind Law 4 (the byte-law): the native
 * CSS path serializes this string while the JS/worker floor lerps the SAME numeric
 * list ({@link sampleRuntimeEasing}'s points arm) — parity by construction, because a
 * single sampler at a single stop set (`i / sampleCount`) feeds both. Every catalog
 * easing (cubic-bezier, bounce, elastic, back, spring) lowers through here, so a
 * browser running native `linear()` and a browser scrubbing the floor read one curve.
 *
 * @example
 * ```ts
 * const css = Easing.easingToLinearCSS(Easing.easeOutBounce, 16);
 * // css is 'linear(0.0000, 0.1200, ..., 1.0000)' with 17 sample points
 * element.style.transitionTimingFunction = css;
 * ```
 */
function easingToLinearCSS(fn: EasingFnShape, sampleCount = 32): string {
  const points: string[] = [];
  for (let i = 0; i <= sampleCount; i++) {
    points.push(fn(i / sampleCount).toFixed(4));
  }
  return `linear(${points.join(', ')})`;
}

/**
 * Sample a spring easing at `sampleCount` evenly-spaced points and
 * return a CSS `linear()` timing function string for off-main-thread animation.
 *
 * Delegates to {@link easingToLinearCSS} over `spring(config)` so the spring path
 * emits a point list byte-identical to the general sampler (Law 4: one kernel).
 *
 * @example
 * ```ts
 * const css = Easing.springToLinearCSS({ stiffness: 200, damping: 15 }, 16);
 * // css is 'linear(0.0000, 0.1234, ..., 1.0000)' with 17 sample points
 * element.style.transitionTimingFunction = css;
 * ```
 */
function springToLinearCSS(config: SpringConfigShape, sampleCount = 32): string {
  return easingToLinearCSS(spring(config), sampleCount);
}

/**
 * Easing -- pure math easing functions mapping t in [0,1] to value in [0,1].
 * Includes standard CSS easings, cubic-bezier, spring physics, and CSS linear() export.
 *
 * @example
 * ```ts
 * const t = 0.5;
 * Easing.easeOutCubic(t);  // 0.875
 * Easing.linear(t);        // 0.5
 * const spring = Easing.spring({ stiffness: 200, damping: 15 });
 * spring(t);               // spring-physics interpolated value
 * const css = Easing.springToLinearCSS({ stiffness: 200, damping: 15 });
 * ```
 */
export const Easing: EasingFns = {
  linear,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
  easeOutExpo,
  easeOutBack,
  easeOutElastic,
  easeOutBounce,
  ease,
  easeIn,
  easeOut,
  easeInOut,
  spring,
  cubicBezier,
  easingToLinearCSS,
  springToLinearCSS,
  springNaturalDuration,
};

export declare namespace Easing {
  /** Signature of an easing function: `(t: [0..1]) => [0..1]`. */
  export type Fn = EasingFnShape;
  /** Spring parameters: stiffness, damping, mass. */
  export type Config = SpringConfigShape;
}

/**
 * The ONE spring config both the CSS `linear()` path and the JS floor default to
 * when a spring easing is authored without explicit parameters. Kept here (not in
 * `@liteship/compiler`) so the native compiler (`resolveEasing`) and the runtime
 * sampler ({@link sampleRuntimeEasing}) read the SAME default — Law 4: one kernel,
 * never forked.
 */
export const DEFAULT_MOTION_SPRING: SpringConfigShape = Object.freeze({ stiffness: 200, damping: 20 });

/**
 * Self-describing easing descriptor carried in the runtime motion plan
 * (`RuntimeWritePlan.easing`) so the JS floor is driver-independent: it reads its
 * own curve rather than being handed one. `kind` mirrors the authoring
 * vocabulary (`'linear' | 'ease' | 'spring'`); `spring` carries the physics
 * config for the spring arm (defaulting to {@link DEFAULT_MOTION_SPRING}).
 */
export interface RuntimeEasing {
  readonly kind: 'linear' | 'ease' | 'spring' | 'points' | 'bounce' | 'elastic' | 'back' | 'cubicBezier';
  readonly spring?: SpringConfigShape;
  /**
   * Serialized sampled point list (Law 4, the byte-law): the IDENTICAL `linear()` stops
   * the native CSS path emits via `Easing.easingToLinearCSS`. When present the floor lerps
   * THIS list piecewise-linearly rather than re-deriving the curve — ONE producer, both
   * floors read it, so a browser scrubbing the JS floor and a browser running native
   * `linear(...)` land on one value at every `t`. Carried by the `'points'` kind and by
   * any widened-catalog kind (`bounce`/`elastic`/`back`/`cubicBezier`) whose curve was
   * serialized. The legacy `linear`/`ease`/`spring` kinds sample analytically (no arm).
   */
  readonly points?: readonly number[];
}

/**
 * The `points` arm of {@link sampleRuntimeEasing}: piecewise-linear interpolation of a
 * serialized `linear()` stop list. Reads the SAME list the native CSS path renders
 * (Law 4) — `x = clamp01(t) · (n)`, floor to the bracketing stop, lerp the fraction — so
 * a browser scrubbing the JS floor and a browser running `linear(...)` land on one
 * identical value at every `t`. The endpoint `t ≥ 1` returns the final stop exactly.
 */
function samplePoints(points: readonly number[]): EasingFnShape {
  const n = points.length - 1;
  return (t: number): number => {
    const x = (t < 0 ? 0 : t > 1 ? 1 : t) * n;
    const i = Math.floor(x);
    if (i >= n) return points[n]!;
    return points[i]! + (points[i + 1]! - points[i]!) * (x - i);
  };
}

/**
 * Build the `(t) => value` sampler for a {@link RuntimeEasing} descriptor.
 *
 * This is the RUNTIME half of the one-kernel law (Law 4): the `spring` arm
 * delegates to `Easing.spring` — the EXACT function `Easing.springToLinearCSS`
 * samples to build the CSS `linear()` timing function — so a browser scrubbing
 * the JS floor and a browser running native CSS `linear()` read one identical
 * curve. `linear`/`ease` map to `Easing.linear` / `Easing.ease`
 * (the latter being `cubic-bezier(0.25, 0.1, 0.25, 1)`, i.e. CSS `ease`).
 */
export function sampleRuntimeEasing(easing: RuntimeEasing): EasingFnShape {
  // A serialized point list (Law 4) is the definitive curve whenever present — the floor
  // lerps EXACTLY what the native `linear()` renders. Widened-catalog kinds always carry
  // it; only the legacy analytic kinds fall through to closed-form sampling below.
  if (easing.points !== undefined && easing.points.length >= 2) {
    return samplePoints(easing.points);
  }
  switch (easing.kind) {
    case 'linear':
      return Easing.linear;
    case 'ease':
      return Easing.ease;
    case 'spring':
      return Easing.spring(easing.spring ?? DEFAULT_MOTION_SPRING);
    case 'bounce':
      return Easing.easeOutBounce;
    case 'elastic':
      return Easing.easeOutElastic;
    case 'back':
      return Easing.easeOutBack;
    case 'points':
    case 'cubicBezier':
      // A `points`/`cubicBezier` descriptor is well-defined ONLY with its serialized stop
      // list (handled above). Absent it, fall back to identity — the upstream guards
      // (`parseMotionProgram` / `interpretTransition`) never emit these kinds without one.
      return Easing.linear;
  }
}
