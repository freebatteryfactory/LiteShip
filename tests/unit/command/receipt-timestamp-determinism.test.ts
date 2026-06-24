/**
 * Determinism win for the command-receipt `timestamp` field.
 *
 * Every command result carries `timestamp: new Date(wallClock.now()).toISOString()`
 * — routed through @czap/core's single sanctioned EPOCH boundary (`wallClock`),
 * never a raw argless `new Date()`. The two-clock law ([clock-substrate]) makes
 * the timestamp injectable at the module boundary: pin `wallClock.now()` to a
 * fixed epoch and the FULL receipt becomes byte-reproducible run-to-run.
 *
 * This guards the cure that routed the receipt timestamps through `wallClock`
 * (the no-nondeterminism finding sweep): it proves the routing actually reads
 * the injected clock, so a divergence back to an ambient `Date.now()` would
 * flip the asserted timestamp and fail here — not just go quiet.
 *
 * The dispatcher's unknown-command path is the exercised site because it emits a
 * real `new Date(wallClock.now()).toISOString()` with no handler indirection, so
 * the assertion pins the source-of-truth routing directly.
 *
 * @module
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type * as CzapCore from '@czap/core';

// A frozen epoch — the receipt timestamp must equal its ISO form exactly.
const FIXED_EPOCH_MS = 1_716_508_800_000; // 2024-05-24T00:00:00.000Z
const FIXED_ISO = new Date(FIXED_EPOCH_MS).toISOString();

// Stub ONLY `wallClock` on @czap/core; every other export passes through, so the
// dispatcher, registry, and result types behave exactly as in production. This
// is the module-boundary injection the two-clock law buys (timestamps route
// through the wallClock export, not a per-call `context.clock`, by design).
vi.mock('@czap/core', async (importOriginal) => {
  const actual = await importOriginal<typeof CzapCore>();
  return { ...actual, wallClock: { now: (): number => FIXED_EPOCH_MS } };
});

describe('command receipt timestamp is byte-reproducible under a fixed wallClock', () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('the dispatcher unknown-command receipt stamps the injected epoch, not the ambient wall clock', async () => {
    const { CommandRegistry, CommandDispatcher } = await import('@czap/command');
    const dispatcher = CommandDispatcher.make(CommandRegistry.make([]));

    const first = await dispatcher.dispatch({ name: 'no.such.command', args: {} }, {});
    const second = await dispatcher.dispatch({ name: 'no.such.command', args: {} }, {});

    // Reproducible: two independent dispatches under the fixed clock stamp the
    // SAME timestamp — the win an ambient `new Date()` could never give.
    expect(first.timestamp).toBe(FIXED_ISO);
    expect(second.timestamp).toBe(first.timestamp);
    // And it is a well-formed ISO instant (the receipt-shape contract holds).
    expect(first.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(first.status).toBe('failed');
  });
});
