/**
 * CUT B2 — timestamp semantics are classified, not conflated.
 *
 * Two clocks must never hide behind one word: the causal HLC (ordered, hashed,
 * chain-validated) and the volatile WallClockTimestamp (ISO string, excluded from
 * identity). These tests prove the contract holds: resultId ignores the wall
 * clock, the two are structurally distinct, identity-adjacent result types name
 * the volatile clock via the alias, and the public field name is unchanged.
 *
 * @module
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { HLC, type WallClockTimestamp } from '@liteship/core';
import { dispatchToolCall } from '../../../packages/mcp-server/src/dispatch.js';

const REPO = resolve(import.meta.dirname, '..', '..', '..');
const RECEIPT_KEY = 'liteship/result';

afterEach(() => {
  vi.useRealTimers();
});

describe('B2 — resultId excludes the volatile wall-clock timestamp', () => {
  it('two dispatches at DIFFERENT wall-clock times share a resultId but differ in timestamp', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });

    vi.setSystemTime(new Date('2020-01-01T00:00:00.000Z'));
    const a = await dispatchToolCall({ name: 'glossary', arguments: { term: 'boundary' } });
    vi.setSystemTime(new Date('2026-06-15T12:34:56.000Z'));
    const b = await dispatchToolCall({ name: 'glossary', arguments: { term: 'boundary' } });

    const ra = a._meta?.[RECEIPT_KEY] as { resultId: string; timestamp: string };
    const rb = b._meta?.[RECEIPT_KEY] as { resultId: string; timestamp: string };

    expect(ra.timestamp).not.toBe(rb.timestamp); // the wall clock moved 6 years…
    expect(ra.resultId).toBe(rb.resultId); // …but identity did not.
  });
});

describe('B2 — HLC (causal) and WallClockTimestamp (volatile) are structurally distinct', () => {
  it('HLC is an object with wall_ms; a WallClockTimestamp is a string', () => {
    const causal = HLC.create('node-1');
    expect(typeof causal).toBe('object');
    expect(causal).toHaveProperty('wall_ms');

    const wall: WallClockTimestamp = new Date().toISOString();
    expect(typeof wall).toBe('string');

    expect(typeof causal).not.toBe(typeof wall); // not interchangeable
  });
});

describe('B2 — classification guard: result types name their clock', () => {
  it('_spine command-result timestamps use WallClockTimestamp, never a bare `timestamp: string`', () => {
    const src = readFileSync(resolve(REPO, 'packages/_spine/command.d.ts'), 'utf8');
    expect(src).toMatch(/type WallClockTimestamp = string/); // the alias is declared
    expect(src).toMatch(/timestamp:\s*WallClockTimestamp/); // volatile fields use it
    expect(src).not.toMatch(/timestamp:\s*string/); // …and no bare string slipped back in
  });

  it('the causal ReceiptEnvelope timestamp stays an HLC (not retyped to a string)', () => {
    const src = readFileSync(resolve(REPO, 'packages/core/src/evidence/receipt.ts'), 'utf8');
    expect(src).toMatch(/readonly timestamp:\s*HLC/);
  });

  it('the public FIELD name remains `timestamp` (the alias retypes, it does not rename)', async () => {
    const r = await dispatchToolCall({ name: 'glossary', arguments: { term: 'boundary' } });
    const receipt = r._meta?.[RECEIPT_KEY] as Record<string, unknown>;
    expect(receipt).toHaveProperty('timestamp');
    expect(typeof receipt.timestamp).toBe('string');
  });
});
