// @vitest-environment jsdom

/**
 * Cross-target motion parity — THE #130 differential oracle.
 *
 * ONE authored motion program renders identically across EVERY target because every
 * non-CSS target samples the ONE shared kernel `sampleProgram` (`@czap/core`, Law 4) and
 * the declarative CSS `@keyframes` are generated from the SAME kernel. This test is the
 * READER that makes each adapter load-bearing (Law 16): for each fixture × canonical
 * sample time it computes the reference vector from `sampleProgram`, then asserts every
 * target adapter yields the same typed values.
 *
 * Targets sampled:
 *   - browser runtime — the REAL `writeContinuousMap` DOM writes, read back off `el.style`;
 *   - scene           — `sampleSceneMotion` (the `MotionSampleSystem` projection);
 *   - stage video leg — `sampleMotionFrames` (per FrameRange index);
 *   - remotion        — `sampleMotionFrame` (per composition frame);
 *   - worker          — `motionSampleMessage` (off-thread sampler → `czap:uniform-update`);
 *   - browser CSS     — reconstructed from the emitted `css.keyframes`.
 *
 * EPSILON + its source (blueprint risk #6): the non-CSS targets all call `sampleProgram`,
 * so they equal the continuous reference to `EPSILON_KERNEL = 1e-9` (float slack only).
 * Browser CSS is DECLARATIVE: its spring is a 32-sample `linear()` approximation, so the
 * CSS leg is reconstructed through the SAME 32-sample `linear()` the compiler emits — NOT
 * the continuous spring, which would flap. It is asserted (a) EXACTLY equal to that
 * 32-sample approximation of the kernel (`EPSILON_KERNEL`), proving the keyframes come from
 * `sampleProgram`; and (b) within `EPSILON_CSS = 2e-3` of the CONTINUOUS kernel. That 2e-3
 * is sourced from the 4-decimal quantization of `Easing.springToLinearCSS` (each `linear()`
 * stop is `.toFixed(4)`, ≤ 5e-5) scaled by the largest fixture leaf delta (24px translateY
 * → ≤ 1.2e-3); spring sample times are grid-aligned to the 32 stops so there is no extra
 * piecewise-linear interpolation error.
 */

import { describe, test, expect, afterEach } from 'vitest';
import {
  sampleProgram,
  sampleProgramUniforms,
  formatTypedValue,
  parseTypedBinding,
  interpolateTyped,
  Easing,
  DEFAULT_MOTION_SPRING,
  type CssMotionPlan,
  type RuntimeEasing,
  type RuntimeWritePlan,
  type TypedValue,
} from '@czap/core';
import { writeContinuousMap } from '../../../packages/astro/src/runtime/write-continuous-map.js';
import { sampleSceneMotion } from '../../../packages/scene/src/systems/motion.js';
import { sampleMotionFrames } from '../../../packages/stage/src/motion-export.js';
import { sampleMotionFrame } from '../../../packages/remotion/src/motion.js';
import { motionSampleMessage } from '../../../packages/worker/src/motion-sample.js';
import { MOTION_PARITY_FIXTURES } from '../../fixtures/motion-parity/programs.js';

const EPSILON_KERNEL = 1e-9;
const EPSILON_CSS = 2e-3;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Assert two typed values are equal in KIND and within `eps` on every numeric field. */
function expectTypedClose(actual: TypedValue | undefined, expected: TypedValue, eps: number, label: string): void {
  expect(actual, `${label}: missing`).toBeDefined();
  const a = actual!;
  expect(a.k, `${label}: kind`).toBe(expected.k);
  if ((a.k === 'number' || a.k === 'opacity') && (expected.k === 'number' || expected.k === 'opacity')) {
    expect(a.v, `${label}: value`).toBeCloseTo(expected.v, -Math.log10(eps));
  } else if (a.k === 'length' && expected.k === 'length') {
    expect(a.unit, `${label}: unit`).toBe(expected.unit);
    expect(a.v, `${label}: value`).toBeCloseTo(expected.v, -Math.log10(eps));
  } else if (a.k === 'angle' && expected.k === 'angle') {
    expect(a.unit).toBe(expected.unit);
    expect(a.v).toBeCloseTo(expected.v, -Math.log10(eps));
  } else if (a.k === 'color' && expected.k === 'color') {
    expect(a.space).toBe(expected.space);
    expected.components.forEach((c, i) => expect(a.components[i]).toBeCloseTo(c, -Math.log10(eps)));
  } else {
    expect(formatTypedValue(a), `${label}`).toBe(formatTypedValue(expected));
  }
}

/** The reference vector: the ONE kernel sampled continuously at `t`, keyed by cssVar. */
function reference(plan: RuntimeWritePlan, t: number): Map<string, TypedValue> {
  return new Map(sampleProgram(plan, t).map((s) => [s.cssVar, s.value]));
}

