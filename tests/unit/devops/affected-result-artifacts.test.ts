/** Durable-result laws for every affected PR execution lane. */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../vitest.shared.js';

const workflow = readFileSync(`${repoRoot}/.github/workflows/ci.yml`, 'utf8');

function job(name: string, next: string): string {
  const pattern = new RegExp(`\\n  ${name}:\\n([\\s\\S]*?)\\n  ${next}:`, 'u');
  const body = pattern.exec(workflow)?.[1];
  if (body === undefined) throw new TypeError(`workflow job ${name} is missing or moved after ${next}`);
  return body;
}

describe('affected PR result artifacts', () => {
  it('persists Linux execution state even when quick fails before Vitest runs', () => {
    const body = job('pr-affected', 'pr-browser-affected');
    expect(body).toContain('LITESHIP_AFFECTED_OUTCOME_QUICK: ${{ steps.quick.outcome }}');
    expect(body).toContain('LITESHIP_AFFECTED_OUTCOME_VITEST: ${{ steps.vitest.outcome }}');
    expect(body).toContain('LITESHIP_AFFECTED_OUTCOME_BENCHMARK: ${{ steps.benchmark.outcome }}');
    expect(body).toContain('LITESHIP_AFFECTED_PLAN_ID: ${{ needs.plan.outputs.affected-plan-id }}');
    expect(body).toContain('reports/affected-result-pr-linux.json');
    expect(body).toContain('LITESHIP_AFFECTED_JUNIT_PATH: reports/vitest-results-pr-affected.xml');
    expect(body).toMatch(/name: Upload affected Linux test evidence\s+if: always\(\)/u);
    expect(body).toContain('reports/vitest-results-pr-affected.xml');
    expect(body).toContain('if-no-files-found: error');
  });

  it('independently consumes the selected lane receipts before the PR summary can pass', () => {
    const body = job('pr-affected-evidence', 'truth-linux');
    expect(body).toContain('scripts/verify-affected-result-evidence.ts');
    expect(body).toContain('reports/affected-result-admission.json');
    expect(body).toContain("if: needs.plan.outputs.affected-browser-required == 'true'");
    const summary = job('ci-summary', 'delivery-evidence-collect');
    expect(summary).toContain('- pr-affected-evidence');
    expect(summary).toContain('test "$PR_EVIDENCE" = "success"');
  });

  it('persists browser Vitest and Playwright evidence even when either authority fails', () => {
    const body = job('pr-browser-affected', 'pr-windows-affected');
    expect(body).toContain('--outputFile.junit=reports/vitest-results-pr-browser-affected.xml');
    expect(body).toContain('PLAYWRIGHT_JUNIT_OUTPUT_FILE: reports/playwright-results-pr-browser-affected.xml');
    expect(body).toContain('reports/affected-result-pr-browser.json');
    expect(body).toContain('LITESHIP_AFFECTED_OUTCOME_E2E: ${{ steps.e2e.outcome }}');
    expect(body).toMatch(/name: Upload affected browser test evidence\s+if: always\(\)/u);
    expect(body).toContain('reports/vitest-results-pr-browser-affected.xml');
    expect(body).toContain('reports/playwright-results-pr-browser-affected.xml');
    expect(body).toContain('if-no-files-found: error');
  });

  it('treats a missing Windows JUnit file as failed proof rather than an advisory upload', () => {
    const body = job('pr-windows-affected', 'pr-affected-evidence');
    expect(body).toContain('LITESHIP_AFFECTED_JUNIT_PATH: reports/vitest-results-pr-windows-affected.xml');
    expect(body).toContain('reports/affected-result-pr-windows.json');
    expect(body).toContain('LITESHIP_AFFECTED_OUTCOME_VITEST: ${{ steps.vitest.outcome }}');
    expect(body).toMatch(/name: Upload affected Windows test evidence\s+if: always\(\)/u);
    expect(body).toContain('if-no-files-found: error');
  });
});
