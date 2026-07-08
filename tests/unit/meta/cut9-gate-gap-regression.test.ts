/**
 * CUT 9 gate-gap regressions — deterministic guards for meta-patterns burned in
 * Phase B (cuts 8 / 8.1 / 9-in-flight). Each test pins a repo-wide law that
 * pre-commit or a named subset can miss but the full CI gate / suite catches.
 *
 * @module
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { detectSkipsAST } from '@czap/audit';
import { sanctionedSkipFor } from '@czap/gauntlet';
import { CI_PARALLEL_PREFLIGHT_LABELS } from '../../../packages/cli/src/gauntlet-phases.js';

const REPO = resolve(import.meta.dirname, '..', '..', '..');

describe('CUT 9 — gate-gap regressions (pre-commit ⊂ full CI)', () => {
  test('pre-commit omits check:gates but CI parallel preflight includes it', () => {
    const preCommit = readFileSync(resolve(REPO, 'scripts/pre-commit.sh'), 'utf8');
    expect(preCommit).not.toContain('check:gates');
    expect(CI_PARALLEL_PREFLIGHT_LABELS).toContain('check:gates');
    expect(CI_PARALLEL_PREFLIGHT_LABELS).toContain('docs:check');
  });

  test('docs:build uses the monolith typedoc generator (same family as docs:check)', () => {
    const pkg = JSON.parse(readFileSync(resolve(REPO, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts['docs:build']).toContain('typedoc');
    expect(pkg.scripts['docs:build']).not.toContain('build-api-docs');
    expect(pkg.scripts['docs:build:sharded']).toContain('build-api-docs');
  });

  test('doctor consumer-app fs test injects EACCES via mock — no unsanctioned skipIf', () => {
    const rel = 'tests/unit/cli/commands/doctor-consumer-app-fs.test.ts';
    const text = readFileSync(resolve(REPO, rel), 'utf8');
    expect(text).toContain('readFileSyncMock');
    expect(text).toContain('forced EACCES');

    const blocking = detectSkipsAST(text)
      .filter((skip) => sanctionedSkipFor(rel, text.split('\n')[skip.line - 1] ?? '', skip.conditional) === undefined)
      .map((skip) => `${rel}:${skip.line}`);
    expect(blocking).toEqual([]);
  });

  test('consumer-app-audit normalizes CRLF and repo paths before sink scan (Windows-smoke law)', () => {
    const text = readFileSync(resolve(REPO, 'packages/cli/src/lib/consumer-app-audit.ts'), 'utf8');
    expect(text).toContain('normalizeSourceLines');
    expect(text).toContain('normalizeRepoPath');
  });
});
