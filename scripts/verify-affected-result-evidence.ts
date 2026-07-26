#!/usr/bin/env tsx
/** Independently admit affected-lane receipts against the addressed selection plan. */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parseAffectedTestPlan } from './lib/affected-test-plan.js';
import { admitAffectedResultEvidence, parseAffectedResultEvidence } from './lib/affected-result-evidence.js';

const [planArg, resultRootArg, outputArg] = process.argv.slice(2);
if (planArg === undefined || resultRootArg === undefined || outputArg === undefined) {
  throw new TypeError('usage: verify-affected-result-evidence <plan.json> <result-root> <output.json>');
}

const plan = parseAffectedTestPlan(JSON.parse(readFileSync(resolve(planArg), 'utf8')));
const root = resolve(resultRootArg);
const lanes = ['pr-linux', 'pr-windows', ...(plan.browserRequired ? ['pr-browser'] : [])];
const receipts = lanes.map((lane) =>
  parseAffectedResultEvidence(JSON.parse(readFileSync(resolve(root, lane, `affected-result-${lane}.json`), 'utf8'))),
);
const admission = admitAffectedResultEvidence({
  headSha: plan.headSha,
  planId: plan.planId,
  browserRequired: plan.browserRequired,
  benchmarkRequired: plan.benchmarkRequired,
  receipts,
});
const output = resolve(outputArg);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(admission, null, 2)}\n`, 'utf8');
process.stdout.write(`affected result admission accepted ${admission.lanes.join(', ')} for ${admission.planId}\n`);
