// PROVES: INV-ADAPTIVE-LOWERING-PURE
// PROVES: INV-ADAPTIVE-CSS-BYTE-EQUAL
// PROVES: INV-ADAPTIVE-TRACE-EQUAL
/**
 * defineAdaptive is a PURE LOWERING — three equivalence laws.
 *
 * `defineAdaptive(spec)` does not reimplement boundary/style/quantizer
 * construction: every member of the returned `Adaptive` IS the output of the
 * sibling constructor applied to the SAME spec field. These property proofs hold
 * it to that thesis over a seeded fast-check space of generated specs, and they
 * are deliberately NON-TAUTOLOGICAL: the "hand-lowered" reference path is
 * computed independently from the SPEC's own config objects
 * (`defineBoundary(spec.boundary)`, `defineStyle({ boundary, ...spec.style })`,
 * `defineQuantizer(boundary, spec.quantize)`), never read back off the adaptive's
 * own members. The two paths are then compared byte-for-byte.
 *
 *  - LOWERING-PURE  — member ids equal, member defs deep-equal, and the quantizer
 *                     member is REFERENTIALLY the memoized `defineQuantizer`
 *                     object (the configCache identity thesis).
 *  - CSS-BYTE-EQUAL — the PUBLIC root `adaptive.plan().css` and the direct
 *                     `StyleCSSCompiler.compileAdaptive(style)` hand path are
 *                     byte-equal (Buffer.compare === 0).
 *  - TRACE-EQUAL    — boundary explanation traces plus live quantizer crossing /
 *                     output receipt sequences are deep-equal under one fixed
 *                     clock and the same width sweep.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { defineBoundary, defineStyle, Boundary, Style, fixedClock } from '@liteship/core';
import { buildTrace, traceDigest, type StepOutcome } from '@liteship/core/simulation';
import { defineQuantizer, createQuantizer } from '@liteship/quantizer';
import { StyleCSSCompiler, CSSCompiler } from '@liteship/compiler';
import { defineAdaptive } from '../../packages/liteship/src/index.js';

// The one seed every assertion in this file runs from — deterministic replay.
const SEED = 0xada9741e;

// ---------------------------------------------------------------------------
// Spec arbitrary — a boundary + style (+ optional quantizer), all keyed off the
// SAME generated state set so style overrides and quantizer outputs are valid.
// ---------------------------------------------------------------------------

const cssProp = fc.constantFrom('font-size', 'color', 'margin', 'padding');
const cssValue = fc.constantFrom('14px', '16px', '18px', '8px', 'red', 'black', 'blue');
const propsArb = fc.dictionary(cssProp, cssValue, { minKeys: 1, maxKeys: 4 });
const shadowArb = fc.record({
  x: fc.integer({ min: -20, max: 20 }),
  y: fc.integer({ min: -20, max: 20 }),
  blur: fc.integer({ min: 0, max: 40 }),
  spread: fc.option(fc.integer({ min: -10, max: 20 }), { nil: undefined }),
  color: fc.constantFrom('#111111', '#336699', 'rgba(0,0,0,0.5)'),
  inset: fc.boolean(),
});

interface GeneratedSpec {
  readonly boundary: {
    readonly input: 'viewport.width';
    readonly at: readonly (readonly [number, string])[];
  };
  readonly style: {
    readonly base: { readonly properties: Record<string, string> };
    readonly states: Record<string, { readonly properties: Record<string, string> }>;
  };
  readonly quantize?: {
    readonly outputs: Record<string, Record<string, unknown>>;
  };
  readonly tier?: 'static' | 'styled' | 'reactive' | 'animated' | 'gpu';
  readonly states: readonly string[];
  readonly thresholds: readonly number[];
}

const specArb: fc.Arbitrary<GeneratedSpec> = fc.integer({ min: 2, max: 6 }).chain((n) => {
  const states = Array.from({ length: n }, (_, i) => `s${i}`);
  return fc
    .record({
      // n strictly-ascending unique thresholds (the defineBoundary contract).
      thresholds: fc
        .uniqueArray(fc.integer({ min: 0, max: 4000 }), { minLength: n, maxLength: n })
        .map((xs) => [...xs].sort((a, b) => a - b)),
      base: propsArb,
      overrideStates: fc.subarray(states),
      // one candidate override table per state index (chosen ones are used).
      overrideProps: fc.array(propsArb, { minLength: n, maxLength: n }),
      outputVals: fc.array(cssValue, { minLength: n, maxLength: n }),
      quantize: fc.boolean(),
      tier: fc.constantFrom<'static' | 'styled' | 'reactive' | 'animated' | 'gpu' | undefined>(
        undefined,
        'static',
        'styled',
        'reactive',
        'animated',
        'gpu',
      ),
    })
    .map((r): GeneratedSpec => {
      const at = r.thresholds.map((t, i) => [t, states[i]!] as const);

      const styleStates: Record<string, { readonly properties: Record<string, string> }> = {};
      for (const s of r.overrideStates) {
        const idx = states.indexOf(s);
        styleStates[s] = { properties: r.overrideProps[idx]! };
      }

      const spec: GeneratedSpec = {
        boundary: { input: 'viewport.width', at },
        style: { base: { properties: r.base }, states: styleStates },
        states,
        thresholds: r.thresholds,
        ...(r.tier !== undefined ? { tier: r.tier } : {}),
      };

      if (r.quantize) {
        const table: Record<string, unknown> = {};
        for (let i = 0; i < states.length; i++) {
          table[states[i]!] = { fontSize: r.outputVals[i]! };
        }
        return { ...spec, quantize: { outputs: { css: table } } };
      }
      return spec;
    });
});

// The concrete spec fed to defineAdaptive/defineStyle/defineQuantizer. The
// generated-metadata fields (states/thresholds) are carried for the reference
// path but are not part of the authored config surface.
type Cfg = Parameters<typeof defineAdaptive>[0];
function toSpec(g: GeneratedSpec): Cfg {
  const base: Record<string, unknown> = { boundary: g.boundary, style: g.style };
  if (g.quantize !== undefined) base['quantize'] = g.quantize;
  if (g.tier !== undefined) base['tier'] = g.tier;
  return base as Cfg;
}

/** Below/at/above every threshold — the sweep that exercises each state edge. */
function sweepWidths(thresholds: readonly number[]): number[] {
  const widths: number[] = [thresholds[0]! - 100];
  for (const t of thresholds) widths.push(t - 1, t, t + 1);
  widths.push(thresholds[thresholds.length - 1]! + 100);
  return widths;
}

