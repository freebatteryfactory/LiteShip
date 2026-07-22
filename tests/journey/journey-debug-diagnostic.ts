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

import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { journeyAssert, parseReceipt, removeDir, runLiteshipCli, type JourneyResult } from './harness.js';

/** The stable diagnostic code the planted bare-throw misconfig must surface. */
const EXPECTED_CODE = 'gauntlet/no-bare-throw';

/** A source file whose bare throw trips the `no-bare-throw` gate (an untagged failure path). */
const MISCONFIG_SOURCE = `export function boom(): void {
  throw new Error('planted misconfig: an untagged failure path');
}
`;

export async function journeyDebugDiagnostic(): Promise<JourneyResult> {
  const name = 'journey-debug-diagnostic';
  let scratch: string | undefined;
  try {
    // Plant the misconfig inside the glob the gauntlet gate fold walks
    // (DEFAULT_GAUNTLET_GLOBS = `packages/*/src/**/*.ts`), scoped to this scratch cwd.
    scratch = mkdtempSync(join(tmpdir(), 'liteship-journey-diag-'));
    const srcDir = join(scratch, 'packages', 'planted', 'src');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, 'bad.ts'), MISCONFIG_SOURCE);

    // Run the in-process gauntlet gate fold, cwd-scoped to the planted tree.
    const check = await runLiteshipCli(['check', 'gates', '--json'], scratch);
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
    const explain = await runLiteshipCli(['explain', EXPECTED_CODE, '--json'], scratch);
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

    return {
      name,
      status: 'pass',
      detail: `planted misconfig → check surfaced stable code ${EXPECTED_CODE} → explain returned remediation ("${(remediation as string).slice(0, 60)}…")`,
      notes: ['used the explicit `check gates --json` Finding surface, then resolved its stable code'],
    };
  } catch (error) {
    return { name, status: 'fail', detail: error instanceof Error ? error.message : String(error), notes: [] };
  } finally {
    removeDir(scratch);
  }
}
