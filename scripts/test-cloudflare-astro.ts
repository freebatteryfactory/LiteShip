/**
 * Integration test for Cloudflare + Astro example.
 *
 * Run: pnpm run test:cloudflare
 */
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runPnpm } from './support/pnpm-process.ts';
import { doctor } from '../packages/cli/src/commands/doctor.js';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const EXAMPLE_DIR = resolve(REPO_ROOT, 'examples/cloudflare-astro');
const DIST_DIR = resolve(EXAMPLE_DIR, 'dist');
/** Writable XDG config root so workerd/wrangler never touch ~/.config in CI sandboxes. */
const WRANGLER_CONFIG_HOME = resolve(REPO_ROOT, '.czap', 'wrangler-test');

function cloudflareChildEnv(): Record<string, string> {
  mkdirSync(WRANGLER_CONFIG_HOME, { recursive: true });
  return { FORCE_COLOR: '0', XDG_CONFIG_HOME: WRANGLER_CONFIG_HOME };
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  PASS: ${message}`);
}

function findFiles(dir: string, ext: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(fullPath, ext));
    } else if (entry.name.endsWith(ext)) {
      results.push(fullPath);
    }
  }
  return results;
}

function anyFileContains(dir: string, ext: string, needle: string): boolean {
  for (const file of findFiles(dir, ext)) {
    if (readFileSync(file, 'utf-8').includes(needle)) return true;
  }
  return false;
}

async function main(): Promise<void> {
  console.log('\n=== Cloudflare + Astro integration test ===\n');

  console.log('[1/4] Building workspace packages...');
  const build = await runPnpm(['run', 'build'], { cwd: REPO_ROOT, env: { FORCE_COLOR: '0' } });
  if (build.code !== 0) {
    console.error(build.stderr || build.stdout);
    process.exit(1);
  }
  console.log('  Workspace built.\n');

  console.log('[2/4] czap doctor --target cloudflare --ci on example...');
  const doctorExit = await doctor({ pretty: false, target: 'cloudflare', ci: true, cwd: EXAMPLE_DIR });
  assert(doctorExit === 0, 'doctor --target cloudflare --ci exits 0 for the example app');

  console.log('[3/4] astro build (Cloudflare adapter)...');
  const astroBuild = await runPnpm(['exec', 'astro', 'build'], { cwd: EXAMPLE_DIR, env: cloudflareChildEnv() });
  if (astroBuild.code !== 0) {
    console.error(astroBuild.stderr || astroBuild.stdout);
    process.exit(1);
  }
  assert(existsSync(DIST_DIR), 'dist/ directory exists after astro build');
  // @astrojs/cloudflare emits the SSR worker entry under dist/server/ —
  // `index.mjs` in v13+, `entry.mjs` in older versions, or a `_worker.js`
  // bundle in even older layouts. `wrangler.json` is the deployment descriptor
  // the adapter always writes for a Workers SSR build, so it is the most
  // version-stable marker.
  const ssrOutputs = [
    resolve(DIST_DIR, 'server', 'index.mjs'),
    resolve(DIST_DIR, 'server', 'entry.mjs'),
    resolve(DIST_DIR, 'server', 'wrangler.json'),
    resolve(DIST_DIR, '_worker.js'),
  ];
  assert(
    ssrOutputs.some((p) => existsSync(p)),
    'dist/server/index.mjs (or entry.mjs / wrangler.json / _worker.js) exists (Workers SSR output)',
  );
  assert(
    anyFileContains(DIST_DIR, '.html', 'data-czap-boundary') ||
      anyFileContains(DIST_DIR, '.js', 'data-czap-boundary') ||
      anyFileContains(DIST_DIR, '.mjs', 'data-czap-boundary'),
    'build output contains czap boundary marker',
  );

  console.log('[4/4] Vitest cloudflare edge pipeline...');
  const vitest = await runPnpm(
    ['exec', 'vitest', 'run', '--config', 'vitest.config.ts', 'tests/integration/cloudflare-edge-pipeline.test.ts'],
    { cwd: REPO_ROOT, env: cloudflareChildEnv() },
  );
  if (vitest.code !== 0) {
    console.error(vitest.stderr || vitest.stdout);
    process.exit(1);
  }

  console.log('\n=== Cloudflare + Astro integration test passed ===\n');
}

await main();
