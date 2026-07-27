/** Command-catalog and check-planning kernels over the complete live catalog. */

import { Bench } from 'tinybench';
import { COMMAND_CATALOG, createCommandRegistry, planChecks } from '@liteship/command';
import { run } from '@liteship/cli';
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
bench.add('cli run -- public help projection', async () => run(['help']));

// The public CLI writes its receipt to stdout. Suppress only the benchmarked
// adapter output so the benchmark table remains machine-readable; the measured
// callback still traverses the real public `run()` projection.
const write = process.stdout.write;
process.stdout.write = (() => true) as typeof process.stdout.write;
try {
  await bench.run();
} finally {
  process.stdout.write = write;
}
console.table(bench.table());
