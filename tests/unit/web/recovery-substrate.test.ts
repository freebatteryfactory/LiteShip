// @vitest-environment node
/**
 * Stream-recovery substrate registry (#133-full) — host registration, live
 * receipt buffer, loud duplicate registration, malformed-frame refusal.
 */
import { describe, expect, test } from 'vitest';
import {
  registerStreamRecoverySubstrate,
  getStreamRecoverySubstrate,
  recordStreamPatchReceipt,
} from '../../../packages/web/src/stream/recovery-substrate.js';
import type { StreamRecoverySubstrate } from '../../../packages/web/src/stream/recovery-substrate.js';

const substrate = (): StreamRecoverySubstrate => ({
  graphQueryUrl: '/api/graph',
  mutationClient: { base: () => ({ id: 'czap:base' }) as never, adopt: () => {} },
  cellStore: { get: () => undefined, register: () => {}, applyDiscrete: () => {} } as never,
});

const validEntry = (base = 'czap:base') => ({
  receipt: { kind: 'graph-patch' },
  patch: { _tag: 'GraphPatch', _version: 1, base, ops: [], resultId: 'czap:next' },
});

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

describe('recordStreamPatchReceipt', () => {
  test('recorded entries are visible through a PREVIOUSLY-resolved substrate (live buffer)', () => {
    const dispose = registerStreamRecoverySubstrate('art-live', substrate());
    try {
      const resolved = getStreamRecoverySubstrate('art-live')!;
      expect(resolved.patchReceiptEntries).toHaveLength(0);

      const entry = validEntry();
      expect(recordStreamPatchReceipt('art-live', entry)).toBe(true);
      // The SAME reference resolved before the record sees the entry — recovery
      // options bound early still read receipts that arrive later.
      expect(resolved.patchReceiptEntries).toHaveLength(1);
      expect(resolved.patchReceiptEntries[0]).toEqual(entry);
    } finally {
      dispose();
    }
  });

  test('frames for unregistered artifacts are ignored', () => {
    expect(recordStreamPatchReceipt('nobody-home', validEntry())).toBe(false);
  });

  test('malformed frames are refused (not buffered)', () => {
    const dispose = registerStreamRecoverySubstrate('art-bad', substrate());
    try {
      expect(recordStreamPatchReceipt('art-bad', null)).toBe(false);
      expect(recordStreamPatchReceipt('art-bad', 'string-frame')).toBe(false);
      expect(recordStreamPatchReceipt('art-bad', { receipt: { kind: 'graph-patch' } })).toBe(false);
      expect(recordStreamPatchReceipt('art-bad', { receipt: {}, patch: validEntry().patch })).toBe(false);
      expect(getStreamRecoverySubstrate('art-bad')!.patchReceiptEntries).toHaveLength(0);
    } finally {
      dispose();
    }
  });

  test('buffer is bounded — oldest entries drop first', () => {
    const dispose = registerStreamRecoverySubstrate('art-bound', substrate());
    try {
      for (let i = 0; i < 300; i++) {
        recordStreamPatchReceipt('art-bound', validEntry(`czap:base-${i}`));
      }
      const entries = getStreamRecoverySubstrate('art-bound')!.patchReceiptEntries;
      expect(entries).toHaveLength(256);
      expect((entries[0]!.patch as { base: string }).base).toBe('czap:base-44');
      expect((entries.at(-1)!.patch as { base: string }).base).toBe('czap:base-299');
    } finally {
      dispose();
    }
  });
});
