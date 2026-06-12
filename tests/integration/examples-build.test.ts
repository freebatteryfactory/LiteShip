import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { scaledTimeout } from '../../vitest.shared.js';
import { spawnArgvCapture } from '../../scripts/lib/spawn.js';

/**
 * Every example with a `build` script must actually build. Examples are
 * teaching artifacts consumed verbatim by new users, and nothing else in
 * CI exercises them — examples/tutorial shipped a page that failed
 * `astro build` outright (mangled brace escapes in 05-llm.astro) because
 * the only built project in the gauntlet was the integration FIXTURE,
 * not the examples. The list is derived, not hardcoded, so a new example
 * joins the gate the moment it declares a build script.
 *
 * Builds run sequentially — four concurrent astro builds can starve a
 * loaded CI box (and the local dev machine) of memory for nothing.
 */
const examplesRoot = resolve(import.meta.dirname, '../../examples');

const buildable = readdirSync(examplesRoot).filter((name) => {
  const manifest = join(examplesRoot, name, 'package.json');
  if (!existsSync(manifest)) return false;
  let pkg: { scripts?: Record<string, string> };
  try {
    pkg = JSON.parse(readFileSync(manifest, 'utf8')) as { scripts?: Record<string, string> };
  } catch (cause) {
    // A bare JSON.parse throw aborts the suite at collection time with no
    // file attribution — name the offending manifest.
    throw new Error(`examples/${name}/package.json is not valid JSON`, { cause });
  }
  return typeof pkg.scripts?.build === 'string';
});

describe.sequential('examples build', () => {
  it('found the buildable examples (drift guard for the derived list)', () => {
    // If an example loses its build script this assertion names the change
    // instead of the suite silently shrinking.
    expect(buildable).toContain('default');
    expect(buildable).toContain('tutorial');
    expect(buildable).toContain('showcase');
    expect(buildable).toContain('cloudflare-astro');
  });

  for (const name of buildable) {
    it(`examples/${name} builds`, async () => {
      const result = await spawnArgvCapture('pnpm', ['run', 'build'], {
        cwd: join(examplesRoot, name),
      });
      if (result.exitCode !== 0) {
        // Surface the tail of the build log — the assertion alone says
        // nothing about WHICH page or import broke.
        const tail = (result.stderr || result.stdout).split('\n').slice(-30).join('\n');
        expect.fail(`examples/${name} build exited ${result.exitCode}:\n${tail}`);
      }
    }, scaledTimeout(180_000));
  }
});
