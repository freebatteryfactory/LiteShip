/**
 * Standalone tsx wrapper around the CLI doctor command. Lets `pnpm
 * doctor` run on a fresh clone before `pnpm run build` has produced any
 * `dist/`. Imports the command directly (skipping the full dispatch
 * graph, which transitively pulls in `@czap/core`'s built output).
 *
 * @module
 */

import { doctor } from '../packages/cli/src/commands/doctor.js';

const fix = process.argv.includes('--fix');
const ci = process.argv.includes('--ci');
const preflight = process.argv.includes('--preflight');
const targetEq = process.argv.find((a) => a.startsWith('--target='))?.slice('--target='.length);
const targetIdx = process.argv.indexOf('--target');
const targetRaw = targetEq ?? (targetIdx >= 0 ? process.argv[targetIdx + 1] : undefined);
const target = targetRaw === 'cloudflare' ? ('cloudflare' as const) : undefined;
const exitCode = await doctor({ fix, ci, preflight, ...(target ? { target } : {}) });
process.exit(exitCode);
