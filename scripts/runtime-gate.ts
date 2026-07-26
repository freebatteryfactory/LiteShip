import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { repoRoot } from '../vitest.shared.js';
import { verifyFeedbackArtifacts, type RuntimeSeamsReportArtifact } from './artifact-integrity.js';
import { isDirectExecution } from './audit/shared.js';

interface AdaptiveScanSummary {
  readonly runtimeWarnings?: readonly string[];
}

interface AdaptiveScanArtifact {
  readonly schemaVersion?: number;
  readonly summary?: AdaptiveScanSummary;
}

export interface RuntimeGateEvidence {
  readonly feedbackPassed: boolean;
  readonly hardGatesPassed: boolean;
  readonly pairedTruth: readonly { readonly id: string; readonly status: string }[];
  readonly runtimeWarnings: readonly string[];
  readonly runtimeSeamsSchemaVersion: number | undefined;
  readonly adaptiveScanSchemaVersion: number | undefined;
}

/** Pure semantic fold used by the executable gate and its planted controls. */
export function runtimeGateFailures(evidence: RuntimeGateEvidence): readonly string[] {
  const failures: string[] = [];
  if (!evidence.feedbackPassed) failures.push('feedback artifact verification is not passing');
  if (!evidence.hardGatesPassed) failures.push('runtime seams hard gates are not passing');
  const nonPassingPairedTruth = evidence.pairedTruth.filter((entry) => entry.status !== 'pass');
  if (nonPassingPairedTruth.length > 0) {
    failures.push(
      `runtime seams paired truth contains non-pass entries: ${nonPassingPairedTruth.map((entry) => `${entry.id}:${entry.status}`).join(', ')}`,
    );
  }
  if (evidence.runtimeWarnings.length > 0) {
    failures.push(`adaptive scan still reports runtime warnings: ${evidence.runtimeWarnings.join(', ')}`);
  }
  if (evidence.runtimeSeamsSchemaVersion !== 7) {
    failures.push(`runtime seams schema version ${evidence.runtimeSeamsSchemaVersion ?? 'missing'} is not current`);
  }
  if (evidence.adaptiveScanSchemaVersion !== 6) {
    failures.push(`adaptive scan schema version ${evidence.adaptiveScanSchemaVersion ?? 'missing'} is not current`);
  }
  return failures;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

export function runRuntimeGate(root = repoRoot): void {
  const verification = verifyFeedbackArtifacts(root);
  const runtimeSeams = readJson<RuntimeSeamsReportArtifact>(resolve(root, 'reports', 'runtime-seams.json'));
  const adaptiveScan = readJson<AdaptiveScanArtifact>(resolve(root, 'reports', 'adaptive-scan.json'));

  const failures = runtimeGateFailures({
    feedbackPassed: verification.passed,
    hardGatesPassed: runtimeSeams.hardGates?.passed === true,
    pairedTruth: runtimeSeams.pairedTruth ?? [],
    runtimeWarnings: adaptiveScan.summary?.runtimeWarnings ?? [],
    runtimeSeamsSchemaVersion: runtimeSeams.schemaVersion,
    adaptiveScanSchemaVersion: adaptiveScan.schemaVersion,
  });

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`FAIL runtime-gate: ${failure}`);
    }
    throw new Error('Runtime gate failed.');
  }

  console.log('Runtime gate passed.');
}

if (isDirectExecution(import.meta.url)) {
  runRuntimeGate();
}
