import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { gauntletPhaseLabels } from '../../../packages/cli/src/gauntlet-phases.js';

const repoRoot = resolve(import.meta.dirname, '..', '..', '..');

const packageJson = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

describe('gauntlet ordering', () => {
  test('full gauntlet uses the orchestrator (the single canonical executor)', () => {
    expect(packageJson.scripts['gauntlet:full']).toBe('tsx scripts/gauntlet.ts');
    // CUT D8: gauntlet:serial (a hand-maintained, drifted && shell-chain copy that
    // nothing executed) was deleted — gauntlet:full is the one serial executor.
    expect(packageJson.scripts['gauntlet:serial']).toBeUndefined();
  });

  test('feedback verifier is available as a root script', () => {
    expect(packageJson.scripts['feedback:verify']).toBe('pnpm exec tsx scripts/feedback-verify.ts');
    expect(packageJson.scripts['runtime:gate']).toBe('pnpm exec tsx scripts/runtime-gate.ts');
  });

  test('flex:verify roll-up acceptance script is available as a root script', () => {
    expect(packageJson.scripts['flex:verify']).toBe('pnpm exec tsx scripts/flex-verify.ts');
  });

  test('flake, reality, and satellite scan lanes are available as root scripts', () => {
    expect(packageJson.scripts['test:flake']).toBe('pnpm exec tsx scripts/test-flake.ts');
    expect(packageJson.scripts['bench:reality']).toBe('pnpm run build && tsx scripts/bench-reality.ts');
    expect(packageJson.scripts['report:satellite-scan']).toBe('pnpm exec tsx scripts/report-satellite-scan.ts');
  });

  // ── The raccoon-rule backstop must actually RUN in CI over the real repo ──────
  // The standards-integrity gate (the agent-safety meta-gauntlet) was previously
  // exercised ONLY by unit tests with an INJECTED hermetic gitShow. A correct gate
  // that nothing runs over the real repo is a hole. These guards pin the wiring that
  // closes it — the root script, the canonical gauntlet phase, and the CI workflow's
  // fetch-depth + base-ref handling — so a future edit cannot silently un-wire it.

  test('the standards-integrity gate is a root script (the raccoon-rule backstop over the real repo)', () => {
    expect(packageJson.scripts['standards:gate']).toBe('pnpm exec tsx scripts/standards-integrity-gate.ts');
  });

  test('the standards:gate phase is in the canonical gauntlet:full sequence (so it RUNS over the real repo)', () => {
    expect(gauntletPhaseLabels()).toContain('standards:gate');
  });

  test('the standards-integrity script runs the REAL base-ref path (defaultGitShow, not an injected reader)', () => {
    // The unit-test fixture injects a hermetic gitShow; the SCRIPT must NOT — it must
    // exercise resolveStandardsBaseRef → readBaseSnapshot via the real `git show`. We
    // pin that the script calls buildStandardsIntegrityFacts WITHOUT a `standards`
    // injection seam (no gitShow override), so the production defaultGitShow is used.
    const src = readFileSync(resolve(repoRoot, 'scripts', 'standards-integrity-gate.ts'), 'utf8');
    expect(src).toContain('buildStandardsIntegrityFacts(root, now)');
    expect(src).toContain('resolveStandardsBaseRef()');
    // No injected gitShow / standards seam in the script's extractor call — the real path.
    expect(src).not.toMatch(/buildStandardsIntegrityFacts\([^)]*gitShow/);
  });

  test('CI runs the standards:gate over the real repo with a fetched base ref (not a default shallow checkout)', () => {
    const ci = readFileSync(resolve(repoRoot, '.github', 'workflows', 'ci.yml'), 'utf8');
    // The truth-linux lane (the one that runs gauntlet:full) must fetch full history so
    // `git show <base>:traceability/standards-snapshot.json` resolves (else fail-closed).
    expect(ci).toContain('fetch-depth: 0');
    // It must set LITESHIP_STANDARDS_BASE_REF deterministically — the PR base for a
    // pull_request; `github.event.before` (the SHA the ref pointed at BEFORE the push) for
    // a push, so the diff covers the ENTIRE pushed range and an earlier-commit weakening in
    // a multi-commit push cannot sail through (the HEAD~1 form only caught the LAST commit).
    // The PR base flows through an `env:` var and is referenced as `$BASE_REF` in the shell
    // (never spliced as `${{ github.base_ref }}` inside `run:`) — the template-injection-safe
    // form; pin both halves so the safe indirection can't silently regress to interpolation.
    expect(ci).toContain('BASE_REF: ${{ github.base_ref }}');
    expect(ci).toContain('LITESHIP_STANDARDS_BASE_REF=origin/$BASE_REF');
    expect(ci).toContain('PUSH_BEFORE: ${{ github.event.before }}');
    expect(ci).toContain('LITESHIP_STANDARDS_BASE_REF=$BASE');
    // The legacy HEAD~1 push base (which MISSED earlier-commit weakenings in a multi-commit
    // push) must be GONE — a regression guard so it cannot creep back.
    expect(ci).not.toContain('LITESHIP_STANDARDS_BASE_REF=HEAD~1');
    // The brand-new-branch bootstrap must be handled fail-closed: the all-zeros sentinel is
    // detected and falls back to the merge-base with main (else the zero-SHA fails closed).
    expect(ci).toContain('0000000000000000000000000000000000000000');
    expect(ci).toContain('git merge-base origin/main HEAD');
  });
});
