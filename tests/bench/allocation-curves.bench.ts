/** Qualified retained-allocation curves; execution is owned by the collector. */

import { runAllocationContracts } from '../../scripts/allocation-contracts.js';
import { isDirectExecution } from '../../scripts/audit/shared.js';

const registered: string[] = [];
const bench = { add: (name: string): number => registered.push(name) };

bench.add('alloc curve -- CanonicalCbor.encode');
bench.add('alloc curve -- canonical decode');

if (isDirectExecution(import.meta.url)) {
  void registered;
  runAllocationContracts();
}