/** Assert a target's `cssVar → TypedValue` map matches the reference within `eps`. */
function expectMapMatches(
  actual: ReadonlyMap<string, TypedValue>,
  ref: Map<string, TypedValue>,
  eps: number,
  label: string,
): void {
  expect([...actual.keys()].sort(), `${label}: keys`).toEqual([...ref.keys()].sort());
  for (const [cssVar, expected] of ref) {
    expectTypedClose(actual.get(cssVar), expected, eps, `${label}[${cssVar}]`);
  }
}

// -- CSS leg reconstruction -----------------------------------------------------------

/** Parse the emitted `@keyframes` stops back to typed values (property key == cssVar here). */
function parseKeyframes(css: CssMotionPlan): { offset: number; values: Map<string, TypedValue> }[] {
  return [...css.keyframes]
    .sort((a, b) => a.offset - b.offset)
    .map((k) => ({
      offset: k.offset,
      values: new Map(Object.entries(k.properties).map(([prop, str]) => [prop, parseTypedBinding(prop, str)])),
    }));
}

/**
 * The `animation-timing-function` as the BROWSER samples it. For `spring` this is the
 * 32-sample `linear()` the compiler emits — parsed from the SAME `springToLinearCSS`
 * string and piecewise-linear-interpolated (byte-faithful to what the browser renders,
 * `.toFixed(4)` and all). The output may exceed `[0,1]` (spring overshoot), which the
 * browser extrapolates within the keyframe segment. For `linear` it is identity.
 */
function cssTimingFn(easing: RuntimeEasing): (u: number) => number {
  if (easing.kind === 'spring') {
    const css = Easing.springToLinearCSS(easing.spring ?? DEFAULT_MOTION_SPRING, 32);
    const stops = css.slice('linear('.length, -1).split(', ').map(Number);
    return (u) => {
      const x = clamp01(u) * 32;
      const i = Math.floor(x);
      if (i >= 32) return stops[32]!;
      return stops[i]! + (stops[i + 1]! - stops[i]!) * (x - i);
    };
  }
  if (easing.kind === 'linear') return (u) => clamp01(u);
  return Easing.ease;
}

/**
 * The CSS-rendered value at global time `t`. The browser applies `animation-timing-function`
 * PER keyframe SEGMENT: locate the `[lo, hi]` stops bracketing `t`, ease the segment-local
 * progress through the timing function (the eased fraction may overshoot `[0,1]` — the
 * browser extrapolates within the segment, which is the whole point of a spring), and
 * interpolate the stop values by that fraction.
 */
function cssRendered(css: CssMotionPlan, timing: RuntimeEasing, t: number): Map<string, TypedValue> {
  const frames = parseKeyframes(css);
  const timingFn = cssTimingFn(timing);
  const first = frames[0]!;
  const last = frames[frames.length - 1]!;
  const clampedT = t < first.offset ? first.offset : t > last.offset ? last.offset : t;
  let i = 0;
  while (i < frames.length - 1 && frames[i + 1]!.offset < clampedT) i++;
  const lo = frames[i]!;
  const hi = frames[Math.min(i + 1, frames.length - 1)]!;
  const span = hi.offset - lo.offset;
  const local = span <= 0 ? 0 : (clampedT - lo.offset) / span;
  const eased = timingFn(local);
  const out = new Map<string, TypedValue>();
  for (const [prop, a] of lo.values) {
    out.set(prop, interpolateTyped(a, hi.values.get(prop) ?? a, eased));
  }
  return out;
}

/**
 * The kernel sampled through the SAME 32-sample `linear()` approximation the CSS carries
 * — i.e. `sampleProgram` with each window's easing replaced by the timing function. The
 * CSS leg must equal THIS exactly (proving the keyframes come from the kernel); comparing
 * against the CONTINUOUS spring instead would flap (blueprint risk #6).
 */
function kernelThroughCssTiming(plan: RuntimeWritePlan, timing: RuntimeEasing, t: number): Map<string, TypedValue> {
  const timingFn = cssTimingFn(timing);
  const windows =
    plan.windows && plan.windows.length > 0
      ? plan.windows.map((w) => ({ start: w.windowStart, end: w.windowEnd, props: w.properties }))
      : [{ start: 0, end: 1, props: plan.properties }];
  const byVar = new Map<string, TypedValue>();
  for (const w of windows) {
    const span = w.end - w.start;
    const localRaw = span <= 0 ? (t >= w.start ? 1 : 0) : (t - w.start) / span;
    const eased = timingFn(clamp01(localRaw));
    for (const p of w.props) byVar.set(p.cssVar, interpolateTyped(p.from, p.to, eased));
  }
  return byVar;
}

// -- Browser-runtime DOM leg (the real writeContinuousMap) ----------------------------

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const el of hosts.splice(0)) el.remove();
});

