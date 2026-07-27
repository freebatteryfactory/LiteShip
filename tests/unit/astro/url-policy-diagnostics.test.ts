// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { Diagnostics } from '@liteship/core';
import { allowRuntimeEndpointUrl } from '../../../packages/astro/src/runtime/url-policy.js';

describe('Astro runtime URL policy diagnostics', () => {
  beforeEach(() => {
    Diagnostics.reset();
  });

  afterEach(() => {
    Diagnostics.reset();
  });

  test('uses one stable malformed-URL identity and carries endpoint kind in detail', () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);

    expect(allowRuntimeEndpointUrl('http://%', 'stream', 'test')).toBeNull();
    expect(allowRuntimeEndpointUrl('http://%', 'gpu-shader', 'test')).toBeNull();

    expect(events).toEqual([
      expect.objectContaining({
        code: 'astro/url-policy/malformed-url-rejected',
        detail: { kind: 'stream' },
      }),
      expect.objectContaining({
        code: 'astro/url-policy/malformed-url-rejected',
        detail: { kind: 'gpu-shader' },
      }),
    ]);
  });

  test('uses a stable private-IP identity and carries endpoint kind in detail', () => {
    const { sink, events } = Diagnostics.createBufferSink();
    Diagnostics.setSink(sink);

    expect(
      allowRuntimeEndpointUrl('http://192.168.1.1/api', 'stream', 'test', undefined, {
        mode: 'allowlist',
        allowOrigins: ['http://192.168.1.1'],
      }),
    ).toBeNull();

    expect(events).toContainEqual(
      expect.objectContaining({
        code: 'astro/url-policy/private-ip-rejected',
        detail: { kind: 'stream' },
      }),
    );
  });
});
