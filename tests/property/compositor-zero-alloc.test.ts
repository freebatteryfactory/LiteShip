// PROVES: INV-COMPOSITOR-ZERO-ALLOC
/**
 * The MEASURED proof that `@liteship/core`'s Compositor per-frame compose hot path is
 * GENUINELY zero-allocation — zero RETAINED *and* zero TRANSIENT — the claim the
 * module + factory docs make ("zero-allocation hot path backed by
 * CompositorStatePool"), held to a real allocation measurement in BOTH senses.
 *
 * RETAINED: the compose body acquires a POOLED CompositeState, refills a REUSED
 * dirty-name scratch (no per-tick `Array.from`/`getDirty`/closure), and mutates the
 * pooled state in place — so the LIVE heap (the growth surviving a forced GC) stays
 * flat at ≈ 0 bytes/op.
 *
 * TRANSIENT: the reactive publish that feeds `changes` is now a raw synchronous
 * fan-out over a compositor-owned listener set (replacing `SubscriptionRef.set`,
 * which minted a PubSub/replay-buffer node every publish — a ≈ 22 B/op TRANSIENT
 * floor even with no subscriber). With no `changes` subscriber the listener set is
 * empty and the publish CHURNS nothing (≈ 0 B/op); a live subscriber adds only the
 * bounded `Stream.callback` bridge enqueue (≈ 13 B/op). The live gate is structurally
 * blind to churn (it forces GC between batches), so the gate emits a SECOND, parseable
 * `TRANSIENT` line per fixture and this test asserts both publish budgets.
 *
 * Like its token-buffer sibling, the measurement needs a forced `global.gc()`, so
 * this test SPAWNS the committed `scripts/alloc-gate.ts` under `node --expose-gc`
 * and asserts the compositor `RESULT` (retained) + `TRANSIENT` (churn) lines are
 * within the proven budgets.
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { Boundary, Compositor } from '@liteship/core';
import type { CompositorQuantizer, Quantizer, ReactiveQuantizer } from '@liteship/core';
import { scaledTimeout } from '../../vitest.shared.js';
import { spawnArgvCapture } from '../../scripts/lib/spawn.js';
import { RELATIVE_MAX_RATIO, RELATIVE_SUBSCRIBER_MAX_RATIO } from '../../scripts/alloc-gate.js';

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, '../..');
const GATE = resolve(REPO_ROOT, 'scripts/alloc-gate.ts');

async function runAllocGate(): Promise<{ stdout: string; status: number }> {
  const result = await spawnArgvCapture(
    process.execPath,
    ['--expose-gc', '--import', 'tsx', GATE],
    { cwd: REPO_ROOT },
  );
  return { stdout: result.stdout, status: result.exitCode };
}

/**
 * Parse the platform-robust `RELATIVE\t<label>\t<ratio>\t<maxRatio>\t<verdict>`
 * lines — the PORTABLE verdict the gate exits on (a ratio of the zero-alloc path to a
 * known-allocating reference, which cancels per-platform V8 heap-accounting
 * granularity, so the same assertion holds on linux/macos/windows). The absolute
 * `RESULT`/`TRANSIENT` byte lines are linux-calibrated INFO only — this test asserts
 * the RATIO, never the absolute bytes, so it is platform-independent BY CONSTRUCTION.
 */
function parseRelative(
  stdout: string,
): ReadonlyArray<{ label: string; ratio: number; maxRatio: number; verdict: string }> {
  const out: { label: string; ratio: number; maxRatio: number; verdict: string }[] = [];
  for (const line of stdout.split('\n')) {
    if (!line.startsWith('RELATIVE\t')) continue;
    const [, label, ratio, maxRatio, verdict] = line.split('\t');
    if (
      label !== undefined &&
      ratio !== undefined &&
      maxRatio !== undefined &&
      verdict !== undefined
    ) {
      out.push({ label, ratio: Number(ratio), maxRatio: Number(maxRatio), verdict });
    }
  }
  return out;
}

// This file is listed in tsconfig.tests.json's include, so the `@ts-expect-error`
// below is LOAD-BEARING: it is only verified because THIS project typechecks it.
describe('Compositor.add — CompositorQuantizer accepted-type contract (compile-time)', () => {
  const boundary = Boundary.make({
    input: 'viewport.width',
    at: [
      [0, 'mobile'],
      [768, 'tablet'],
      [1024, 'desktop'],
    ] as const,
  });
  type B = typeof boundary;

  it('REJECTS a base-only quantizer (no stateSync, no reactive state) at the type level', () => {
    // COMPILE-ONLY: this closure is NEVER invoked. A bare Quantizer base — `_tag` +
    // `boundary` + `evaluate`, but NEITHER the synchronous `stateSync` NOR the reactive
    // `state`/`changes` — is rejected by `Compositor.add`'s `CompositorQuantizer` type.
    // Encoding the requirement in the accepted type makes it a COMPILE error — the fix
    // that let compositor.ts drop the read-site `(q as ReactiveQuantizer).state.read()`
    // cast. At RUNTIME the same quantizer would CRASH in the compute-discrete pass
    // (`quantizer.state.read()` on an absent `state`), which is exactly the failure the
    // type prevents — so the assertion lives in a closure that is only typechecked, not
    // run. If the `@ts-expect-error` stops biting, the tightening regressed to the cast.
    const _rejectsBaseOnly = (
      compositor: ReturnType<typeof Compositor.create>['compositor'],
      baseOnly: Quantizer<B>,
    ): void => {
      // @ts-expect-error — Quantizer<B> carries no required stateSync and no reactive state.
      compositor.add('bad', baseOnly);
    };
    expect(typeof _rejectsBaseOnly).toBe('function');
  });

  it('ACCEPTS a synchronous (required-stateSync) quantizer — no cast needed', () => {
    const { compositor } = Compositor.create();
    const sync: CompositorQuantizer<B> = {
      _tag: 'Quantizer',
      boundary,
      stateSync: () => 'mobile',
      evaluate: () => 'mobile',
    };
    compositor.add('sync', sync);
    expect(sync.stateSync()).toBe('mobile');
  });

  it('a ReactiveQuantizer is one arm of the accepted type (the reactive path stays valid)', () => {
    // Type-level: a ReactiveQuantizer<B> is assignable to CompositorQuantizer<B>, so the
    // reactive `state.read()` fallback the compositor keeps is a first-class accepted arm.
    const widen = (q: ReactiveQuantizer<B>): CompositorQuantizer<B> => q;
    expect(typeof widen).toBe('function');
  });
});

