/**
 * Smoke test -- verify benchmark tooling is available.
 *
 * Does NOT import or run benchmark files (they have top-level await bench.run()
 * which would execute the full benchmark suite and hit peer dep issues).
 */

import { describe, it, expect } from 'vitest';
import { Bench } from 'tinybench';

describe('Benchmark smoke tests', () => {
  it('tinybench Bench class is importable', () => {
    expect(typeof Bench).toBe('function');
    const bench = new Bench();
    expect(bench).toBeDefined();
  });

  it('Bench instance has expected API', () => {
    const bench = new Bench();
    expect(typeof bench.add).toBe('function');
    expect(typeof bench.run).toBe('function');
    expect(typeof bench.table).toBe('function');
  });

  it('bench.run() produces at least one sample (micro-bench harness proof)', async () => {
    const micro = new Bench({ time: 100, iterations: 1 });
    micro.add('noop', () => {});
    await micro.run();
    expect(micro.results.length).toBeGreaterThan(0);
    const firstResult = micro.results[0]!;
    expect(firstResult.latency.samplesCount).toBeGreaterThan(0);
    expect(Number.isFinite(firstResult.latency.mean)).toBe(true);
  });

  it('bench files exist on disk', async () => {
    const fs = await import('fs');
    expect(fs.existsSync('./tests/bench/core.bench.ts')).toBe(true);
    expect(fs.existsSync('./tests/bench/compiler.bench.ts')).toBe(true);
    expect(fs.existsSync('./tests/bench/video.bench.ts')).toBe(true);
    expect(fs.existsSync('./tests/bench/self-measure.bench.ts')).toBe(true);
  });
});