function runtimeDomSample(plan: RuntimeWritePlan, t: number, ref: Map<string, TypedValue>): Map<string, TypedValue> {
  const el = document.createElement('div');
  document.body.appendChild(el);
  hosts.push(el);
  writeContinuousMap(el, plan, t);
  const out = new Map<string, TypedValue>();
  for (const cssVar of ref.keys()) {
    out.set(cssVar, parseTypedBinding(cssVar, el.style.getPropertyValue(cssVar)));
  }
  return out;
}

// -- The oracle -----------------------------------------------------------------------

describe('cross-target motion parity — the #130 differential oracle', () => {
  for (const fixture of MOTION_PARITY_FIXTURES) {
    describe(fixture.name, () => {
      for (const t of fixture.sampleTimes) {
        test(`every target equals the sampleProgram reference at t=${t}`, () => {
          const ref = reference(fixture.plan, t);
          expect(ref.size, 'fixture animates at least one leaf').toBeGreaterThan(0);

          // browser runtime — the REAL DOM write path.
          expectMapMatches(runtimeDomSample(fixture.plan, t, ref), ref, EPSILON_KERNEL, 'runtime');

          // scene — the MotionSampleSystem projection.
          expectMapMatches(sampleSceneMotion(fixture.plan, t), ref, EPSILON_KERNEL, 'scene');

          // worker — the off-thread sampler's posted uniforms, parsed back to typed.
          const msg = motionSampleMessage(fixture.plan, t);
          const workerTyped = new Map([...Object.entries(msg.css)].map(([k, v]) => [k, parseTypedBinding(k, v)]));
          expectMapMatches(workerTyped, ref, EPSILON_KERNEL, 'worker');
          // The worker posts the SAME uniform payload the browser floor writes (Law 4).
          expect(msg.css).toEqual(sampleProgramUniforms(fixture.plan, t).css);

          // browser CSS — reconstructed from the emitted keyframes through the SAME
          // 32-sample linear() approximation the browser renders.
          const cssLeg = cssRendered(fixture.css, fixture.cssTiming, t);
          // (a) exactly equals the kernel sampled through that same approximation → the
          //     keyframes provably come from sampleProgram, and the test never flaps.
          expectMapMatches(
            cssLeg,
            kernelThroughCssTiming(fixture.plan, fixture.cssTiming, t),
            EPSILON_KERNEL,
            'css≈approx',
          );
          // (b) approximates the CONTINUOUS kernel within the documented epsilon.
          for (const [cssVar, expected] of ref) {
            expectTypedClose(cssLeg.get(cssVar), expected, EPSILON_CSS, `css[${cssVar}]`);
          }
        });
      }

      // Stage + remotion sample at FRAME indices; each frame's t is compared to the kernel.
      test('stage + remotion video legs match the reference at every frame index', () => {
        const totalFrames = 9;
        const stageFrames = sampleMotionFrames(fixture.plan, totalFrames);
        expect(stageFrames).toHaveLength(totalFrames);
        for (const frame of stageFrames) {
          const ref = reference(fixture.plan, frame.t);
          expectMapMatches(frame.values, ref, EPSILON_KERNEL, `stage@${frame.frame}`);
          expectMapMatches(
            sampleMotionFrame(fixture.plan, frame.frame, totalFrames),
            ref,
            EPSILON_KERNEL,
            `remotion@${frame.frame}`,
          );
        }
      });
    });
  }

  test('reduced-motion: every target settles to the identical terminal pose at t=1', () => {
    const fixture = MOTION_PARITY_FIXTURES.find((f) => f.reducedMotion)!;
    const terminal = reference(fixture.plan, 1);
    // The reference terminal pose IS the authored `to` of every animated leaf.
    for (const [cssVar, expectedStr] of Object.entries(fixture.terminalPose)) {
      expectTypedClose(
        terminal.get(cssVar),
        parseTypedBinding(cssVar, expectedStr),
        EPSILON_KERNEL,
        `terminal[${cssVar}]`,
      );
    }
    // Every target lands on that pose (settle skips the tween → the t=1 endpoint).
    expectMapMatches(runtimeDomSample(fixture.plan, 1, terminal), terminal, EPSILON_KERNEL, 'runtime-settle');
    expectMapMatches(sampleSceneMotion(fixture.plan, 1), terminal, EPSILON_KERNEL, 'scene-settle');
    expectMapMatches(sampleMotionFrame(fixture.plan, 8, 9), terminal, EPSILON_KERNEL, 'remotion-settle');
    const stageLast = sampleMotionFrames(fixture.plan, 9).at(-1)!;
    expectMapMatches(stageLast.values, terminal, EPSILON_KERNEL, 'stage-settle');
    const workerSettle = new Map(
      [...Object.entries(motionSampleMessage(fixture.plan, 1).css)].map(([k, v]) => [k, parseTypedBinding(k, v)]),
    );
    expectMapMatches(workerSettle, terminal, EPSILON_KERNEL, 'worker-settle');
    expectMapMatches(cssRendered(fixture.css, fixture.cssTiming, 1), terminal, EPSILON_CSS, 'css-settle');
  });
});
