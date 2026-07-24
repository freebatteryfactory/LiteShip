import { afterEach, describe, expect, test, vi } from 'vitest';
import { Diagnostics, fixedClock } from '@liteship/core';

afterEach(() => {
  Diagnostics.reset();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Diagnostics', () => {
  test('routes warning and error payloads through a swappable sink', () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);

    Diagnostics.warn({
      source: 'liteship/test',
      code: 'warn-code',
      message: 'Warned once.',
      detail: { path: '/tmp/example' },
    });
    Diagnostics.error({
      source: 'liteship/test',
      code: 'error-code',
      message: 'Errored once.',
      cause: new Error('boom'),
    });

    expect(events).toEqual([
      expect.objectContaining({
        level: 'warn',
        source: 'liteship/test',
        code: 'warn-code',
        message: 'Warned once.',
        detail: { path: '/tmp/example' },
      }),
      expect.objectContaining({
        level: 'error',
        source: 'liteship/test',
        code: 'error-code',
        message: 'Errored once.',
        cause: expect.any(Error),
      }),
    ]);
  });

  test('event timestamp reads from the injected (wall) clock — deterministic via fixedClock', () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);
    // The timestamp is a wall-clock TIMESTAMP; pinning the clock makes it stable.
    const previous = Diagnostics.setClock(fixedClock(1_700_000_000_000));
    expect(typeof previous.now).toBe('function');

    Diagnostics.warn({ source: 'liteship/test', code: 'ts', message: 'stamped' });
    expect(events).toHaveLength(1);
    expect(events[0]?.timestamp).toBe(1_700_000_000_000);

    // resetClock() restores the default wall clock (a real, non-fixed timestamp).
    Diagnostics.resetClock();
    const after = Diagnostics.warn({ source: 'liteship/test', code: 'ts2', message: 'real' });
    expect(after.timestamp).not.toBe(1_700_000_000_000);
  });

  test('deduplicates warnOnce until the once cache is cleared', () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);

    const payload = {
      source: 'liteship/test',
      code: 'dedupe',
      message: 'Only emit me once.',
    } as const;

    Diagnostics.warnOnce(payload);
    Diagnostics.warnOnce(payload);
    expect(events).toHaveLength(1);

    Diagnostics.clearOnce();
    Diagnostics.warnOnce(payload);
    expect(events).toHaveLength(2);
  });

  test('reset clears the once cache and restores the default sink', () => {
    const first = Diagnostics.createBufferSink();
    Diagnostics.setSink(first.sink);

    const payload = {
      source: 'liteship/test',
      code: 'reset-once',
      message: 'Reset me.',
    } as const;

    Diagnostics.warnOnce(payload);
    Diagnostics.reset();

    const second = Diagnostics.createBufferSink();
    Diagnostics.setSink(second.sink);
    Diagnostics.warnOnce(payload);

    expect(first.events).toHaveLength(1);
    expect(second.events).toHaveLength(1);
  });

  test('default sink tolerates missing console methods and still emits when available', () => {
    const error = vi.fn();
    vi.stubGlobal('console', { error });

    expect(() =>
      Diagnostics.warn({
        source: 'liteship/test',
        code: 'missing-warn',
        message: 'No warn method is available.',
      }),
    ).not.toThrow();

    Diagnostics.error({
      source: 'liteship/test',
      code: 'has-error',
      message: 'Error still routes through the console sink.',
      detail: { retry: false },
    });

    expect(error).toHaveBeenCalledWith(
      '[liteship/test] has-error: Error still routes through the console sink.',
      { retry: false },
    );
  });

  test('default sink forwards causes when detail is absent', () => {
    const error = vi.fn();
    const boom = new Error('boom');
    vi.stubGlobal('console', { error });

    Diagnostics.error({
      source: 'liteship/test',
      code: 'has-cause',
      message: 'Cause still routes through the console sink.',
      cause: boom,
    });

    expect(error).toHaveBeenCalledWith('[liteship/test] has-cause: Cause still routes through the console sink.', boom);
  });

  test('default sink is a no-op when globalThis.console is not an object', () => {
    vi.stubGlobal('console', undefined as never);
    expect(() =>
      Diagnostics.warn({
        source: 'liteship/test',
        code: 'no-console',
        message: 'Console is missing entirely.',
      }),
    ).not.toThrow();
  });

  test('default sink is a no-op when console has neither warn nor error methods', () => {
    vi.stubGlobal('console', { log: vi.fn() });
    expect(() =>
      Diagnostics.warn({
        source: 'liteship/test',
        code: 'no-methods',
        message: 'Console exists but lacks warn/error.',
      }),
    ).not.toThrow();
    expect(() =>
      Diagnostics.error({
        source: 'liteship/test',
        code: 'no-methods',
        message: 'Console exists but lacks warn/error.',
      }),
    ).not.toThrow();
  });
});
