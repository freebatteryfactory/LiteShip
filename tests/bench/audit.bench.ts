/** Qualified audit-parser throughput over a declared TypeScript source corpus. */

import { Bench } from 'tinybench';
import { detectSkipsAST } from '@liteship/audit';

const source = Array.from({ length: 1_024 }, (_, index) =>
  index % 32 === 0
    ? `it.skip("case-${index}", () => { expect(${index}).toBe(${index}); });`
    : `it("case-${index}", () => { expect(${index}).toBe(${index}); });`,
).join('\n');
const bench = new Bench({ warmupIterations: 10 });

bench.add('audit detectSkipsAST -- 1024 declarations', () => {
  detectSkipsAST(source);
});

await bench.run();
console.table(bench.table());
