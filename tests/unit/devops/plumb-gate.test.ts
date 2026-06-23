/**
 * Meta-test for the plumb-completeness gate — now the `czap plumb` command
 * (migrated out of `scripts/plumb-gate.ts`). The scan engine is `runPlumbScan`
 * from `@czap/command/host`; the `PACKAGE_PLUMB` ledger is re-exported from
 * `@czap/command`.
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
import { runPlumbScan } from '@czap/command/host';
import { PACKAGE_PLUMB } from '@czap/command';

/** Alias preserving the meta-test's call sites: the gate runs over a repo root. */
const runPlumbGate = runPlumbScan;

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

  it('CATCHES a runtime-conditional .skipIf in a GENERATED test (detector unified with the no-skip gate)', () => {
    // The handoff is now detector-UNIFIED: tests/generated/ uses the SAME alias-aware
    // detectSkips the no-skip gate uses. A generated capsule test must NEVER skip in ANY
    // form — a conditional skip there is a placeholder, not an honest capability gate
    // (the harness emits no conditionals). This was the P2 handoff gap: .skipIf slipped
    // through BOTH plumb (literal-`.skip(` only) AND the no-skip gate (excludes generated).
    const root = fixtureRoot({
      generated: { 'probe.test.ts': `describe.skipIf(!x)('cond', () => { it('real', () => {}); });\n` },
    });
    const r = runPlumbGate(root);
    expect(r.ok).toBe(false);
    expect(r.skips.map((s) => s.kind)).toContain('describe.skipIf');
  });

  it('CATCHES a generated it.runIf (the inverse runtime-conditional) — the P2 handoff hole', () => {
    const root = fixtureRoot({
      generated: { 'probe.test.ts': `it.runIf(FFMPEG)('only when capable', () => {});\n` },
    });
    const r = runPlumbGate(root);
    expect(r.ok).toBe(false);
    expect(r.skips.map((s) => s.kind)).toContain('it.runIf');
  });

  it('CATCHES a generated ALIAS-form skip (`COND ? it : it.skip`) — no call paren, the regex missed it', () => {
    const root = fixtureRoot({
      generated: { 'probe.test.ts': `const maybe = COND ? it : it.skip;\nmaybe('x', () => {});\n` },
    });
    const r = runPlumbGate(root);
    expect(r.ok).toBe(false);
    expect(r.skips.map((s) => s.kind)).toContain('it.skip');
  });

  it('CATCHES a generated ALIASED-ROOT skip (rebind / import-rename / capture / destructure) — codex round-4', () => {
    // The aliased-root evasion: the harness must NEVER emit a rebound/renamed runner that then
    // skips. The per-file alias pre-pass in detectSkips closes it for the generated handoff too.
    const root = fixtureRoot({
      generated: {
        'rebind.test.ts': `const t = it;\nt.skip('rebound skip', () => {});\n`,
        'rename.test.ts': `import { it as spec } from 'vitest';\nspec.skip('renamed skip', () => {});\n`,
        'capture.test.ts': `const skipIt = it.skip;\nskipIt('captured skip', () => {});\n`,
        'destructure.test.ts': `const { skip } = it;\nskip('destructured skip', () => {});\n`,
      },
    });
    const r = runPlumbGate(root);
    expect(r.ok).toBe(false);
    const kinds = r.skips.map((s) => s.kind);
    expect(kinds).toContain('t.skip');
    expect(kinds).toContain('spec.skip');
    expect(kinds).toContain('it.skip');
  });

  it('CATCHES a generated it.todo / xit placeholder', () => {
    const root = fixtureRoot({
      generated: {
        'todo.test.ts': `it.todo('not written yet');\n`,
        'xit.test.ts': `xit('disabled', () => {});\n`,
      },
    });
    const r = runPlumbGate(root);
    expect(r.ok).toBe(false);
    const kinds = r.skips.map((s) => s.kind);
    expect(kinds).toContain('it.todo');
    expect(kinds).toContain('xit');
  });

  it('does NOT flag a PROSE / string mention of it.skip in a generated test (no false positive)', () => {
    // The unified detector runs over codeOnly-stripped text, so a docstring/string mention
    // of a skip token is never a placeholder — the zero-skip guarantee keeps no false reds.
    const root = fixtureRoot({
      generated: {
        'probe.test.ts': `// this capsule never uses it.skip\nit('real', () => { const s = 'it.skip in a string'; expect(s.length).toBeGreaterThan(0); });\n`,
      },
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
