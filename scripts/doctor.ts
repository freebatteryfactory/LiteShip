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
const exitCode = await doctor({ fix, ci, preflight });
process.exit(exitCode);
