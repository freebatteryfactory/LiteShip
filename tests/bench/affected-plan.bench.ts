/** Planner cost benchmark over small and safety-ceiling change sets. */

import { Bench } from 'tinybench';
import { PACKAGE_CATALOG } from '../../scripts/package-catalog.js';
import { buildAssuranceInventory } from '../../scripts/lib/assurance-inventory.js';
import { planAffectedTests } from '../../scripts/lib/affected-test-plan.js';

const inventory = buildAssuranceInventory(process.cwd());
const small = ['packages/core/src/authoring/boundary.ts'];
const broad = Array.from({ length: 250 }, (_, index) => `tests/unit/generated-impact-${index}.test.ts`);
const bench = new Bench({ warmupIterations: 20, iterations: 100, time: 250 });

bench.add('affected plan — one L4 source path', () => planAffectedTests(small, PACKAGE_CATALOG, inventory));
bench.add('affected plan — 250 changed test paths', () => planAffectedTests(broad, PACKAGE_CATALOG, inventory));

await bench.run();
console.table(bench.table());
