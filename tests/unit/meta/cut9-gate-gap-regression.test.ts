/**
 * CUT 9 gate-gap regressions — deterministic guards for meta-patterns burned in
 * Phase B (cuts 8 / 8.1 / 9-in-flight). Each test pins a repo-wide law that
 * pre-commit or a named subset can miss but the full CI gate / suite catches.
 *
 * @module
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { detectSkipsAST } from '@liteship/audit';
import { CHECK_REGISTRY } from '@liteship/command';
import { sanctionedSkipFor } from '@liteship/gauntlet';
import { projectRepositoryQuickSteps } from '../../../scripts/lib/local-verification-plan.js';
import {
  CI_PARALLEL_PREFLIGHT_LABELS,
  CI_PARALLEL_FINAL_LABELS,
  LOCAL_SAFE_LABELS,
  gauntletPhaseProfiles,
} from '../../../packages/cli/src/gauntlet-phases.js';

const REPO = resolve(import.meta.dirname, '..', '..', '..');

describe('CUT 9 — gate-gap regressions (pre-commit ⊂ full CI)', () => {
  test('pre-commit projects the complete blocking quick profile while CI adds release-only gates', () => {
    const expected = CHECK_REGISTRY.filter(
      (check) =>
        check.authority === 'blocking' && check.profiles.includes('quick') && check.contexts.includes('repository'),
    ).map((check) => check.id);
    expect(projectRepositoryQuickSteps().map((step) => step.checkId)).toEqual(expected);
    expect(CI_PARALLEL_PREFLIGHT_LABELS).toContain('check:gates');
    expect(CI_PARALLEL_PREFLIGHT_LABELS).toContain('docs:check');
  });

  test('local-safe profile exists and runs capsule:compile before test', () => {
    expect(gauntletPhaseProfiles['local-safe']).toEqual(LOCAL_SAFE_LABELS);
    const labels = LOCAL_SAFE_LABELS;
    expect(labels.indexOf('capsule:compile')).toBeLessThan(
      labels.indexOf('test (unit + component + property + integration)'),
    );
    expect(labels).not.toContain('docs:check');
    expect(labels).toContain('standards:gate');
    expect(labels).toContain('capability:gate');
    expect(CI_PARALLEL_FINAL_LABELS).toContain('standards:gate');
    expect(CI_PARALLEL_FINAL_LABELS).toContain('capability:gate');
  });

  test('docs:build and docs:check route through resource-admitted TypeDoc owners', () => {
    const pkg = JSON.parse(readFileSync(resolve(REPO, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    const buildOwner = readFileSync(resolve(REPO, 'scripts/docs-build.ts'), 'utf8');
    const checkOwner = readFileSync(resolve(REPO, 'scripts/docs-check.ts'), 'utf8');
    expect(pkg.scripts['docs:build']).toContain('scripts/docs-build.ts');
    expect(pkg.scripts['docs:check']).toContain('scripts/docs-check.ts');
    expect(pkg.scripts['docs:build']).not.toContain('build-api-docs');
    expect(pkg.scripts['docs:build:sharded']).toContain('build-api-docs');
    for (const owner of [buildOwner, checkOwner]) {
      expect(owner).toContain('awaitLocalDocsAdmission');
      expect(owner).toContain("['exec', 'typedoc'");
    }
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

  test('doctor command tests have no unsanctioned skipIf (skip-law sample)', () => {
    const dir = resolve(REPO, 'tests/unit/cli/commands');
    const blocking: string[] = [];
    for (const file of readdirSync(dir).filter((f) => f.startsWith('doctor-') && f.endsWith('.test.ts'))) {
      const rel = `tests/unit/cli/commands/${file}`;
      const text = readFileSync(resolve(REPO, rel), 'utf8');
      for (const skip of detectSkipsAST(text)) {
        if (sanctionedSkipFor(rel, text.split('\n')[skip.line - 1] ?? '', skip.conditional) === undefined) {
          blocking.push(`${rel}:${skip.line}`);
        }
      }
    }
    expect(blocking).toEqual([]);
  });

  test('consumer-app-audit normalizes CRLF and repo paths before sink scan (Windows-smoke law)', () => {
    const text = readFileSync(resolve(REPO, 'packages/cli/src/internal/consumer-app-audit.ts'), 'utf8');
    expect(text).toContain('normalizeSourceLines');
    expect(text).toContain('normalizeRepoPath');
  });

  test('B5b cage — doctor probes avoid inline path slash normalizers', () => {
    for (const rel of [
      'packages/cli/src/commands/doctor/probes-workers-date.ts',
      'packages/cli/src/commands/doctor/probes-deployed.ts',
    ]) {
      const text = readFileSync(resolve(REPO, rel), 'utf8');
      expect(text).not.toMatch(/replace\s*\(\s*\/\\\/g/);
      expect(text).not.toMatch(/replace\s*\(\s*\/\[\\\\\/\]/);
    }
  });

  test('deployed probe pins DNS at connect (pin-and-connect law)', () => {
    const text = readFileSync(resolve(REPO, 'packages/cli/src/commands/doctor/probes-deployed.ts'), 'utf8');
    expect(text).toContain('pinnedDispatcher');
    expect(text).toContain('dns/promises');
    expect(text).toMatch(/rebinding|pinned/i);
    expect(text).toContain('await agent.close()');
  });

  test('realrepo-skip-proof guards unsanctioned skips in the live tree', () => {
    const text = readFileSync(resolve(REPO, 'tests/unit/audit/realrepo-skip-proof.test.ts'), 'utf8');
    expect(text).toContain('unsanctioned skips');
    expect(text).toContain('detectSkipsAST');
  });
});
