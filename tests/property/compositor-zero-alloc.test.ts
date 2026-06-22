// PROVES: INV-COMPOSITOR-ZERO-ALLOC
/**
 * The MEASURED proof that `@czap/core`'s Compositor per-frame compose hot path is
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
import { scaledTimeout } from '../../vitest.shared.js';
import { spawnArgvCapture } from '../../scripts/lib/spawn.js';
import {
  ALLOC_BUDGET_BYTES_PER_OP,
  TRANSIENT_BUDGET_BYTES_PER_OP,
  TRANSIENT_SUBSCRIBER_BUDGET_BYTES_PER_OP,
} from '../../scripts/alloc-gate.js';

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

/** Parse one line shape (`RESULT` for retained, `TRANSIENT` for churn). */
function parseLines(
  stdout: string,
  tag: 'RESULT' | 'TRANSIENT',
): ReadonlyArray<{ label: string; bytesPerOp: number; verdict: string }> {
  const out: { label: string; bytesPerOp: number; verdict: string }[] = [];
  for (const line of stdout.split('\n')) {
    if (!line.startsWith(`${tag}\t`)) continue;
    const [, label, bytesPerOp, , verdict] = line.split('\t');
    if (label !== undefined && bytesPerOp !== undefined && verdict !== undefined) {
      out.push({ label, bytesPerOp: Number(bytesPerOp), verdict });
    }
  }
  return out;
}

describe('Compositor compose is genuinely zero-allocation (INV-COMPOSITOR-ZERO-ALLOC)', () => {
  it('the allocation gate reports the compositor compose hot path at ≈ 0 live bytes/op (within budget)', async () => {
    const { stdout, status } = await runAllocGate();
    expect(status, `alloc-gate failed:\n${stdout}`).toBe(0);

    const results = parseLines(stdout, 'RESULT');
    const compositor = results.find((r) => r.label.includes('compositor'));
    expect(compositor, `no compositor RESULT line in:\n${stdout}`).toBeDefined();
    expect(compositor!.verdict).toBe('PASS');
    expect(compositor!.bytesPerOp).toBeLessThanOrEqual(ALLOC_BUDGET_BYTES_PER_OP);
  }, scaledTimeout(90_000));

  it('the allocation gate reports the compositor reactive publish at ≈ 0 transient bytes/op (no subscriber) and ≤ the bounded subscriber budget', async () => {
    const { stdout, status } = await runAllocGate();
    expect(status, `alloc-gate failed:\n${stdout}`).toBe(0);

    const transient = parseLines(stdout, 'TRANSIENT');
    const noSub = transient.find((r) => r.label.includes('no subscriber'));
    expect(noSub, `no "no subscriber" TRANSIENT line in:\n${stdout}`).toBeDefined();
    expect(noSub!.verdict).toBe('PASS');
    // The eliminated SubscriptionRef.set churned ≈ 22 B/op here even with no
    // subscriber; the raw listener-set publish churns ≈ 0.
    expect(noSub!.bytesPerOp).toBeLessThanOrEqual(TRANSIENT_BUDGET_BYTES_PER_OP);

    const withSub = transient.find((r) => r.label.includes('live subscriber'));
    expect(withSub, `no "live subscriber" TRANSIENT line in:\n${stdout}`).toBeDefined();
    expect(withSub!.verdict).toBe('PASS');
    expect(withSub!.bytesPerOp).toBeLessThanOrEqual(TRANSIENT_SUBSCRIBER_BUDGET_BYTES_PER_OP);
  }, scaledTimeout(90_000));

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
    // The publish IS the `changeListeners` set + `publishState` raw fan-out the
    // transient gate measures.
    expect(
      code.includes('changeListeners') && code.includes('function publishState'),
      'compositor.ts must publish via the `changeListeners` set + `publishState` raw fan-out.',
    ).toBe(true);
  });
});
