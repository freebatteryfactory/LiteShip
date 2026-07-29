// @vitest-environment node
/**
 * Stream-recovery substrate registry (#133-full) — host registration, live
 * receipt buffer, loud duplicate registration, and ATTESTATION-CHECKED record
 * (forged-hash / wrong-subject / malformed frames refused before buffering).
 */
import { describe, expect, test } from 'vitest';
import { HLC, Receipt, StateName, transitionReceipt, type DiscreteStateTransition } from '@liteship/core';
import {
  registerStreamRecoverySubstrate,
  getStreamRecoverySubstrate,
  recordStreamPatchReceipt,
} from '../../../packages/web/src/stream/recovery-substrate.js';
import type { StreamRecoverySubstrate } from '../../../packages/web/src/stream/recovery-substrate.js';

const substrate = (): StreamRecoverySubstrate => ({
  graphQueryUrl: '/api/graph',
  mutationClient: { base: () => ({ id: 'liteship:base' }) as never, adopt: () => {} },
  cellStore: { register: () => {}, hydrateDiscrete: () => ({}) } as never,
});

const mkTransition = (
  base = 'liteship:base',
  cell = 'layout',
  next = 'tablet',
  generation = 1,
): DiscreteStateTransition => ({
  _tag: 'DiscreteStateTransition',
  _version: 1,
  cell,
  next: StateName(next),
  generation,
  authority: 'graph',
  base: base as never,
  resultId: 'liteship:next' as never,
  kind: 'discrete',
});

/** Mint an ATTESTED { receipt, transition } frame (hash + subject self-consistent). */
const validFrame = async (base = 'liteship:base', cell = 'layout') => {
  const transition = mkTransition(base, cell);
  const receipt = await transitionReceipt(transition);
  return { receipt, transition };
};

describe('registerStreamRecoverySubstrate', () => {
  test('register → lookup → dispose round-trip', () => {
    const dispose = registerStreamRecoverySubstrate('art-1', substrate());
    const resolved = getStreamRecoverySubstrate('art-1');
    expect(resolved?.graphQueryUrl).toBe('/api/graph');
    expect(resolved?.patchReceiptEntries).toEqual([]);
    dispose();
    expect(getStreamRecoverySubstrate('art-1')).toBeUndefined();
  });

  test('duplicate registration for a live artifact throws loudly', () => {
    const dispose = registerStreamRecoverySubstrate('art-dup', substrate());
    try {
      expect(() => registerStreamRecoverySubstrate('art-dup', substrate())).toThrow(/already registered/);
    } finally {
      dispose();
    }
  });

  test('disposer is idempotent and does not clobber a NEWER registration', () => {
    const disposeOld = registerStreamRecoverySubstrate('art-swap', substrate());
    disposeOld();
    const disposeNew = registerStreamRecoverySubstrate('art-swap', substrate());
    disposeOld(); // stale disposer — must be a no-op
    expect(getStreamRecoverySubstrate('art-swap')).toBeDefined();
    disposeNew();
  });
});

