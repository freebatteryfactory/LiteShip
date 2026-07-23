#!/usr/bin/env node
/**
 * Public LiteShip executable. The facade owns the command name while the
 * implementation remains in its declared @liteship/cli dependency.
 */
import { run } from '@liteship/cli';

const exitCode = await run(process.argv.slice(2));
process.exit(exitCode);
