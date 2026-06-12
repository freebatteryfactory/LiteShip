/**
 * ErrorMessage error contract — worker error envelopes carry structure
 * (code + hint), not bare prose, and the producers populate them.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import type { Messages } from '@czap/worker';
import { COMPOSITOR_WORKER_SCRIPT } from '../../../packages/worker/src/compositor-script.js';

type ErrorMessage = Extract<Messages.FromWorker, { type: 'error' }>;

describe('ErrorMessage structure', () => {
  test('accepts code, subjectId, and hint alongside message', () => {
    const message: ErrorMessage = {
      type: 'error',
      code: 'render-failed',
      message: 'boom',
      hint: 'check the canvas',
    };
    expect(message.code).toBe('render-failed');

    // Optional fields keep custom protocol implementations compiling.
    const bare: ErrorMessage = { type: 'error', message: 'boom' };
    expect(bare.code).toBeUndefined();
  });
});

describe('producer sites populate code and hint', () => {
  test('compositor worker script tags both compute failure sites', () => {
    expect(COMPOSITOR_WORKER_SCRIPT).toContain('code: "startup-compute-failed"');
    expect(COMPOSITOR_WORKER_SCRIPT).toContain('code: "compute-failed"');
    expect(COMPOSITOR_WORKER_SCRIPT).toMatch(/hint: "compute\(\) threw/);
  });

  test('render worker script tags its render failure site', () => {
    const source = readFileSync(
      fileURLToPath(new URL('../../../packages/worker/src/render-worker.ts', import.meta.url)),
      'utf8',
    );
    expect(source).toContain('code: "render-failed"');
    expect(source).toMatch(/hint: "The render loop threw/);
  });
});
