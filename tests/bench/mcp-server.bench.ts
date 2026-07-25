/** Qualified MCP JSON-RPC parser throughput over one declared mixed batch. */

import { Bench } from 'tinybench';
import { JsonRpcServer } from '@liteship/mcp-server';

const wire = JSON.stringify(
  Array.from({ length: 128 }, (_, index) =>
    index % 4 === 0
      ? { jsonrpc: '2.0', method: 'notifications/progress', params: { progress: index } }
      : { jsonrpc: '2.0', id: index, method: 'tools/list', params: {} },
  ),
);
const bench = new Bench({ warmupIterations: 20 });

bench.add('mcp JsonRpcServer.parse -- 128 mixed messages', () => {
  JsonRpcServer.parse(wire);
});

await bench.run();
console.table(bench.table());
