/**
 * Friendly post-install banner. Runs after every `pnpm install` and tells
 * the next-step story: doctor, build, test. Silent when CI=1 so log
 * scrapers stay clean. Never fails the install — wraps everything in a
 * single try/catch and exits 0 on any error.
 *
 * @module
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { color, colorEnabled, header } from '../packages/cli/src/lib/ansi.js';

const repoRoot = resolve(import.meta.dirname, '..');

function main(): void {
  // Don't decorate CI logs.
  if (process.env.CI || process.env.LITESHIP_QUIET_INSTALL) return;

  // Detect first-time vs repeat install. Repeat installs already have at
  // least one package's dist/ on disk; first-time has none.
  const corePackaged = existsSync(resolve(repoRoot, 'packages/core/dist/index.js'));
  const cliPackaged = existsSync(resolve(repoRoot, 'packages/cli/dist/index.js'));
  const firstTime = !corePackaged && !cliPackaged;
  const on = colorEnabled(process.stdout);

  const lines: string[] = [];
  lines.push('');
  lines.push(`  ${header('LiteShip', on)} — installed.`);
  if (firstTime) {
    lines.push('');
    lines.push('  First time here? One command runs the whole first-run check:');
    lines.push('');
    lines.push(`    ${color('cyan', 'pnpm verify', on)}`);
    lines.push(`    ${color('dim', 'doctor + build + test', on)}`);
    lines.push('');
    lines.push('  Or step through it yourself (one command per line):');
    lines.push('');
    lines.push(`    ${color('cyan', 'pnpm run doctor', on)}`);
    lines.push(`    ${color('dim', 'preflight checks only', on)}`);
    lines.push(`    ${color('cyan', 'pnpm dev', on)}`);
    lines.push(`    ${color('dim', 'run the dev host', on)}`);
    lines.push(`    ${color('cyan', 'pnpm test', on)}`);
    lines.push(`    ${color('dim', 'fast inner loop (~75s)', on)}`);
    lines.push('');
    lines.push('  Find your way around:');
    lines.push(`    ${color('cyan', 'pnpm scripts', on)}         ${color('dim', '# categorized catalog of all dev scripts', on)}`);
    lines.push(`    ${color('cyan', 'pnpm run glossary', on)}    ${color('dim', '# look up a LiteShip term', on)}`);
  } else {
    lines.push('');
    lines.push('  Get going with:');
    lines.push(
      `    ${color('cyan', 'pnpm verify', on)}   ${color('cyan', 'pnpm dev', on)}   ${color('cyan', 'pnpm test', on)}   ${color('cyan', 'pnpm scripts', on)}`,
    );
  }
  lines.push('');

  process.stdout.write(lines.join('\n'));
}

try {
  main();
} catch {
  // Never fail the install over a banner.
}
