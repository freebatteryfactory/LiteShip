// @vitest-environment jsdom
/**
 * Wave-2 default-widening tests for @czap/web:
 * - SSEConfig.reconnect accepts a partial merged over defaultReconnectConfig
 * - Resumption.saveState defaults timestamp to the injected clock's now() (systemClock by default)
 * - SlotRegistry.register normalizes mode/mounted defaults and is idempotent
 * - SlotRegistry.observe scans pre-existing DOM before watching mutations
 * - Hints.fromElement warns (instead of staying silent) on invalid id-map JSON
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { Effect } from 'effect';
import { Diagnostics, Millis, fixedClock } from '@czap/core';
import { SSE, Resumption, SlotRegistry, SlotAddressing, Hints } from '@czap/web';
import { MockEventSource } from '../../helpers/mock-event-source.js';

let uninstallEventSource: (() => void) | null = null;

beforeEach(() => {
  Diagnostics.reset();
  sessionStorage.clear();
  document.body.innerHTML = '';
});

afterEach(() => {
  uninstallEventSource?.();
  uninstallEventSource = null;
  Diagnostics.reset();
});

// ---------------------------------------------------------------------------
// Item 54: SSEConfig.reconnect partial merge
// ---------------------------------------------------------------------------

describe('SSE.create reconnect defaults', () => {
  test('a partial reconnect override merges over defaultReconnectConfig', async () => {
    uninstallEventSource = MockEventSource.install();

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          // Only one knob supplied; maxAttempts must come from the defaults
          // (10), so the first error schedules a reconnect instead of erroring.
          const client = yield* SSE.create({
            url: '/api/stream',
            reconnect: { initialDelay: Millis(1) },
          });

          MockEventSource.instances.at(-1)!.simulateError();

          const state = yield* client.state;
          expect(state).toBe('reconnecting');
          yield* client.close();
        }),
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// Item 55: Resumption.saveState timestamp default
// ---------------------------------------------------------------------------

describe('Resumption.saveState timestamp default', () => {
  test('omitting timestamp stamps the injected clock and round-trips through loadState', async () => {
    // Inject a fixed clock so the persisted timestamp is deterministic; the
    // production default is systemClock.
    await Effect.runPromise(
      Resumption.saveState({ artifactId: 'doc-1', lastEventId: 'evt-42', lastSequence: 42 }, fixedClock(1_700_000_000)),
    );

    const loaded = await Effect.runPromise(Resumption.loadState('doc-1'));
    expect(loaded).not.toBeNull();
    expect(loaded!.lastEventId).toBe('evt-42');
    expect(loaded!.timestamp).toBe(1_700_000_000);
  });

  test('an explicit timestamp is preserved', async () => {
    await Effect.runPromise(
      Resumption.saveState({ artifactId: 'doc-2', lastEventId: 'evt-1', lastSequence: 1, timestamp: 1234 }),
    );

    const loaded = await Effect.runPromise(Resumption.loadState('doc-2'));
    expect(loaded!.timestamp).toBe(1234);
  });
});

// ---------------------------------------------------------------------------
// Items 56 + 57: SlotRegistry.register defaults / idempotency, observe scans
// ---------------------------------------------------------------------------

describe('SlotRegistry.register defaults', () => {
  test('register normalizes mode to "partial" and mounted to true', () => {
    const registry = SlotRegistry.create();
    const element = document.createElement('div');
    const path = SlotAddressing.parse('/hero');

    registry.register({ path, element });

    const entry = registry.get(path);
    expect(entry).toBeDefined();
    expect(entry!.mode).toBe('partial');
    expect(entry!.mounted).toBe(true);
  });

  test('re-registering the same path+element+mode does not re-dispatch czap:slot-mounted', () => {
    const registry = SlotRegistry.create();
    const element = document.createElement('div');
    document.body.append(element);
    const path = SlotAddressing.parse('/hero');

    let mountedCount = 0;
    document.addEventListener('czap:slot-mounted', () => {
      mountedCount += 1;
    });

    registry.register({ path, element });
    registry.register({ path, element });

    expect(mountedCount).toBe(1);

    // A different element for the same path is a real change and dispatches.
    const replacement = document.createElement('div');
    document.body.append(replacement);
    registry.register({ path, element: replacement });
    expect(mountedCount).toBe(2);
  });
});

describe('SlotRegistry.observe pre-existing DOM scan', () => {
  test('observe registers slots already in the DOM without a separate scanDOM call', async () => {
    const element = document.createElement('div');
    element.setAttribute('data-czap-slot', '/sidebar');
    document.body.append(element);

    const registry = SlotRegistry.create();

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          yield* SlotRegistry.observe(registry, document.body);
          expect(registry.has(SlotAddressing.parse('/sidebar'))).toBe(true);
        }),
      ),
    );
  });

  test('a prior scanDOM + observe sequence does not double-dispatch mounted events', async () => {
    const element = document.createElement('div');
    element.setAttribute('data-czap-slot', '/hero');
    document.body.append(element);

    let mountedCount = 0;
    document.addEventListener('czap:slot-mounted', () => {
      mountedCount += 1;
    });

    const registry = SlotRegistry.create();
    SlotRegistry.scanDOM(registry, document.body);

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          yield* SlotRegistry.observe(registry, document.body);
        }),
      ),
    );

    expect(mountedCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Item 61: Hints.fromElement invalid id-map JSON is observable
// ---------------------------------------------------------------------------

describe('Hints.fromElement invalid data-morph-id-map', () => {
  test('invalid JSON emits an invalid-morph-id-map diagnostic and skips the map', () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);

    const element = document.createElement('div');
    element.setAttribute('data-morph-id-map', '{not json');

    const hints = Hints.fromElement(element);

    expect(hints.idMap).toBeUndefined();
    const warning = events.find((e) => e.code === 'invalid-morph-id-map');
    expect(warning).toBeDefined();
    expect(warning!.message).toContain('{not json');
    expect(warning!.message).toContain('data-morph-id-map=\'{"old-id":"new-id"}\'');
  });
});