/** The style states as the flat CSS state map `CSSCompiler.compile` consumes —
 *  built from the SPEC, independent of any adaptive member. */
function specStateMap(g: GeneratedSpec): Record<string, Record<string, string>> {
  const map: Record<string, Record<string, string>> = {};
  for (const [state, layer] of Object.entries(g.style.states)) {
    map[state] = { ...layer.properties };
  }
  return map;
}

/**
 * The live runtime receipt sequence for one authored quantizer. The fixed wall
 * clock makes HLC crossings replayable; outputChanges includes its initial replay
 * followed by every crossing output, while changes carries the crossing receipts.
 */
function runtimeReceiptTrace(config: Parameters<typeof createQuantizer>[0], widths: readonly number[]) {
  const live = createQuantizer(config, { clock: fixedClock(1_700_000_000_000), node: 'adaptive-proof' });
  const crossings: unknown[] = [];
  const outputs: unknown[] = [];
  const stopCrossings = live.changes.subscribe((crossing) => crossings.push(crossing));
  const stopOutputs = live.outputChanges.subscribe((output) => outputs.push(output));
  const states = widths.map((width) => live.evaluate(width));
  const final = {
    state: live.state.read(),
    outputs: live.currentOutputs.read(),
  };
  stopOutputs();
  stopCrossings();
  void live.dispose();
  return { states, crossings, outputs, final };
}

