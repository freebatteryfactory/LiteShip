/** Measure retained-allocation growth and write the committed performance contract. */

import { resolve } from 'node:path';
import {
  ACCEPTED_ALLOCATION_CEILINGS,
  MIN_COMPLEXITY_FIT_R2,
} from '../packages/gauntlet/src/gates/performance-contracts.js';
import { repoRoot } from '../vitest.shared.js';
import { isDirectExecution, writeTextFile } from './audit/shared.js';
import type { AllocationCurve } from './bench/allocation-curves.js';
import { runAllAllocationCurves } from './bench/allocation-probes.js';
import { complexityRank, type ComplexityClass } from './bench/contracts.js';

export const ALLOCATION_MAP_ARTIFACT_PATH = 'benchmarks/allocation-map.json';

export interface AllocationMapEntry extends Omit<AllocationCurve, 'fit'> {
  readonly class: ComplexityClass;
  readonly fittedSlope: number;
  readonly fittedR2: number;
}

export interface AllocationMap {
  readonly schemaVersion: 1;
  readonly entries: readonly AllocationMapEntry[];
}

export interface AllocationMapIssue {
  readonly path: string;
  readonly reason: 'missing' | 'class-regression' | 'noisy-fit';
}

/** Pure verifier; synthetic quadratic/noisy/missing maps are its planted controls. */
export function verifyMeasuredAllocationMap(map: AllocationMap): readonly AllocationMapIssue[] {
  const issues: AllocationMapIssue[] = [];
  const byPath = new Map(map.entries.map((entry) => [entry.path, entry] as const));
  for (const [path, ceiling] of Object.entries(ACCEPTED_ALLOCATION_CEILINGS)) {
    const entry = byPath.get(path);
    if (entry === undefined) {
      issues.push({ path, reason: 'missing' });
      continue;
    }
    if (complexityRank(entry.class) > complexityRank(ceiling)) issues.push({ path, reason: 'class-regression' });
    if (entry.fittedR2 < MIN_COMPLEXITY_FIT_R2) issues.push({ path, reason: 'noisy-fit' });
  }
  return issues;
}

export function buildAllocationMap(): AllocationMap {
  return {
    schemaVersion: 1,
    entries: runAllAllocationCurves().map((curve) => {
      return {
        path: curve.path,
        describe: curve.describe,
        shape: curve.shape,
        sizes: curve.sizes,
        repetitions: curve.repetitions,
        samples: curve.samples.map((sample) => ({
          size: sample.size,
          retainedBytesPerOperation: Number(sample.retainedBytesPerOperation.toFixed(2)),
        })),
        class: curve.fit.class,
        fittedSlope: Number(curve.fit.slope.toFixed(4)),
        fittedR2: Number(curve.fit.r2.toFixed(4)),
      };
    }),
  };
}

export function runAllocationContracts(): Readonly<Record<string, number>> {
  const map = buildAllocationMap();
  const issues = verifyMeasuredAllocationMap(map);
  if (issues.length > 0) {
    throw new Error(
      `retained-allocation contracts failed:\n${issues.map((issue) => `- ${issue.path}: ${issue.reason}`).join('\n')}`,
    );
  }
  writeTextFile(resolve(repoRoot, ALLOCATION_MAP_ARTIFACT_PATH), `${JSON.stringify(map, null, 2)}\n`);
  return Object.fromEntries(
    map.entries.map((entry) => [entry.path, entry.samples.at(-1)?.retainedBytesPerOperation ?? 0]),
  );
}

if (isDirectExecution(import.meta.url)) {
  const results = runAllocationContracts();
  for (const [path, bytes] of Object.entries(results)) console.log(`${path}: ${bytes.toFixed(2)} retained bytes/op`);
}
