/** @liteship/detect error contract */
import { afterEach, describe, it, expect } from 'vitest';
import { Diagnostics } from '@liteship/core';
import { explainDiagnostic } from '@liteship/error';
import { classifyGPURenderer } from '../../../packages/detect/src/detect.js';

describe('@liteship/detect error contract', () => {
  afterEach(() => Diagnostics.reset());

  it('an unknown renderer emits an explainable stable diagnostic', () => {
    const buffer = Diagnostics.createBufferSink();
    Diagnostics.setSink(buffer.sink);

    expect(classifyGPURenderer('Acme XG-9')).toBe(1);
    expect(buffer.events).toContainEqual(
      expect.objectContaining({
        source: 'liteship/detect',
        code: 'detect/unrecognized-gpu-renderer',
      }),
    );
    expect(explainDiagnostic('detect/unrecognized-gpu-renderer')).toBeDefined();
  });

  it('every stable detect diagnostic resolves through the shared registry', () => {
    for (const code of ['detect/unrecognized-gpu-renderer', 'detect/probes-defaulted'] as const) {
      expect(explainDiagnostic(code), code).toEqual(
        expect.objectContaining({ area: 'detect', owner: '@liteship/detect' }),
      );
    }
  });
});
