/**
 * Determinism win for the command-receipt `timestamp` field.
 *
 * Every command result carries `timestamp: new Date(receiptClock.now()).toISOString()`
 * — routed through the registry's single MODULE-BOUNDARY clock (`receiptClock`,
 * defaulting to @liteship/core's `wallClock`), never a raw argless `new Date()`.
 * The two-clock law ([clock-substrate]) makes the timestamp injectable at that
 * boundary: pin the clock to a fixed epoch and the FULL receipt becomes
 * byte-reproducible run-to-run.
 *
 * This guards the cure that routed the receipt timestamps through the injected
 * clock (the no-nondeterminism finding sweep): it proves the routing actually
 * reads the installed clock, so a divergence back to an ambient `Date.now()`
 * would flip the asserted timestamp and fail here — not just go quiet.
 *
 * The dispatcher's unknown-command path is the exercised site because it emits a
 * real `failed(...)` receipt with no handler indirection, so the assertion pins
 * the source-of-truth routing directly.
 *
 * The clock is installed through the registry's own `_setReceiptClock` seam (an
 * underscore-prefixed testing export, off the public api surface) rather than a
 * module mock — the sanctioned module-boundary injection the two-clock law buys.
 *
 * @module
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fixedClock } from '@liteship/core';
import { CommandRegistry, CommandDispatcher } from '@liteship/command';
import { _setReceiptClock, _resetReceiptClock } from '../../../packages/command/src/registry.js';

// A frozen epoch — the receipt timestamp must equal its ISO form exactly.
const FIXED_EPOCH_MS = 1_716_508_800_000; // 2024-05-24T00:00:00.000Z
const FIXED_ISO = new Date(FIXED_EPOCH_MS).toISOString();

describe('command receipt timestamp is byte-reproducible under a fixed clock', () => {
  beforeEach(() => {
    // Install a frozen clock at the registry's module boundary. Every `ok`/`failed`
    // receipt now stamps this epoch, so the whole receipt is reproducible.
    _setReceiptClock(fixedClock(FIXED_EPOCH_MS));
  });
  afterEach(() => {
    // Restore the real wallClock so the fixed epoch never leaks to another test.
    _resetReceiptClock();
  });

  it('the dispatcher unknown-command receipt stamps the injected epoch, not the ambient wall clock', async () => {
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
