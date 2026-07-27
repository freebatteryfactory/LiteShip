/** tsx-runnable CLI entrypoint. Used by integration tests and by the bin/liteship.mjs wrapper. */

import { run } from './index.js';

const exitCode = await run(process.argv.slice(2));
process.exit(exitCode);
