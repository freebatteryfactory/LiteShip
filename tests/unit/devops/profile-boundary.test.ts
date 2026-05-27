/**
 * CUT D7b — the DevopsProfile boundary is executable (ADR-0012).
 *
 * `@czap/audit`'s `DevopsProfile` is THE reusable devops seam. D7 ruled "only fields
 * the audit consumes — no aspirational fields"; that law lived only in a comment.
 * These guards make it teeth: the profile keeps exactly its 5 fields, and the
 * repo-local contracts (invariants / coverage / bench / artifact-paths) stay local —
 * they never leak onto the profile or into the published engine surface. The two
 * root-derivation families (checkout-root vs caller-root) stay split.
 *
 * Zero behavior change — pure classification + cage. See ADR-0012.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { liteshipDevopsProfile } from '@czap/audit';

const REPO = resolve(import.meta.dirname, '..', '..', '..');
const read = (rel: string): string => readFileSync(resolve(REPO, rel), 'utf8');

/** Every .ts source under packages/audit/src — the PUBLISHED engine surface. */
const auditEngineSources = (): string[] => {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === 'dist') continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) out.push(full);
    }
  };
  walk(resolve(REPO, 'packages/audit/src'));
  return out;
};

const APPROVED_FIELDS = ['repoRoot', 'internalPackagePrefix', 'packageTopology', 'dynamicImportExemptions', 'surfacePolicy'];

describe('D7b — DevopsProfile has exactly the approved fields (no aspirational drift)', () => {
  it('the default profile carries exactly the 5 approved fields', () => {
    expect(Object.keys(liteshipDevopsProfile).sort()).toEqual([...APPROVED_FIELDS].sort());
  });

  it('the DevopsProfile interface declares the 5 approved fields and NO devops-junk-drawer field', () => {
    const src = read('packages/audit/src/devops-profile.ts');
    const body = src.match(/export interface DevopsProfile \{([\s\S]*?)\n\}/)?.[1];
    expect(body, 'DevopsProfile interface must be findable').toBeTruthy();
    for (const f of APPROVED_FIELDS) {
      expect(body!, `DevopsProfile must declare ${f}`).toMatch(new RegExp(`readonly\\s+${f}\\b`));
    }
    // The instant someone adds one of these as a profile field, this fails (ADR-0012).
    expect(body!).not.toMatch(/readonly\s+(invariants|coverage|bench|artifactPaths?|reportPaths|thresholds)\b/);
  });
});

describe('D7b — repo-local contracts stay local (not threaded through the profile, not in the engine)', () => {
  // The published audit engine must not reference any of the LiteShip-local contracts.
  const FORBIDDEN_IN_ENGINE = ['invariants', 'coverageExclude', 'directivePairs', 'DIRECTIVE_BENCH_PAIRS', 'reportPaths'];
  it('the published @czap/audit engine surface references none of the local contracts', () => {
    const offenders: string[] = [];
    for (const file of auditEngineSources()) {
      const src = readFileSync(file, 'utf8');
      for (const term of FORBIDDEN_IN_ENGINE) {
        if (src.includes(term)) offenders.push(`${file.replace(/\\/g, '/').replace(`${REPO.replace(/\\/g, '/')}/`, '')}: ${term}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('invariants are a repo-local rule set in scripts/check-invariants.ts', () => {
    expect(existsSync(resolve(REPO, 'scripts/check-invariants.ts'))).toBe(true);
    expect(read('scripts/check-invariants.ts')).toMatch(/INVARIANTS/);
  });

  it('coverage thresholds/globs are repo-local consts in vitest.shared.ts', () => {
    expect(read('vitest.shared.ts')).toMatch(/export const coverageExclude/);
  });

  it('bench is product-shaped: the directive suite value-imports and executes the CZAP runtime', () => {
    const suite = read('scripts/bench/directive-suite.ts');
    // It imports the framework itself — there is nothing off-product to make configurable.
    expect(suite).toMatch(/from '@czap\/core'/);
  });

  it('artifact/report paths are repo-local in scripts/audit/policy.ts (D9b-1), not the engine', () => {
    expect(read('scripts/audit/policy.ts')).toMatch(/reportPaths/);
  });
});

describe('D7b — the two root-derivation families stay split (no "one root to rule them all")', () => {
  it('the engine profile derives caller-root from process.cwd(), not the checkout (import.meta)', () => {
    const src = read('packages/audit/src/devops-profile.ts');
    expect(src).toMatch(/process\.cwd\(\)/); // caller-root family
    expect(src).not.toMatch(/import\.meta/); // must NOT reach for the checkout root
  });

  it('the checkout-root family lives in repo machinery (scripts), import.meta-derived', () => {
    expect(read('scripts/audit/shared.ts')).toMatch(/import\.meta\.dirname/);
  });
});
