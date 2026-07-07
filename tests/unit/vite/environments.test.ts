/**
 * Vite environment configuration — browser / server / shader targets.
 *
 * @module
 */

import { describe, it, expect } from 'vitest';
import { buildEnvironments, getEnvironmentConfig } from '../../../packages/vite/src/environments.js';

describe('@czap/vite environments', () => {
  it('getEnvironmentConfig returns resolve conditions per target', () => {
    expect(getEnvironmentConfig('browser').resolve.conditions).toContain('browser');
    expect(getEnvironmentConfig('server').resolve.conditions).toContain('node');
    expect(getEnvironmentConfig('shader').resolve.extensions).toContain('.wgsl');
  });

  it('buildEnvironments merges only requested names', () => {
    const envs = buildEnvironments(['browser', 'shader']);
    expect(Object.keys(envs).sort()).toEqual(['browser', 'shader']);
    expect(envs.browser?.optimizeDeps.include).toContain('@czap/core');
    expect(envs.shader?.optimizeDeps.exclude).toContain('@czap/detect');
  });

  it('server environment excludes core from optimizeDeps prebundle', () => {
    const server = getEnvironmentConfig('server');
    expect(server.optimizeDeps.exclude).toContain('@czap/core');
  });
});
