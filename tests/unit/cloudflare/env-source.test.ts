import { afterEach, describe, expect, test } from 'vitest';
import { Diagnostics } from '@liteship/core';
import {
  getDefaultWorkersEnv,
  loadWorkersEnvFromRuntime,
  resetWorkersEnvForTesting,
  resolveEnvSource,
  setWorkersEnvForTesting,
  type EnvSourceConfig,
} from '../../../packages/cloudflare/src/env-source.js';

afterEach(() => {
  // The env cache and warnOnce dedupe are module-level state shared with the
  // middleware/cache-provider seams; reset both so tests do not leak.
  resetWorkersEnvForTesting();
  Diagnostics.reset();
});

describe('@liteship/cloudflare/env-source', () => {
  describe('resolveEnvSource', () => {
    // LAW (the byte-equivalent copies in middleware.ts + cache-provider.ts rely on this):
    // a function env is the getter, a value env is wrapped, an omitted env reads the default.
    test('function branch: returns the caller getter unchanged for per-request env timing', () => {
      const getter = () => ({ KV: 'live' });
      const config: EnvSourceConfig = { env: getter };
      expect(resolveEnvSource(config)).toBe(getter);
    });

    test('value branch: wraps a value in a getter that yields the same object on every call', () => {
      const env = { KV: {} };
      const config: EnvSourceConfig = { env };
      const source = resolveEnvSource(config);
      expect(source).not.toBe(env);
      expect(source()).toBe(env);
      expect(source()).toBe(env);
    });

    test('default branch: an omitted env reads the runtime-primed default cache on each call', () => {
      resetWorkersEnvForTesting();
      const source = resolveEnvSource({});
      // Empty until primed/seeded...
      expect(source()).toEqual({});
      // ...and the getter re-reads the cache, so later seeding is observed.
      setWorkersEnvForTesting({ seeded: true });
      expect(source()).toEqual({ seeded: true });
    });
  });

  describe('priming (loadWorkersEnvFromRuntime)', () => {
    test('returns the already-primed cache without probing cloudflare:workers or warning', async () => {
      const env = { LITESHIP_BOUNDARY_CACHE: {} };
      setWorkersEnvForTesting(env);
      const { sink, events } = Diagnostics.createBufferSink();
      Diagnostics.setSink(sink);

      await expect(loadWorkersEnvFromRuntime()).resolves.toBe(env);
      expect(getDefaultWorkersEnv()).toBe(env);
      expect(events).toHaveLength(0);
    });

    test('warns once and falls back to the default env when cloudflare:workers is unavailable (Node)', async () => {
      resetWorkersEnvForTesting();
      const { sink, events } = Diagnostics.createBufferSink();
      Diagnostics.setSink(sink);

      const first = await loadWorkersEnvFromRuntime();
      const second = await loadWorkersEnvFromRuntime();
      expect(first).toEqual({});
      expect(second).toEqual({});

      const warned = events.filter((event) => event.code === 'workers-env-unavailable');
      // warnOnce dedupes the repeated failed probe to a single diagnostic.
      expect(warned).toHaveLength(1);
      expect(warned[0]).toMatchObject({ level: 'warn', source: 'liteship/cloudflare.middleware' });
    });
  });
});
