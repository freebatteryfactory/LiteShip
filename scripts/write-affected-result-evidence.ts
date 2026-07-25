#!/usr/bin/env tsx
/** Write the always-present execution-state receipt for an affected CI lane. */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  buildAffectedResultEvidence,
  type AffectedResultStepInput,
  type AffectedStepOutcome,
} from './lib/affected-result-evidence.js';

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) throw new TypeError(`${name} is required`);
  return value.trim();
}

function envSuffix(id: string): string {
  return id.toUpperCase().replaceAll('-', '_');
}

const cwd = process.cwd();
const stepIds = required('LITESHIP_AFFECTED_STEPS')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const steps: AffectedResultStepInput[] = stepIds.map((id) => {
  const suffix = envSuffix(id);
  const outcome = required(`LITESHIP_AFFECTED_OUTCOME_${suffix}`) as AffectedStepOutcome;
  const evidencePath = process.env[`LITESHIP_AFFECTED_EVIDENCE_${suffix}`]?.trim();
  return { id, outcome, ...(evidencePath === undefined || evidencePath.length === 0 ? {} : { evidencePath }) };
});
const output = required('LITESHIP_AFFECTED_RESULT_PATH');
const receipt = buildAffectedResultEvidence(
  {
    lane: required('LITESHIP_AFFECTED_LANE'),
    headSha: required('GITHUB_SHA'),
    steps,
  },
  (path) => existsSync(resolve(cwd, path)),
);
const outputPath = resolve(cwd, output);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
process.stdout.write(`affected result evidence wrote ${output} (integrity=${receipt.integrity})\n`);
if (!receipt.integrity) process.exitCode = 1;
