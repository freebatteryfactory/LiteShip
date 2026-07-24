/**
 * Timeout-policy source guard — explicit vitest timeouts must go through
 * `scaledTimeout` (vitest.shared.ts).
 *
 * Why this exists: under `--coverage` the config default is the 240s floor,
 * so a raw per-test literal like `}, 60_000)` silently LOWERS the budget and
 * turns an honest instrumented run into a flake (the audit-floor suite hit
 * exactly this during the 0.1.5 release). `scaledTimeout` clamps coverage
 * runs to the floor and honors `LITESHIP_TEST_TIMEOUT_SCALE` on loaded machines,
 * so an explicit timeout can only ever raise the budget.
 *
 * The guard reads test sources (B1/B2/B5 source-guard idiom) and rejects:
 *   - raw trailing-arg timeouts:   `}, 90_000);`   (>= 1s — smaller values
 *     are setTimeout/setInterval closers inside test bodies, not budgets)
 *   - raw option-object budgets:   a vitest timeout/hookTimeout key paired
 *     with a bare numeric literal instead of a scaledTimeout(...) call
 * It also pins the worker-side coverage handshake: scaledTimeout detects
 * coverage via LITESHIP_COVERAGE inside workers (argv doesn't carry --coverage
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

  it('vitest.config.ts keeps the LITESHIP_COVERAGE worker handshake and scaledTimeout defaults', () => {
    const config = readFileSync(resolve(REPO, 'vitest.config.ts'), 'utf8');
    expect(config).toContain('LITESHIP_COVERAGE');
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
  // The env/clamp arms pin deterministic budgets, so they DISABLE the live
  // auto-contention scale (LITESHIP_TEST_TIMEOUT_AUTOSCALE=0) — otherwise the host's
  // real load average would multiply the expected value. The auto-contention law
  // itself is pinned separately (the pure contentionScaleFor below).
  it('returns the base budget untouched outside coverage at scale 1 (autoscale off)', async () => {
    const { scaledTimeout } = await import('../../../vitest.shared.js');
    const saved = {
      coverage: process.env['LITESHIP_COVERAGE'],
      scale: process.env['LITESHIP_TEST_TIMEOUT_SCALE'],
      auto: process.env['LITESHIP_TEST_TIMEOUT_AUTOSCALE'],
    };
    try {
      process.env['LITESHIP_COVERAGE'] = '0';
      process.env['LITESHIP_TEST_TIMEOUT_AUTOSCALE'] = '0';
      delete process.env['LITESHIP_TEST_TIMEOUT_SCALE'];
      expect(scaledTimeout(15_000)).toBe(15_000);
      process.env['LITESHIP_TEST_TIMEOUT_SCALE'] = '3';
      expect(scaledTimeout(15_000)).toBe(45_000);
      process.env['LITESHIP_TEST_TIMEOUT_SCALE'] = 'garbage';
      expect(scaledTimeout(15_000)).toBe(15_000);
    } finally {
      restoreEnv('LITESHIP_COVERAGE', saved.coverage);
      restoreEnv('LITESHIP_TEST_TIMEOUT_SCALE', saved.scale);
      restoreEnv('LITESHIP_TEST_TIMEOUT_AUTOSCALE', saved.auto);
    }
  });

  it('clamps every explicit budget to the coverage floor when coverage is on (autoscale off)', async () => {
    const { scaledTimeout, COVERAGE_TIMEOUT_FLOOR_MS } = await import('../../../vitest.shared.js');
    const saved = { coverage: process.env['LITESHIP_COVERAGE'], auto: process.env['LITESHIP_TEST_TIMEOUT_AUTOSCALE'] };
    try {
      process.env['LITESHIP_COVERAGE'] = '1';
      process.env['LITESHIP_TEST_TIMEOUT_AUTOSCALE'] = '0';
      // The 0.1.5 flake shape: an explicit 60s budget must NOT undercut the floor.
      expect(scaledTimeout(60_000)).toBe(COVERAGE_TIMEOUT_FLOOR_MS);
      expect(scaledTimeout(COVERAGE_TIMEOUT_FLOOR_MS + 1)).toBe(COVERAGE_TIMEOUT_FLOOR_MS + 1);
    } finally {
      restoreEnv('LITESHIP_COVERAGE', saved.coverage);
      restoreEnv('LITESHIP_TEST_TIMEOUT_AUTOSCALE', saved.auto);
    }
  });

  it('contentionScaleFor scales the budget by host oversubscription (load ÷ cores), clamped', async () => {
    const { contentionScaleFor, MAX_AUTO_TIMEOUT_SCALE } = await import('../../../vitest.shared.js');
    // Idle / spare capacity → never shrinks below 1 (a true hang still fails fast).
    expect(contentionScaleFor(0, 8)).toBe(1);
    expect(contentionScaleFor(2, 8)).toBe(1); // load below cores
    expect(contentionScaleFor(8, 8)).toBe(1); // exactly saturated
    // Oversubscribed → proportional headroom.
    expect(contentionScaleFor(16, 8)).toBe(2);
    expect(contentionScaleFor(12, 4)).toBe(3);
    // Pathological load is capped so it can never mask a real hang.
    expect(contentionScaleFor(10_000, 4)).toBe(MAX_AUTO_TIMEOUT_SCALE);
    // No real load average (Windows reports 0) or a garbage reading → 1.
    expect(contentionScaleFor(Number.NaN, 4)).toBe(1);
    expect(contentionScaleFor(-1, 4)).toBe(1);
  });

  it('the auto-contention scale is a FLOOR under the manual env scale (whichever is larger wins)', async () => {
    const { scaledTimeout, contentionScaleFor } = await import('../../../vitest.shared.js');
    const os = await import('node:os');
    const saved = {
      coverage: process.env['LITESHIP_COVERAGE'],
      scale: process.env['LITESHIP_TEST_TIMEOUT_SCALE'],
      auto: process.env['LITESHIP_TEST_TIMEOUT_AUTOSCALE'],
    };
    try {
      process.env['LITESHIP_COVERAGE'] = '0';
      delete process.env['LITESHIP_TEST_TIMEOUT_AUTOSCALE']; // auto ON — read the live host
      const live = contentionScaleFor(os.loadavg()[0] ?? 0, os.cpus().length);
      // With no manual scale, the budget is the base × the live auto scale (>= base).
      delete process.env['LITESHIP_TEST_TIMEOUT_SCALE'];
      expect(scaledTimeout(10_000)).toBe(10_000 * live);
      expect(scaledTimeout(10_000)).toBeGreaterThanOrEqual(10_000);
      // A manual scale ABOVE the live auto wins; one BELOW is floored by auto.
      process.env['LITESHIP_TEST_TIMEOUT_SCALE'] = String(Math.ceil(live) + 5);
      expect(scaledTimeout(10_000)).toBe(10_000 * (Math.ceil(live) + 5));
    } finally {
      restoreEnv('LITESHIP_COVERAGE', saved.coverage);
      restoreEnv('LITESHIP_TEST_TIMEOUT_SCALE', saved.scale);
      restoreEnv('LITESHIP_TEST_TIMEOUT_AUTOSCALE', saved.auto);
    }
  });
});

/** Restore an env var to a saved value (delete when it was previously unset). */
function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
