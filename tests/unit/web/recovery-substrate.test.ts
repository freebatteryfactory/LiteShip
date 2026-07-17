// @vitest-environment node
/**
 * Stream-recovery substrate registry (#133-full) — host registration, live
 * receipt buffer, loud duplicate registration, and ATTESTATION-CHECKED record
 * (forged-hash / wrong-subject / malformed frames refused before buffering).
 */
import { describe, expect, test } from 'vitest';
import { StateName, transitionReceipt, type DiscreteStateTransition } from '@czap/core';
import {
  registerStreamRecoverySubstrate,
  getStreamRecoverySubstrate,
  recordStreamPatchReceipt,
} from '../../../packages/web/src/stream/recovery-substrate.js';
import type { StreamRecoverySubstrate } from '../../../packages/web/src/stream/recovery-substrate.js';

const substrate = (): StreamRecoverySubstrate => ({
  graphQueryUrl: '/api/graph',
  mutationClient: { base: () => ({ id: 'czap:base' }) as never, adopt: () => {} },
  cellStore: { register: () => {}, hydrateDiscrete: () => ({}) } as never,
});

const mkTransition = (
  base = 'czap:base',
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
  resultId: 'czap:next' as never,
  kind: 'discrete',
});

/** Mint an ATTESTED { receipt, transition } frame (hash + subject self-consistent). */
const validFrame = async (base = 'czap:base', cell = 'layout') => {
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
      const frame = await validFrame('czap:base', 'layout');
      // Same self-consistent receipt (subject czap:base#layout), but paired with a
      // transition naming a DIFFERENT cell → subject-law mismatch.
      const wrong = { receipt: frame.receipt, transition: mkTransition('czap:base', 'other') };
      expect(await recordStreamPatchReceipt('art-subj', wrong)).toBe(false);
      expect(getStreamRecoverySubstrate('art-subj')!.patchReceiptEntries).toHaveLength(0);
    } finally {
      dispose();
    }
  });

  test('HOSTILE: a payload-swapped frame (receipt for value X, transition with modified next/generation) is refused', async () => {
    const dispose = registerStreamRecoverySubstrate('art-payload', substrate());
    try {
      // The receipt attests next:'tablet', generation:1 for subject czap:base#layout.
      const frame = await validFrame('czap:base', 'layout');
      // SAME self-consistent receipt + SAME subject, but the paired transition carries a
      // DIFFERENT next-state value AND generation. The envelope hash and the subject law
      // still pass — only the payload-law binding (receipt.payload must attest THIS value)
      // catches it, so gap replay can never apply a value the receipt never signed.
      const swapped = { receipt: frame.receipt, transition: mkTransition('czap:base', 'layout', 'desktop', 5) };
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
        await recordStreamPatchReceipt('art-bound', await validFrame(`czap:base-${i}`));
      }
      const entries = getStreamRecoverySubstrate('art-bound')!.patchReceiptEntries;
      expect(entries).toHaveLength(256);
      expect(entries[0]!.transition.base).toBe('czap:base-44');
      expect(entries.at(-1)!.transition.base).toBe('czap:base-299');
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