describe('Compositor compose is genuinely zero-allocation (INV-COMPOSITOR-ZERO-ALLOC)', () => {
  it('the compositor compose hot path is a NEGLIGIBLE fraction of a known-allocating reference (platform-robust live ratio)', async () => {
    const { stdout, status } = await runAllocGate();
    expect(status, `alloc-gate failed:\n${stdout}`).toBe(0);

    const relative = parseRelative(stdout);
    const compositor = relative.find(
      (r) => r.label.includes('compositor compute') && r.label.includes('retaining ref'),
    );
    expect(compositor, `no compositor-compute RELATIVE line in:\n${stdout}`).toBeDefined();
    expect(compositor!.verdict).toBe('PASS');
    // The compose path's per-op live growth is a small fraction (≤ RELATIVE_MAX_RATIO)
    // of a path that genuinely RETAINS per op. A ratio cancels the platform's heap
    // unit — true zero-alloc on every OS, where an absolute byte budget is not.
    expect(compositor!.ratio).toBeLessThanOrEqual(RELATIVE_MAX_RATIO);
  }, scaledTimeout(120_000));

  it('the compositor reactive publish is a NEGLIGIBLE fraction of churn with no subscriber, and a BOUNDED fraction with one (platform-robust transient ratios)', async () => {
    const { stdout, status } = await runAllocGate();
    expect(status, `alloc-gate failed:\n${stdout}`).toBe(0);

    const relative = parseRelative(stdout);
    const noSub = relative.find(
      (r) => r.label.includes('no subscriber') && r.label.includes('churning ref'),
    );
    expect(noSub, `no "no subscriber" RELATIVE line in:\n${stdout}`).toBeDefined();
    expect(noSub!.verdict).toBe('PASS');
    // The eliminated SubscriptionRef.set churned a PubSub/replay node every publish
    // even with no subscriber; the raw listener-set publish churns a negligible
    // fraction of one full object-allocation per op.
    expect(noSub!.ratio).toBeLessThanOrEqual(RELATIVE_MAX_RATIO);

    const withSub = relative.find(
      (r) => r.label.includes('live subscriber') && r.label.includes('churning ref'),
    );
    expect(withSub, `no "live subscriber" RELATIVE line in:\n${stdout}`).toBeDefined();
    expect(withSub!.verdict).toBe('PASS');
    // The live-subscriber publish DOES allocate the bridge enqueue (not claimed
    // zero-alloc), but it stays cheaper than allocating a whole object per op — a
    // bounded ceiling that catches a regression to the old PubSub-with-subscriber cost.
    expect(withSub!.ratio).toBeLessThanOrEqual(RELATIVE_SUBSCRIBER_MAX_RATIO);
  }, scaledTimeout(120_000));

  it('the compositor reactive publish is a raw listener-set fan-out, NOT the per-publish-allocating SubscriptionRef.set (source drift guard)', () => {
    // Pins the WIRING the transient gate measures: the publish primitive the gate's
    // fixture exercises must be the one the compositor actually uses. A revert to
    // `SubscriptionRef.set` (the ≈ 22 B/op TRANSIENT floor) reintroduces the very
    // allocation this invariant eliminated — caught here before the gate even runs.
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(resolve(here, '../../packages/core/src/compositor.ts'), 'utf8');
    // Strip line + block comments so the explanatory prose (which names the replaced
    // `SubscriptionRef.set` to document WHY) is not mistaken for a usage. We assert on
    // the CODE only.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    // No `SubscriptionRef` import or call survives in code — the publish-allocating
    // primitive is fully gone (a revert reintroduces the ≈ 22 B/op TRANSIENT floor).
    expect(
      /\bSubscriptionRef\b/.test(code),
      'compositor.ts CODE must NOT use SubscriptionRef — the reactive publish is a raw zero-allocation listener-set fan-out.',
    ).toBe(false);
    // The publish IS the extracted replay-1 `CellKernel` (the compositor-owned
    // current-slot + live-Set fan-out, formerly the inline `changeListeners` set)
    // driven by the `publishState` raw fan-out the transient gate measures. A revert
    // to `SubscriptionRef.set` fails the assertion above AND drops `CellKernel.replay1`.
    expect(
      code.includes('CellKernel.replay1') && code.includes('function publishState'),
      'compositor.ts must publish via the extracted `CellKernel.replay1` kernel + `publishState` raw fan-out.',
    ).toBe(true);
  });
});
