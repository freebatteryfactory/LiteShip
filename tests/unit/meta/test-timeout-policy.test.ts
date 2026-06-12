/**
 * Timeout-policy source guard — explicit vitest timeouts must go through
 * `scaledTimeout` (vitest.shared.ts).
 *
 * Why this exists: under `--coverage` the config default is the 240s floor,
 * so a raw per-test literal like `}, 60_000)` silently LOWERS the budget and
 * turns an honest instrumented run into a flake (the audit-floor suite hit
 * exactly this during the 0.1.5 release). `scaledTimeout` clamps coverage
 * runs to the floor and honors `CZAP_TEST_TIMEOUT_SCALE` on loaded machines,
 * so an explicit timeout can only ever raise the budget.
 *
 * The guard reads test sources (B1/B2/B5 source-guard idiom) and rejects:
 *   - raw trailing-arg timeouts:   `}, 90_000);`   (>= 1s — smaller values
 *     are setTimeout/setInterval closers inside test bodies, not budgets)
 *   - raw option-object budgets:   a vitest timeout/hookTimeout key paired
 *     with a bare numeric literal instead of a scaledTimeout(...) call
 * It also pins the worker-side coverage handshake: scaledTimeout detects
 * coverage via CZAP_COVERAGE inside workers (argv doesn't carry --coverage
 * there), so vitest.config.ts must keep injecting it via `test.env`.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import fg from 'fast-glob';

const REPO = resolve(import.meta.dirname, '..', '..', '..');

const TEST_SOURCES = fg.sync('tests/**/*.test.ts', { cwd: REPO, absolute: false });

/** Raw numeric trailing-arg timeout: a line that closes a test callback and passes a >=1000ms literal. */
const TRAILING_ARG_TIMEOUT = /^\s*\},\s*([0-9][0-9_]*)\s*\)\s*;/;

/**
 * The multiline trailing-arg form puts the callback's `},` and the budget on
 * separate lines (`it(name,\n  fn,\n  90_000,\n);`) — invisible to the
 * single-line pattern above, which is exactly how a raw 90_000 shipped in
 * the regression lane while this guard stayed green. A standalone numeric
 * line only counts when sandwiched between a callback-closing line and a
 * call-closing line, so numeric array fixtures don't trip it.
 */
const STANDALONE_NUMERIC_ARG = /^\s*([0-9][0-9_]*)\s*,?\s*$/;

/** Raw numeric vitest option-object budget (timeoutMs etc. don't match — vitest keys only). */
const OPTION_TIMEOUT = /\b(timeout|hookTimeout|testTimeout)\s*:\s*([0-9][0-9_]*)/;

const asNumber = (literal: string): number => Number(literal.replace(/_/g, ''));

describe('timeout policy — explicit test timeouts use scaledTimeout', () => {
  it('no test file passes a raw >=1000ms trailing-arg timeout literal', () => {
    const offenders: string[] = [];
    for (const file of TEST_SOURCES) {
      const lines = readFileSync(resolve(REPO, file), 'utf8').split('\n');
      const trimmed = lines.map((line) => line.trim());
      lines.forEach((line, i) => {
        const m = TRAILING_ARG_TIMEOUT.exec(line);
        if (m && asNumber(m[1]!) >= 1000) offenders.push(`${file}:${i + 1} — ${line.trim()}`);

        const standalone = STANDALONE_NUMERIC_ARG.exec(line);
        if (standalone && asNumber(standalone[1]!) >= 1000) {
          const prev = trimmed.slice(0, i).filter(Boolean).at(-1);
          const next = trimmed.slice(i + 1).find(Boolean);
          if (prev?.endsWith('},') && next?.startsWith(')')) {
            offenders.push(`${file}:${i + 1} — ${line.trim()}`);
          }
        }
      });
    }
    expect(offenders, 'wrap the literal in scaledTimeout(...) from vitest.shared.ts').toEqual([]);
  });

  it('no test file passes a raw >=1000ms vitest option-object timeout literal', () => {
    const offenders: string[] = [];
    for (const file of TEST_SOURCES) {
      const lines = readFileSync(resolve(REPO, file), 'utf8').split('\n');
      lines.forEach((line, i) => {
        const m = OPTION_TIMEOUT.exec(line);
        if (m && asNumber(m[2]!) >= 1000) offenders.push(`${file}:${i + 1} — ${line.trim()}`);
      });
    }
    expect(offenders, 'wrap the literal in scaledTimeout(...) from vitest.shared.ts').toEqual([]);
  });

  it('vitest.config.ts keeps the CZAP_COVERAGE worker handshake and scaledTimeout defaults', () => {
    const config = readFileSync(resolve(REPO, 'vitest.config.ts'), 'utf8');
    expect(config).toContain('CZAP_COVERAGE');
    expect(config).toContain('testTimeout: scaledTimeout(');
    expect(config).toContain('hookTimeout: scaledTimeout(');
  });

  it('vitest.browser.config.ts sets lane-wide scaledTimeout budgets (browser tests cannot import the helper)', () => {
    const config = readFileSync(resolve(REPO, 'vitest.browser.config.ts'), 'utf8');
    expect(config).toContain('testTimeout: scaledTimeout(');
    expect(config).toContain('hookTimeout: scaledTimeout(');
  });
});

describe('scaledTimeout semantics', () => {
  it('returns the base budget untouched outside coverage at scale 1', async () => {
    const { scaledTimeout } = await import('../../../vitest.shared.js');
    // Test workers receive CZAP_COVERAGE from test.env; pin both arms by
    // saving and forcing the env rather than assuming which lane runs us.
    const saved = { coverage: process.env['CZAP_COVERAGE'], scale: process.env['CZAP_TEST_TIMEOUT_SCALE'] };
    try {
      process.env['CZAP_COVERAGE'] = '0';
      delete process.env['CZAP_TEST_TIMEOUT_SCALE'];
      expect(scaledTimeout(15_000)).toBe(15_000);
      process.env['CZAP_TEST_TIMEOUT_SCALE'] = '3';
      expect(scaledTimeout(15_000)).toBe(45_000);
      process.env['CZAP_TEST_TIMEOUT_SCALE'] = 'garbage';
      expect(scaledTimeout(15_000)).toBe(15_000);
    } finally {
      if (saved.coverage === undefined) delete process.env['CZAP_COVERAGE'];
      else process.env['CZAP_COVERAGE'] = saved.coverage;
      if (saved.scale === undefined) delete process.env['CZAP_TEST_TIMEOUT_SCALE'];
      else process.env['CZAP_TEST_TIMEOUT_SCALE'] = saved.scale;
    }
  });

  it('clamps every explicit budget to the coverage floor when coverage is on', async () => {
    const { scaledTimeout, COVERAGE_TIMEOUT_FLOOR_MS } = await import('../../../vitest.shared.js');
    const saved = process.env['CZAP_COVERAGE'];
    try {
      process.env['CZAP_COVERAGE'] = '1';
      // The 0.1.5 flake shape: an explicit 60s budget must NOT undercut the floor.
      expect(scaledTimeout(60_000)).toBe(COVERAGE_TIMEOUT_FLOOR_MS);
      expect(scaledTimeout(COVERAGE_TIMEOUT_FLOOR_MS + 1)).toBe(COVERAGE_TIMEOUT_FLOOR_MS + 1);
    } finally {
      if (saved === undefined) delete process.env['CZAP_COVERAGE'];
      else process.env['CZAP_COVERAGE'] = saved;
    }
  });
});