describe('recordStreamPatchReceipt — attested buffering', () => {
  test('an ATTESTED frame is visible through a PREVIOUSLY-resolved substrate (live buffer)', async () => {
    const dispose = registerStreamRecoverySubstrate('art-live', substrate());
    try {
      const resolved = getStreamRecoverySubstrate('art-live')!;
      expect(resolved.patchReceiptEntries).toHaveLength(0);

      const frame = await validFrame();
      expect(await recordStreamPatchReceipt('art-live', frame)).toBe(true);
      // The SAME reference resolved before the record sees the entry.
      expect(resolved.patchReceiptEntries).toHaveLength(1);
      expect(resolved.patchReceiptEntries[0]!.transition.cell).toBe('layout');
    } finally {
      dispose();
    }
  });

  test('frames for unregistered artifacts are ignored', async () => {
    expect(await recordStreamPatchReceipt('nobody-home', await validFrame())).toBe(false);
  });

  test('HOSTILE: a forged-hash frame is refused at record time (never buffered)', async () => {
    const dispose = registerStreamRecoverySubstrate('art-forged', substrate());
    try {
      const frame = await validFrame();
      const forged = { ...frame, receipt: { ...frame.receipt, hash: `${frame.receipt.hash}00` } };
      expect(await recordStreamPatchReceipt('art-forged', forged)).toBe(false);
      expect(getStreamRecoverySubstrate('art-forged')!.patchReceiptEntries).toHaveLength(0);
    } finally {
      dispose();
    }
  });

  test('HOSTILE: a wrong-subject frame (receipt for cellA, transition for cellB) is refused', async () => {
    const dispose = registerStreamRecoverySubstrate('art-subj', substrate());
    try {
      const frame = await validFrame('liteship:base', 'layout');
      // Same self-consistent receipt (subject liteship:base#layout), but paired with a
      // transition naming a DIFFERENT cell → subject-law mismatch.
      const wrong = { receipt: frame.receipt, transition: mkTransition('liteship:base', 'other') };
      expect(await recordStreamPatchReceipt('art-subj', wrong)).toBe(false);
      expect(getStreamRecoverySubstrate('art-subj')!.patchReceiptEntries).toHaveLength(0);
    } finally {
      dispose();
    }
  });

  test('HOSTILE: a payload-swapped frame (receipt for value X, transition with modified next/generation) is refused', async () => {
    const dispose = registerStreamRecoverySubstrate('art-payload', substrate());
    try {
      // The receipt attests next:'tablet', generation:1 for subject liteship:base#layout.
      const frame = await validFrame('liteship:base', 'layout');
      // SAME self-consistent receipt + SAME subject, but the paired transition carries a
      // DIFFERENT next-state value AND generation. The envelope hash and the subject law
      // still pass — only the payload-law binding (receipt.payload must attest THIS value)
      // catches it, so gap replay can never apply a value the receipt never signed.
      const swapped = { receipt: frame.receipt, transition: mkTransition('liteship:base', 'layout', 'desktop', 5) };
      expect(await recordStreamPatchReceipt('art-payload', swapped)).toBe(false);
      expect(getStreamRecoverySubstrate('art-payload')!.patchReceiptEntries).toHaveLength(0);

      // Sanity: the UNMODIFIED frame the receipt actually attests is still accepted.
      expect(await recordStreamPatchReceipt('art-payload', frame)).toBe(true);
    } finally {
      dispose();
    }
  });

  test('malformed frames are refused (not buffered)', async () => {
    const dispose = registerStreamRecoverySubstrate('art-bad', substrate());
    try {
      expect(await recordStreamPatchReceipt('art-bad', null)).toBe(false);
      expect(await recordStreamPatchReceipt('art-bad', 'string-frame')).toBe(false);
      // receipt-only (no transition)
      expect(await recordStreamPatchReceipt('art-bad', { receipt: { kind: 'discrete-transition' } })).toBe(false);
      // valid receipt shape but transition fails fail-closed decode (wrong kind)
      const frame = await validFrame();
      expect(
        await recordStreamPatchReceipt('art-bad', {
          receipt: frame.receipt,
          transition: { ...frame.transition, kind: 'continuous' },
        }),
      ).toBe(false);
      expect(getStreamRecoverySubstrate('art-bad')!.patchReceiptEntries).toHaveLength(0);
    } finally {
      dispose();
    }
  });

  test('buffer is bounded — oldest entries drop first', async () => {
    const dispose = registerStreamRecoverySubstrate('art-bound', substrate());
    try {
      for (let i = 0; i < 300; i++) {
        await recordStreamPatchReceipt('art-bound', await validFrame(`liteship:base-${i}`));
      }
      const entries = getStreamRecoverySubstrate('art-bound')!.patchReceiptEntries;
      expect(entries).toHaveLength(256);
      expect(entries[0]!.transition.base).toBe('liteship:base-44');
      expect(entries.at(-1)!.transition.base).toBe('liteship:base-299');
    } finally {
      dispose();
    }
  });

  test('reconnect/dispose DURING attestation does not buffer into a stale registration', async () => {
    const dispose = registerStreamRecoverySubstrate('art-race', substrate());
    const frame = await validFrame();
    const pending = recordStreamPatchReceipt('art-race', frame); // async attestation in flight
    dispose(); // dispose synchronously during the attestation gap
    expect(await pending).toBe(false);
    const dispose2 = registerStreamRecoverySubstrate('art-race', substrate());
    expect(getStreamRecoverySubstrate('art-race')!.patchReceiptEntries).toHaveLength(0);
    dispose2();
  });
});

