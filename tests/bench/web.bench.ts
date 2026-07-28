/** Qualified Web streaming/backpressure benchmarks over production kernels. */

import { Bench } from 'tinybench';
import type { SSEMessage } from '@liteship/web';
import { applyOverflow, parseMessage } from '../../packages/web/src/stream/sse-pure.js';

const patchMessage = (id: string, payload = ''): SSEMessage => ({
  type: 'patch',
  data: { id, html: `<div data-liteship-id="${id}">${payload}</div>` },
});

const saturatedBuffer = Array.from({ length: 256 }, (_, index) => patchMessage(`slot-${index}`, `v${index}`));
const incoming = patchMessage('incoming', 'x'.repeat(8_192));
const event = { data: JSON.stringify(incoming) } as MessageEvent;
const bench = new Bench({ warmupIterations: 20, iterations: 100, time: 250 });

bench.add('web applyOverflow -- 256 saturated keyed patches', () => {
  const buffer = [...saturatedBuffer];
  return applyOverflow(buffer, incoming, 'coalesce-by-id', saturatedBuffer.length);
});

bench.add('web parseMessage -- 8192-byte patch payload', () => parseMessage(event));

await bench.run();
console.table(bench.table());
