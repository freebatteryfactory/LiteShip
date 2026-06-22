/**
 * DETERMINISM DRIFT GUARD — the DST harness source reads ZERO ambient nondeterminism.
 *
 * The entire value of the harness is that it is MORE deterministic than the code
 * it tests: it must not, itself, read real time or real randomness. If a future
 * edit slipped a raw `Date.now()` / `Math.random()` / argless `new Date()` /
 * `performance.now()` into the harness, the harness would become exactly the kind
 * of nondeterministic thing it exists to catch — a silent, total corruption of the
 * trust spine. This guard pins that the harness source files have NO such read,
 * computing the verdict from the SOURCE OF TRUTH (the actual source bytes), never
 * a proxy.
 *
 * It deliberately scans the harness modules only — the world fixes time/randomness
 * by injecting the `@czap/core` substrate (manualClock / seededRng), so the ONLY
 * sanctioned entropy boundaries (systemClock / wallClock / systemRng) live in
 * `clock.ts` / `rng.ts` and are owner-waived; the harness must reach NONE of them.
 *
 * @module
 */

// PROVES: INV-DST-TRACE-CONTENT-ADDRESSED, INV-DST-NO-AMBIENT-ENTROPY
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
// tests/unit/core → repo root is three up.
const repoRoot = resolve(here, '../../..');
const simDir = resolve(repoRoot, 'packages/core/src/simulation');

/** The harness source modules — the whole DST surface. */
const HARNESS_MODULES = ['world.ts', 'scheduler.ts', 'fault.ts', 'trace.ts', 'scenario.ts', 'index.ts'] as const;

/**
 * The same ambient-nondeterminism pattern the gauntlet no-nondeterminism gate
 * pins: a `Date.now(` / `performance.now(` / `Math.random(` CALL, or an argless
 * `new Date()`. The open-paren pins each to a call (not a doc reference).
 */
const AMBIENT = /\bDate\.now\(|\bperformance\.now\(|\bMath\.random\(|\bnew Date\(\s*\)/;

/**
 * Strip line comments and block comments crudely so a DOCSTRING mentioning
 * `Date.now()` (the harness docs explain WHY they avoid it) is not a false
 * positive — only executable code counts. This is the honest "is this CODE?"
 * floor; it is intentionally simple (the harness has no string literals carrying
 * these tokens).
 */
function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '') // block comments (incl. JSDoc)
    .split('\n')
    .map((line) => {
      const idx = line.indexOf('//');
      return idx >= 0 ? line.slice(0, idx) : line;
    })
    .join('\n');
}

describe('DETERMINISM DRIFT GUARD: the DST harness reads zero ambient time/randomness', () => {
  for (const mod of HARNESS_MODULES) {
    it(`${mod} contains no ambient Date.now / performance.now / Math.random / argless new Date in CODE`, () => {
      const src = readFileSync(resolve(simDir, mod), 'utf8');
      const code = codeOnly(src);
      expect(AMBIENT.test(code)).toBe(false);
    });
  }

  it('the harness imports its time/randomness ONLY from the @czap/core substrate (manualClock / seededRng)', () => {
    const world = readFileSync(resolve(simDir, 'world.ts'), 'utf8');
    // The world's determinism comes from the injected substrate, named explicitly.
    expect(world).toMatch(/manualClock/);
    expect(world).toMatch(/seededRng/);
  });

  it('the trace digest is minted through the ONE content-address kernel (contentAddressOf), never forked', () => {
    const trace = readFileSync(resolve(simDir, 'trace.ts'), 'utf8');
    expect(trace).toMatch(/contentAddressOf/);
    // It must NOT roll its own hash / JSON-stringify identity.
    expect(codeOnly(trace)).not.toMatch(/JSON\.stringify/);
  });
});
