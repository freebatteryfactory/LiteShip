/** Clean-checkout execution contract for the pre-build CI planner. @module */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { forbiddenSourceImportClosure } from '../../../scripts/lib/source-import-contract.js';

const WORKSPACE_RUNTIME_RULES = [
  { pattern: /^@liteship\//u, reason: 'workspace runtime package' },
  { pattern: /(?:^|\/)dist(?:\/|$)/u, reason: 'built output' },
] as const;

describe('CI plan pre-build import closure', () => {
  it('contains no runtime dependency on a built workspace package or dist artifact', () => {
    expect(forbiddenSourceImportClosure(process.cwd(), 'scripts/ci-plan.ts', [...WORKSPACE_RUNTIME_RULES])).toEqual([]);
  });

  it('builds before any plan-stage entrypoint whose import closure needs workspace runtime packages', () => {
    const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
    const matrixIndex = workflow.indexOf('name: Emit the registry-projected lane matrix');
    const buildIndex = workflow.indexOf('name: Build workspace dependencies for the assurance-aware affected selector');
    const affectedIndex = workflow.indexOf('name: Emit the conservative affected-test plan');
    expect(matrixIndex).toBeGreaterThan(-1);
    expect(affectedIndex).toBeGreaterThan(matrixIndex);

    const affectedRuntimeImports = forbiddenSourceImportClosure(
      process.cwd(),
      'scripts/affected-plan.ts',
      WORKSPACE_RUNTIME_RULES,
    );
    if (affectedRuntimeImports.length > 0) {
      expect(buildIndex).toBeGreaterThan(matrixIndex);
      expect(buildIndex).toBeLessThan(affectedIndex);
      expect(workflow.slice(buildIndex, affectedIndex)).toContain('run: pnpm run build');
    }
  });
});
