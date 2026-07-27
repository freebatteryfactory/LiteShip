/** Qualified canonical-byte throughput benchmarks over one declared payload shape. */

import { Bench } from 'tinybench';
import { CanonicalCbor, decode } from '@liteship/canonical';

const bench = new Bench({ warmupIterations: 100 });
const payload = { values: Array.from({ length: 256 }, (_, index) => index) };
const encoded = CanonicalCbor.encode(payload);

bench.add('CanonicalCbor.encode -- 256 integers', () => {
  CanonicalCbor.encode(payload);
});

bench.add('canonical decode -- 256 integers', () => {
  decode(encoded);
});

await bench.run();
console.table(bench.table());
