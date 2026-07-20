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

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

export function runRuntimeGate(root = repoRoot): void {
  const verification = verifyFeedbackArtifacts(root);
  const runtimeSeams = readJson<RuntimeSeamsReportArtifact>(resolve(root, 'reports', 'runtime-seams.json'));
  const adaptiveScan = readJson<AdaptiveScanArtifact>(resolve(root, 'reports', 'adaptive-scan.json'));

  const failures: string[] = [];

  if (!verification.passed) {
    failures.push('feedback artifact verification is not passing');
  }

  if (!runtimeSeams.hardGates?.passed) {
    failures.push('runtime seams hard gates are not passing');
  }

  const nonPassingPairedTruth = (runtimeSeams.pairedTruth ?? []).filter((entry) => entry.status !== 'pass');
  if (nonPassingPairedTruth.length > 0) {
    failures.push(
      `runtime seams paired truth contains non-pass entries: ${nonPassingPairedTruth.map((entry) => `${entry.id}:${entry.status}`).join(', ')}`,
    );
  }

  const runtimeWarnings = adaptiveScan.summary?.runtimeWarnings ?? [];
  if (runtimeWarnings.length > 0) {
    failures.push(`adaptive scan still reports runtime warnings: ${runtimeWarnings.join(', ')}`);
  }

  if (runtimeSeams.schemaVersion !== 7) {
    failures.push(`runtime seams schema version ${runtimeSeams.schemaVersion ?? 'missing'} is not current`);
  }

  if (adaptiveScan.schemaVersion !== 6) {
    failures.push(`adaptive scan schema version ${adaptiveScan.schemaVersion ?? 'missing'} is not current`);
  }

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
