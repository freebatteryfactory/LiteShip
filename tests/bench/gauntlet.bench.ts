/** Qualified Gauntlet engine throughput over a declared gate-count distribution. */

import { Bench } from 'tinybench';
import { defineGate, finding, memoryContext, runGates, type Gate } from '@liteship/gauntlet';

const context = memoryContext({ 'subject.ts': 'clean' });
const probe: Gate = defineGate({
  id: 'bench/clean-token',
  level: 'L4',
  describe: 'scan one file for a forbidden benchmark token',
  run: (candidate) =>
    candidate
      .files()
      .filter((file) => (candidate.readFile(file) ?? '').includes('FORBIDDEN'))
      .map((file) =>
        finding({
          ruleId: 'bench/clean-token',
          severity: 'error',
          level: 'L4',
          title: 'forbidden benchmark token',
          detail: file,
        }),
      ),
  fixtures: {
    red: { name: 'token present', context: memoryContext({ 'bad.ts': 'FORBIDDEN' }) },
    green: { name: 'token absent', context: memoryContext({ 'good.ts': 'clean' }) },
    mutation: { describe: 'disable detection', mutate: (gate) => ({ ...gate, run: () => [] }) },
  },
});
const gates = Array.from({ length: 128 }, () => probe);
const bench = new Bench({ warmupIterations: 50 });

bench.add('gauntlet runGates -- 128 qualified gates', () => {
  runGates(gates, context);
});

await bench.run();
console.table(bench.table());
