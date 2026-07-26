/** Command-catalog and check-planning kernels over the complete live catalog. */

import { Bench } from 'tinybench';
import { COMMAND_CATALOG } from '../../packages/command/src/catalog.js';
import { createCommandRegistry } from '../../packages/command/src/registry.js';
import { planChecks } from '../../packages/command/src/checks/plan.js';
import { hashInputs } from '../../packages/command/src/host/idempotency.js';

const commands = COMMAND_CATALOG.map((descriptor) => ({ descriptor }));
const cacheInput = {
  command: 'check',
  inputs: { profile: 'release', platform: 'linux', paths: Array.from({ length: 64 }, (_, index) => `path-${index}`) },
  force: false,
  env: { node: 'v22.20.0', platform: 'linux', arch: 'x64', pm: 'pnpm/10.17.1' },
} as const;
const bench = new Bench({ warmupIterations: 20, iterations: 100, time: 250 });

bench.add('command planChecks -- release profile', () => planChecks('release', 'linux'));
bench.add('command registry construction -- full catalog', () => createCommandRegistry(commands));
bench.add('command cache identity -- structured inputs', () => hashInputs(cacheInput));

await bench.run();
console.table(bench.table());