describe('defineAdaptive is a pure lowering — content-address, CSS-byte, and trace equivalence', () => {
  it('INV-ADAPTIVE-LOWERING-PURE: adaptive members equal the independently hand-lowered constructor outputs (ids, deep-equal, referential quantizer)', () => {
    fc.assert(
      fc.property(specArb, (g) => {
        const a = defineAdaptive(toSpec(g));

        // Hand path — the SAME spec configs, lowered by hand. Non-tautological:
        // hb/hs/hq are built from g.boundary/g.style/g.quantize, NOT from a.*.
        const hb = defineBoundary(g.boundary as Parameters<typeof defineBoundary>[0]);
        const hs = defineStyle({ ...g.style, boundary: hb } as Parameters<typeof defineStyle>[0]);
        const hq =
          g.quantize !== undefined
            ? defineQuantizer(hb, g.quantize as Parameters<typeof defineQuantizer>[1])
            : undefined;

        // Member content addresses agree.
        expect(a.boundary.id).toBe(hb.id);
        expect(a.style.id).toBe(hs.id);
        // Member defs are deep-equal (structural identity, not just the address).
        expect(a.boundary).toEqual(hb);
        expect(a.style).toEqual(hs);

        if (hq !== undefined) {
          expect(a.quantizer?.id).toBe(hq.id);
          // The configCache identity thesis: same content address ⇒ the SAME
          // object instance the memoized defineQuantizer returns.
          expect(a.quantizer).toBe(hq);
        } else {
          expect(a.quantizer).toBeUndefined();
        }
      }),
      { numRuns: 200, seed: SEED },
    );
  });

  it('INV-ADAPTIVE-CSS-BYTE-EQUAL: the public adaptive plan CSS is byte-identical to the hand-lowered compiler output', () => {
    fc.assert(
      fc.property(specArb, (g) => {
        const a = defineAdaptive(toSpec(g));
        const hb = defineBoundary(g.boundary as Parameters<typeof defineBoundary>[0]);
        const hs = defineStyle({ ...g.style, boundary: hb } as Parameters<typeof defineStyle>[0]);

        // Adaptive state-marker CSS: byte-identical between the public plan and
        // the independently hand-lowered style passed to the compiler owner.
        const aLayers = Buffer.from(a.plan().css, 'utf8');
        const hLayers = Buffer.from(StyleCSSCompiler.compileAdaptive(hs), 'utf8');
        expect(Buffer.compare(aLayers, hLayers)).toBe(0);

        // The @container raw path off the boundary member — compiled against the
        // SAME spec-derived state map, so byte-equality isolates the boundary.
        const stateMap = specStateMap(g);
        const aRaw = Buffer.from(CSSCompiler.compile(a.boundary, stateMap).raw, 'utf8');
        const hRaw = Buffer.from(CSSCompiler.compile(hb, stateMap).raw, 'utf8');
        expect(Buffer.compare(aRaw, hRaw)).toBe(0);
      }),
      { numRuns: 200, seed: SEED },
    );
  });

  it('INV-ADAPTIVE-CSS-BYTE-EQUAL: state box-shadow output matches Style.tap atomic composition', () => {
    fc.assert(
      fc.property(
        fc.array(shadowArb, { minLength: 1, maxLength: 3 }),
        fc.array(shadowArb, { minLength: 1, maxLength: 3 }),
        (baseShadows, stateShadows) => {
          const boundary = defineBoundary({
            input: 'viewport.width',
            at: [
              [0, 'compact'],
              [800, 'wide'],
            ] as const,
          });
          const style = defineStyle({
            boundary,
            base: { properties: {}, boxShadow: baseShadows },
            states: { wide: { properties: {}, boxShadow: stateShadows } },
          });
          const expected = Style.tap(style, 'wide')['box-shadow'];

          expect(expected).toBeDefined();
          expect(StyleCSSCompiler.compileAdaptive(style)).toContain(`box-shadow: ${expected};`);
        },
      ),
      { numRuns: 100, seed: SEED },
    );
  });

  it('INV-ADAPTIVE-TRACE-EQUAL: public explanations and live crossing/output receipts equal the hand-lowered runtime sweep', () => {
    fc.assert(
      fc.property(specArb, (g) => {
        const a = defineAdaptive(toSpec(g));
        const hb = defineBoundary(g.boundary as Parameters<typeof defineBoundary>[0]);

        const widths = sweepWidths(g.thresholds);

        // Batch state-index selection agrees index-for-index.
        const aBatch = Array.from(Boundary.evaluateBatch(a.boundary, widths));
        const hBatch = Array.from(Boundary.evaluateBatch(hb, widths));
        expect(aBatch).toEqual(hBatch);

        // Content-addressed trace of the rich evaluateResult sweep agrees. Each
        // side builds its own trace from ITS boundary; equal digests prove the
        // two boundaries are the same observable machine (byte-exact replay).
        const sweep = (boundary: typeof a.boundary): StepOutcome[] =>
          widths.map((w, i) => ({ label: `w${i}`, value: Boundary.evaluateResult(boundary, w) }));

        const aDigest = traceDigest(buildTrace(SEED, sweep(a.boundary)));
        const hDigest = traceDigest(buildTrace(SEED, sweep(hb)));
        expect(aDigest).toBe(hDigest);

        // The public facade's richer explanation trace is the same state/value
        // sequence as the hand-lowered boundary path.
        expect(a.plan().attrs).toEqual(a.attrs());
        expect(a.explain(widths[0]!).boundary.id).toBe(hb.id);
        expect(a.explain(widths.at(-1)!).boundary.state).toBe(Boundary.evaluateResult(hb, widths.at(-1)!).state);

        if (a.quantizer !== undefined && g.quantize !== undefined) {
          const hq = defineQuantizer(hb, g.quantize as Parameters<typeof defineQuantizer>[1]);
          const adaptiveTrace = runtimeReceiptTrace(a.quantizer as Parameters<typeof createQuantizer>[0], widths);
          const handTrace = runtimeReceiptTrace(hq as Parameters<typeof createQuantizer>[0], widths);
          expect(adaptiveTrace).toEqual(handTrace);
        }
      }),
      { numRuns: 200, seed: SEED },
    );
  });
});
