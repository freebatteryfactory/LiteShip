/**
 * `liteship check-invariants` adapter — the CLI-only fast-lane invariant gate.
 *
 * Two layers, both the adapter's own in-process logic (the line-ending parsing
 * fns are tested separately in tests/unit/meta/invariant-script.test.ts — this
 * file extends, never duplicates, that coverage):
 *
 *  1. The PURE scan primitives over a real temp fixture tree (deterministic, no
 *     mocks): `findViolations` (banned-pattern hits with repo-relative slash-
 *     normalized file + 1-based line + trimmed content; the `dist`/`node_modules`/
 *     `.d.ts` skips; the exclude prefix; the missing-scoped-dir → empty branch)
 *     and `expectedLineEnding`'s precedence / binary / no-match branches.
 *
 *  2. The ADAPTER projection: with the heavy `@liteship/audit`-backed scan mocked, the
 *     receipt shape, the exit-code mapping, and BOTH pretty-print branches (the
 *     grouped invariant work-list + the line-ending policy section).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INVARIANTS } from '@liteship/command';
import { captureCli } from '../../../integration/cli/capture.js';

// The adapter folds the scan through its injected `spawn` seam (a defaulted param
// on `checkInvariants` → `runCheckInvariantsScan` → `findLineEndingViolations`), so
// the `git ls-files --eol` probe is scripted straight into the adapter — NO
// @liteship/command/host module mock — and the real scan never spawns `git`.
const spawnMock = vi.fn();

import {
  checkInvariants,
  findViolations,
  expectedLineEnding,
  parseLineEndingRules,
} from '../../../../packages/cli/src/commands/check-invariants.js';

afterEach(() => vi.restoreAllMocks());

// ── the pure banned-pattern scan over a real temp tree ───────────────────────

describe('findViolations — banned-pattern scan (real fixture tree)', () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'liteship-invariants-'));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  function write(rel: string, content: string): void {
    const abs = join(root, rel);
    mkdirSync(join(abs, '..'), { recursive: true });
    writeFileSync(abs, content);
  }

  it('reports repo-relative slash-normalized file + 1-based line + trimmed content', () => {
    write('packages/x/src/a.ts', 'const ok = 1;\n  bannedToken();\nconst y = 2;\n');
    const inv = {
      name: 'NO_BANNED',
      message: 'no banned token',
      dirs: ['packages'],
      pattern: /bannedToken/,
    };
    const hits = findViolations(inv, root);
    expect(hits).toEqual([{ file: 'packages/x/src/a.ts', line: 2, content: 'bannedToken();' }]);
  });

  it('skips dist/, node_modules/, and *.d.ts; honors the exclude prefix', () => {
    write('packages/x/src/keep.ts', 'bannedToken();\n');
    write('packages/x/dist/built.ts', 'bannedToken();\n');
    write('packages/x/node_modules/dep.ts', 'bannedToken();\n');
    write('packages/x/src/types.d.ts', 'bannedToken();\n');
    write('packages/x/excluded/skip.ts', 'bannedToken();\n');
    const inv = {
      name: 'NO_BANNED',
      message: 'no banned token',
      dirs: ['packages'],
      pattern: /bannedToken/,
      exclude: ['packages/x/excluded'],
    };
    const hits = findViolations(inv, root);
    expect(hits.map((h) => h.file)).toEqual(['packages/x/src/keep.ts']);
  });

  it('a scoped dir that does not exist contributes zero violations (ENOENT → empty, not crash)', () => {
    const inv = {
      name: 'NO_BANNED',
      message: 'no banned token',
      dirs: ['packages/astro/src/runtime'],
      pattern: /bannedToken/,
    };
    expect(findViolations(inv, root)).toEqual([]);
  });

  it('treats generated CLI fragments as packaged data, while their authored owners remain independently guarded', () => {
    write(
      'packages/cli/fragments/template/default/config.ts',
      'const dep = require("x");\nmodule.exports = dep;\nvar legacy = dep;\nexport default legacy;\n',
    );
    for (const invariant of INVARIANTS) {
      expect(findViolations(invariant, root), invariant.name).toEqual([]);
    }
  });
});

// ── expectedLineEnding precedence + binary + no-match ────────────────────────

describe('expectedLineEnding — last matching .gitattributes rule wins', () => {
  it('returns binary for a binary-tagged pattern, lf/crlf by precedence, null when unmatched', () => {
    const rules = parseLineEndingRules('* text=auto eol=lf\n*.ps1 text eol=crlf\n*.png binary\n');
    expect(expectedLineEnding('assets/logo.png', rules)).toBe('binary');
    expect(expectedLineEnding('scripts/dev.ps1', rules)).toBe('crlf');
    expect(expectedLineEnding('README.md', rules)).toBe('lf');
    // No catch-all `*` rule ⇒ an unmatched path returns null.
    const narrow = parseLineEndingRules('*.ps1 text eol=crlf\n');
    expect(expectedLineEnding('README.md', narrow)).toBeNull();
    expect(expectedLineEnding('', narrow)).toBeNull();
  });
});

// ── the adapter projection (scan mocked) ─────────────────────────────────────

function lastReceipt(stdout: string): Record<string, unknown> {
  return JSON.parse(stdout.trim().split('\n').pop()!) as Record<string, unknown>;
}

describe('liteship check-invariants — adapter projection (scan via injected capability)', () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'liteship-inv-adapter-'));
    // A clean `git ls-files --eol` probe → no line-ending violations by default.
    spawnMock.mockReset().mockResolvedValue({ exitCode: 0, stdout: '' });
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  function write(rel: string, content: string): void {
    const abs = join(root, rel);
    mkdirSync(join(abs, '..'), { recursive: true });
    writeFileSync(abs, content);
  }

  it('a clean fixture root passes the gate (exit 0, ok receipt, no work-list)', async () => {
    write('.gitattributes', '* text=auto eol=lf\n');
    write('packages/x/src/ok.ts', 'export const ok = 1;\n');
    const { exit, stdout, stderr } = await captureCli(() =>
      checkInvariants({ cwd: root, pretty: true }, { spawn: spawnMock }),
    );
    expect(exit).toBe(0);
    const receipt = lastReceipt(stdout);
    expect(receipt).toMatchObject({ command: 'check-invariants', status: 'ok', ok: true });
    expect(receipt['groups']).toEqual([]);
    expect(receipt['lineEndings']).toEqual([]);
    expect(stderr).toBe('');
  });

  it('a banned-pattern violation fails the gate and prints the grouped work-list (pretty)', async () => {
    write('.gitattributes', '* text=auto eol=lf\n');
    // `require(` trips the NO_REQUIRE invariant over the `packages` dir.
    write('packages/x/src/bad.ts', 'const dep = require("x");\n');
    const { exit, stdout, stderr } = await captureCli(() =>
      checkInvariants({ cwd: root, pretty: true }, { spawn: spawnMock }),
    );
    expect(exit).toBe(1);
    const receipt = lastReceipt(stdout);
    expect(receipt['status']).toBe('failed');
    const groups = receipt['groups'] as { name: string; violations: { file: string }[] }[];
    expect(groups.some((g) => g.name === 'NO_REQUIRE')).toBe(true);
    expect(stderr).toContain('[INVARIANT VIOLATION] NO_REQUIRE');
    expect(stderr).toContain('packages/x/src/bad.ts:1');
    expect(stderr).toContain('Invariant check failed.');
  });

  it('a line-ending policy violation fails the gate and prints the LINE_ENDINGS section (pretty)', async () => {
    write('.gitattributes', '* text=auto eol=lf\n');
    write('packages/x/src/ok.ts', 'export const ok = 1;\n');
    // `git ls-files --eol` reports a CRLF-in-index file under an eol=lf policy.
    spawnMock.mockResolvedValue({
      exitCode: 0,
      stdout: 'i/crlf  w/crlf  attr/text=auto \tpackages/x/src/ok.ts\n',
    });
    const { exit, stdout, stderr } = await captureCli(() =>
      checkInvariants({ cwd: root, pretty: true }, { spawn: spawnMock }),
    );
    expect(exit).toBe(1);
    const receipt = lastReceipt(stdout);
    expect(receipt['status']).toBe('failed');
    expect((receipt['lineEndings'] as string[]).length).toBeGreaterThan(0);
    expect(stderr).toContain('[INVARIANT VIOLATION] LINE_ENDINGS');
  });

  it('stays SILENT on stderr when pretty is off (failed receipt still exits 1)', async () => {
    write('.gitattributes', '* text=auto eol=lf\n');
    write('packages/x/src/bad.ts', 'const dep = require("x");\n');
    const { exit, stderr } = await captureCli(() =>
      checkInvariants({ cwd: root, pretty: false }, { spawn: spawnMock }),
    );
    expect(exit).toBe(1);
    expect(stderr).toBe('');
  });
});