// ── #150 — buffer eviction mints checkpoint-attestation retention ────────────

describe('recordStreamPatchReceipt — eviction retention (#150)', () => {
  const BOUND = 256;

  /** Mint `count` chained, attested frames (previous-linked, HLC-advancing). */
  const chainedFrames = async (count: number) => {
    const frames: Awaited<ReturnType<typeof validFrame>>[] = [];
    let clock = HLC.increment(HLC.create('sub-150'), 1_000);
    let previous: string | undefined;
    for (let index = 0; index < count; index += 1) {
      clock = HLC.increment(clock, clock.wall_ms + 1);
      const transition = mkTransition('liteship:base', 'layout', 'tablet', index + 1);
      const receipt = await transitionReceipt(transition, {
        timestamp: clock,
        ...(previous !== undefined ? { previous } : {}),
      });
      previous = receipt.hash;
      frames.push({ receipt, transition });
    }
    return frames;
  };

  test('overflow evicts the prefix AND retains a validating {base, checkpoint} — live through a prior resolve', async () => {
    const dispose = registerStreamRecoverySubstrate('art-150', substrate());
    try {
      // Resolve BEFORE any eviction: retention must be visible LIVE, not a
      // bind-time snapshot (recovery binds once; evictions keep happening).
      const resolved = getStreamRecoverySubstrate('art-150')!;
      expect(resolved.chainValidation).toBeUndefined();

      const frames = await chainedFrames(BOUND + 2);
      for (const frame of frames) {
        expect(await recordStreamPatchReceipt('art-150', frame)).toBe(true);
      }

      expect(resolved.patchReceiptEntries).toHaveLength(BOUND);
      const retention = resolved.chainValidation;
      expect(retention).toBeDefined();
      // The watermark is the dropped receipt the first retained entry chains to.
      expect(retention!.base).toBe(resolved.patchReceiptEntries[0]!.receipt.previous);
      expect(retention!.checkpoint?.subject.id).toBe(`liteship/checkpoint:${retention!.base}`);

      // END-TO-END: the retained suffix VALIDATES against the retention…
      const retained = resolved.patchReceiptEntries.map((entry) => entry.receipt);
      await expect(Receipt.validateChainDetailed(retained, retention)).resolves.toBe(true);
      // …and refuses WITHOUT it (the pre-#150 not_genesis floor).
      await expect(Receipt.validateChainDetailed(retained)).rejects.toMatchObject({ type: 'not_genesis' });
    } finally {
      dispose();
    }
  });

  test('successive evictions advance the watermark (retention tracks the CURRENT suffix)', async () => {
    const dispose = registerStreamRecoverySubstrate('art-150-adv', substrate());
    try {
      const resolved = getStreamRecoverySubstrate('art-150-adv')!;
      const frames = await chainedFrames(BOUND + 4);
      for (const frame of frames.slice(0, BOUND + 1)) await recordStreamPatchReceipt('art-150-adv', frame);
      const first = resolved.chainValidation!.base;
      for (const frame of frames.slice(BOUND + 1)) await recordStreamPatchReceipt('art-150-adv', frame);
      const second = resolved.chainValidation!.base;
      expect(first).not.toBe(second);
      expect(second).toBe(resolved.patchReceiptEntries[0]!.receipt.previous);
      const retained = resolved.patchReceiptEntries.map((entry) => entry.receipt);
      await expect(Receipt.validateChainDetailed(retained, resolved.chainValidation)).resolves.toBe(true);
    } finally {
      dispose();
    }
  });

  test('an unchainable prefix evicts WITHOUT retention (fail-safe, never fail-wrong)', async () => {
    const dispose = registerStreamRecoverySubstrate('art-150-deg', substrate());
    try {
      // Every frame is genesis-rooted (no previous links): the first retained
      // entry's `previous` names no dropped receipt, so no watermark exists.
      for (let index = 0; index < BOUND + 1; index += 1) {
        await recordStreamPatchReceipt('art-150-deg', await validFrame('liteship:base', `cell-${index}`));
      }
      const resolved = getStreamRecoverySubstrate('art-150-deg')!;
      expect(resolved.patchReceiptEntries).toHaveLength(BOUND);
      expect(resolved.chainValidation).toBeUndefined();
    } finally {
      dispose();
    }
  });
});
