/**
 * WASM compute-kernel throughput — blend_normalize hot path via WASMDispatch.
 * Skips when the liteship-compute artifact is absent (no Rust toolchain).
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Bench } from 'tinybench';
import { WASMDispatch } from '@liteship/core';

const WASM_PATH = resolve(
  import.meta.dirname,
  '..',
  '..',
  'crates/liteship-compute/target/wasm32-unknown-unknown/release/liteship_compute.wasm',
);

const bench = new Bench({ warmupIterations: 50 });

if (existsSync(WASM_PATH)) {
  const bytes = readFileSync(WASM_PATH);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const wasm = await WASMDispatch.load(buffer);
  const weights = new Float32Array([0.2, 0.3, 0.5]);

  bench.add('WASM blend_normalize -- 3 weights × 1000', () => {
    for (let i = 0; i < 1000; i++) {
      wasm.blendNormalize(weights);
    }
  });
} else {
  console.warn(`[wasm-compute.bench] skipping — artifact not found at ${WASM_PATH}`);
}

await bench.run();
console.table(bench.table());
