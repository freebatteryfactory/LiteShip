import { resolve } from 'node:path';
import { spawnPnpm } from './support/pnpm-process.ts';

const root = resolve(import.meta.dirname!, '..');
const config = resolve(root, 'tests/e2e/playwright.config.ts');

function run(args: readonly string[]): Promise<number> {
  const child = spawnPnpm(args, { cwd: root, stdio: 'inherit' });
  return new Promise((resolveExit, reject) => {
    child.on('error', reject);
    child.on('close', (code) => resolveExit(code ?? 1));
  });
}

// The Adaptive browser proof consumes the real Astro integration output. Own
// that prerequisite here so every declared `test:e2e` authority rebuilds it
// from the current source instead of skipping on a cold checkout or consuming
// stale local dist bytes. The stress commands select non-Astro specs and keep
// their narrower setup.
const astroExit = await run(['run', 'test:astro']);
if (astroExit !== 0) process.exit(astroExit);

const playwrightExit = await run(['exec', 'playwright', 'test', `--config=${config}`, ...process.argv.slice(2)]);
process.exit(playwrightExit);
