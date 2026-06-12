#!/usr/bin/env node
/**
 * create-liteship bin shim — resolves the built entrypoint and runs it.
 * In the published tarball dist/ always exists (prepack builds); the
 * guard only matters when running from a fresh monorepo clone.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const distEntry = resolve(here, '../dist/index.js');

if (!existsSync(distEntry)) {
  process.stderr.write(
    'create-liteship: dist/ is missing (monorepo checkout before build?).\n' +
      '  Build it with: pnpm run build\n',
  );
  process.exit(127);
}

const { run } = await import(pathToFileURL(distEntry).href);
const exitCode = await run(process.argv.slice(2));
process.exit(exitCode);
