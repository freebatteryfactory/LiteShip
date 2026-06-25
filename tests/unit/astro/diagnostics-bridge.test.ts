/**
 * Diagnostics → Astro logger bridge tests.
 *
 * Proves czap runtime diagnostics route through an Astro-shaped logger by
 * severity, and that installing the bridge swaps the global sink and restores it.
 */

import { describe, test, expect, afterEach } from 'vitest';
import { Diagnostics } from '@czap/core';
import { bridgeDiagnosticsToAstroLogger, installDiagnosticsBridge } from '@czap/astro';

afterEach(() => {
  Diagnostics.reset();
});

describe('bridgeDiagnosticsToAstroLogger', () => {
  test('routes warn-level diagnostics to logger.warn with source/code/message', () => {
    const warns: string[] = [];
    const sink = bridgeDiagnosticsToAstroLogger({ warn: (m) => warns.push(m), error: () => {} });
    sink.emit({ level: 'warn', source: 'czap/edge', code: 'invalid-cache-entry', message: 'bad', timestamp: 0 });
    expect(warns).toHaveLength(1);
    expect(warns[0]).toContain('czap/edge');
    expect(warns[0]).toContain('invalid-cache-entry');
    expect(warns[0]).toContain('bad');
  });

  test('routes error-level diagnostics to logger.error', () => {
    const errors: string[] = [];
    const sink = bridgeDiagnosticsToAstroLogger({ warn: () => {}, error: (m) => errors.push(m) });
    sink.emit({ level: 'error', source: 's', code: 'c', message: 'm', timestamp: 0 });
    expect(errors).toHaveLength(1);
  });

  test('includes structured detail and cause in the line', () => {
    const warns: string[] = [];
    const sink = bridgeDiagnosticsToAstroLogger({ warn: (m) => warns.push(m), error: () => {} });
    sink.emit({
      level: 'warn',
      source: 's',
      code: 'c',
      message: 'm',
      detail: { key: 'v' },
      cause: new Error('boom'),
      timestamp: 0,
    });
    expect(warns[0]).toContain('"key":"v"');
    expect(warns[0]).toContain('boom');
  });
});

describe('installDiagnosticsBridge', () => {
  test('routes live Diagnostics.warn through the logger, and restores on teardown', () => {
    const warns: string[] = [];
    const restore = installDiagnosticsBridge({ warn: (m) => warns.push(m), error: () => {} });

    Diagnostics.warn({ source: 'czap/test', code: 'x', message: 'live' });
    expect(warns).toHaveLength(1);
    expect(warns[0]).toContain('live');

    restore();
    // After restore the bridge no longer receives events.
    Diagnostics.warn({ source: 'czap/test', code: 'x2', message: 'after' });
    expect(warns).toHaveLength(1);
  });
});
