/**
 * Meta-test for the plumb-completeness gate (scripts/plumb-gate.ts).
 *
 * HARD RULE (no exceptions): a placeholder is BLOCKING. The gate fails on ANY
 * `it.skip`/`test.skip` in `tests/generated/` (an unwired capsule binding shipping
 * green) and on any published package missing a PACKAGE_PLUMB classification.
 *
 * This pins the gate's MECHANISM via throwaway fixture roots so the gate can't rot.
 * It deliberately does NOT assert the live repo tree is clean — while capsule
 * bindings are being wired, the live `plumb:gate` phase is RED by design, and that
 * redness is the work-list, not a test failure to paper over.
 */
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runPlumbGate } from '../../../scripts/plumb-gate.js';
import { PACKAGE_PLUMB } from '../../../scripts/plumb-registry.js';

/** Build a throwaway repo root with the given generated test files + packages. */
function fixtureRoot(opts: {
  generated?: Record<string, string>;
  packages?: Record<string, { name?: string; private?: boolean } | null>;
}): string {
  const root = mkdtempSync(join(tmpdir(), 'czap-plumb-'));
  mkdirSync(join(root, 'tests', 'generated'), { recursive: true });
  for (const [name, src] of Object.entries(opts.generated ?? {})) {
    writeFileSync(join(root, 'tests', 'generated', name), src, 'utf8');
  }
  mkdirSync(join(root, 'packages'), { recursive: true });
  for (const [dir, pkg] of Object.entries(opts.packages ?? {})) {
    mkdirSync(join(root, 'packages', dir), { recursive: true });
    if (pkg) writeFileSync(join(root, 'packages', dir, 'package.json'), JSON.stringify(pkg), 'utf8');
  }
  return root;
}

describe('plumb gate — mechanism', () => {
  it('FAILS on a string-literal it.skip placeholder in tests/generated/', () => {
    const root = fixtureRoot({
      generated: { 'probe.test.ts': `it.skip('unwired: needs a real binding', () => {});\n` },
    });
    const r = runPlumbGate(root);
    expect(r.ok).toBe(false);
    expect(r.skips.map((s) => s.message)).toContain('unwired: needs a real binding');
  });

  it('FAILS on a skip hiding in a .bench.ts (lane-aware: EVERY generated lane is scanned)', () => {
    // The lane-aware harness routes the per-frame-budget check into .bench.ts.
    // A placeholder skip there must not escape the gate — same law, every lane.
    const root = fixtureRoot({
      generated: { 'probe.bench.ts': `bench.skip('unwired perf measurement', () => {});\n` },
    });
    const r = runPlumbGate(root);
    expect(r.ok).toBe(false);
    expect(r.skips.map((s) => s.message)).toContain('unwired perf measurement');
    expect(r.skips[0]?.kind).toBe('bench.skip');
  });

  it('FAILS on a computed-message it.skip (the ternary form the harness emits)', () => {
    const root = fixtureRoot({
      generated: {
        'probe.test.ts': `it.skip(\n  cond ? 'invariants — schema not arbitrary-derivable' : 'other',\n  () => {},\n);\n`,
      },
    });
    const r = runPlumbGate(root);
    expect(r.ok).toBe(false);
    expect(r.skips.some((s) => s.message.startsWith('invariants — schema'))).toBe(true);
  });

  it('does NOT match runtime-conditional .skipIf (an honest conditional, not a placeholder)', () => {
    const root = fixtureRoot({
      generated: { 'probe.test.ts': `describe.skipIf(!x)('cond', () => { it('real', () => {}); });\n` },
    });
    expect(runPlumbGate(root).skips).toEqual([]);
  });

  it('passes a clean generated dir (no skips, no unclassified packages)', () => {
    const root = fixtureRoot({
      generated: { 'probe.test.ts': `it('real test', () => { expect(1).toBe(1); });\n` },
    });
    expect(runPlumbGate(root).ok).toBe(true);
  });

  it('FAILS on a published package missing a PACKAGE_PLUMB classification', () => {
    const root = fixtureRoot({ packages: { mystery: { name: '@czap/mystery-unclassified' } } });
    const r = runPlumbGate(root);
    expect(r.unclassified).toContain('@czap/mystery-unclassified');
    expect(r.ok).toBe(false);
  });

  it('ignores a private package (no classification required)', () => {
    const root = fixtureRoot({ packages: { priv: { name: '@czap/priv', private: true } } });
    expect(runPlumbGate(root).unclassified).toEqual([]);
  });
});

describe('plumb registry hygiene', () => {
  it('every deferred package carries a tracking issue (no silent deferral)', () => {
    for (const [name, entry] of Object.entries(PACKAGE_PLUMB)) {
      if (entry.status === 'deferred') {
        expect(entry.issue, `${name} is deferred but has no issue`).toBeTruthy();
      }
      expect(entry.reason.length, `${name} needs a reason`).toBeGreaterThan(0);
    }
  });

  it('scene is plumbed live and stage is a complete build tool as of 0.4.0', () => {
    expect(PACKAGE_PLUMB['@czap/scene']?.status).toBe('runtime');
    expect(PACKAGE_PLUMB['@czap/stage']?.status).toBe('tooling');
  });
});
