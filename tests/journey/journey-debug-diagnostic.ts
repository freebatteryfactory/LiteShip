/**
 * journey-debug-diagnostic — the "a check is red, now what?" loop a human or a cold
 * agent runs: plant a misconfig, let `liteship check` name it with a STABLE
 * diagnostic code, then `liteship explain <code>` to get an actionable remediation.
 *
 * The misconfig is a bare `throw new Error(...)` under a scratch package-source
 * tree — the exact shape the `gauntlet/no-bare-throw` gate governs. Running the
 * IN-PROCESS gauntlet gate fold (`liteship check gates --json`, `process.cwd()`-scoped to
 * the scratch tree) surfaces a Finding whose `ruleId` is the stable
 * `gauntlet/no-bare-throw` code; `liteship explain gauntlet/no-bare-throw` then
 * resolves it to a non-empty {@link ExplainDiagnostic.remediation}.
 *
 * The profile sweep (`liteship check`) emits registry verdicts; the explicit
 * `check gates` subcommand emits explainable Findings. Keeping those operations
 * explicit prevents the default quick command from silently changing meaning.
 *
 * @module
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { findFiles, journeyAssert, parseReceipt, runInstalledLiteshipCli, type JourneyResult } from './harness.js';

/** The stable diagnostic code the planted bare-throw misconfig must surface. */
const EXPECTED_CODE = 'gauntlet/no-bare-throw';

/** A source file whose bare throw trips the `no-bare-throw` gate (an untagged failure path). */
const MISCONFIG_SOURCE = `export function boom(): void {
  throw new Error('planted misconfig: an untagged failure path');
}
`;

const REMEDIATED_SOURCE = `export function boom(): void {
  // The planted failure had no legitimate error condition, so the safe repair
  // removes the fabricated throw instead of inventing another exception type.
}
`;

export async function journeyDebugDiagnostic(appDir: string): Promise<JourneyResult> {
  const name = 'journey-debug-diagnostic';
  const plantedDir = join(appDir, 'packages', 'planted');
  try {
    // Plant the misconfig inside the glob the gauntlet gate fold walks
    // (DEFAULT_GAUNTLET_GLOBS = `packages/*/src/**/*.ts`), scoped to this scratch cwd.
    const srcDir = join(plantedDir, 'src');
    mkdirSync(srcDir, { recursive: true });
    const plantedPath = join(srcDir, 'bad.ts');
    writeFileSync(plantedPath, MISCONFIG_SOURCE);

    // Run the INSTALLED facade-owned gate fold, cwd-scoped to the planted tree.
    const check = await runInstalledLiteshipCli(['check', 'gates', '--json'], appDir);
    journeyAssert(
      check.code === 1,
      `expected a blocked check (exit 1) over the planted misconfig, got exit ${check.code}\n${check.stderr.slice(-600)}`,
    );
    const receipt = parseReceipt(check.stdout);
    const findings = (receipt['findings'] as ReadonlyArray<{ ruleId?: string }> | undefined) ?? [];
    const ruleIds = new Set(findings.map((f) => f.ruleId));
    journeyAssert(
      ruleIds.has(EXPECTED_CODE),
      `check did not surface the stable code ${EXPECTED_CODE}; saw: [${[...ruleIds].join(', ')}]`,
    );

    // Resolve the code to its remediation — the actionable half of the loop.
    const explain = await runInstalledLiteshipCli(['explain', EXPECTED_CODE, '--json'], appDir);
    journeyAssert(explain.code === 0, `liteship explain ${EXPECTED_CODE} exited ${explain.code}`);
    const explained = parseReceipt(explain.stdout);
    journeyAssert(
      explained['kind'] === 'diagnostic',
      `explain resolved ${EXPECTED_CODE} as ${String(explained['kind'])}, not a diagnostic`,
    );
    const diagnostic = explained['diagnostic'] as { remediation?: unknown } | null;
    const remediation = diagnostic?.remediation;
    journeyAssert(
      typeof remediation === 'string' && remediation.trim().length > 0,
      `ExplainDiagnostic.remediation is empty for ${EXPECTED_CODE}`,
    );
    journeyAssert((remediation as string).length <= 2_000, `remediation for ${EXPECTED_CODE} is unbounded`);

    writeFileSync(plantedPath, REMEDIATED_SOURCE);
    const correctedCheck = await runInstalledLiteshipCli(['check', 'gates', '--json'], appDir);
    journeyAssert(
      correctedCheck.code === 0,
      `corrected source remained blocked (exit ${correctedCheck.code})\n${correctedCheck.stderr.slice(-600)}`,
    );

    const build = await runInstalledLiteshipCli(['build', '--json'], appDir);
    journeyAssert(build.code === 0, `installed liteship build exited ${build.code}\n${build.stderr.slice(-800)}`);
    const htmlFiles = findFiles(join(appDir, 'dist'), '.html');
    journeyAssert(htmlFiles.length > 0, 'corrected packed consumer build emitted no HTML');
    const html = htmlFiles.map((path) => readFileSync(path, 'utf8')).join('\n');
    journeyAssert(html.includes('data-liteship-'), 'corrected packed consumer build emitted no LiteShip markers');

    return {
      name,
      status: 'pass',
      detail:
        `packed fault → ${EXPECTED_CODE} → bounded remediation → corrected gate → installed build ` +
        `(${htmlFiles.length} HTML file(s))`,
      notes: ['all operator commands ran through the packed facade-owned executable'],
    };
  } catch (error) {
    return { name, status: 'fail', detail: error instanceof Error ? error.message : String(error), notes: [] };
  } finally {
    rmSync(plantedDir, { recursive: true, force: true });
  }
}
