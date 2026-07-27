/** Qualified asset parsing and audio-analysis throughput benchmarks. */

import { Bench } from 'tinybench';
import { computeWaveform, detectBeats, detectOnsets, walkRiff } from '@liteship/assets';

function riffWithEmptyChunks(chunkCount: number): ArrayBuffer {
  const bytes = new Uint8Array(12 + chunkCount * 8);
  bytes.set(new TextEncoder().encode('RIFF'), 0);
  new DataView(bytes.buffer).setUint32(4, bytes.byteLength - 8, true);
  bytes.set(new TextEncoder().encode('WAVE'), 8);
  for (let index = 0; index < chunkCount; index++) {
    bytes.set(new TextEncoder().encode('JUNK'), 12 + index * 8);
  }
  return bytes.buffer;
}

const riff = riffWithEmptyChunks(1024);
const samples = Float32Array.from({ length: 65_536 }, (_, index) => Math.sin((2 * Math.PI * index) / 1200));
const audio = { sampleRate: 48_000, samples };
const bench = new Bench({ warmupIterations: 20 });

bench.add('assets walkRiff -- 1024 empty chunks', () => {
  for (const chunk of walkRiff(riff)) void chunk;
});

bench.add('assets computeWaveform -- 65536 frames', () => {
  computeWaveform(audio, { bins: 512 });
});

bench.add('assets detectOnsets -- 65536 frames', () => {
  detectOnsets(audio);
});

bench.add('assets detectBeats -- 65536 frames', () => {
  detectBeats(audio);
});

await bench.run();
console.table(bench.table());
