import { readFileSync } from 'node:fs';
import { BENCH_FLEX_POLICY, benchFlexPolicyFailures } from './bench/flex-policy.js';

const failures: string[] = [...benchFlexPolicyFailures(BENCH_FLEX_POLICY)];

const flexSrc = readFileSync('scripts/flex-verify.ts', 'utf8');
if (!flexSrc.includes("from './bench/flex-policy.js'")) {
  failures.push('flex-verify must import flex-policy');
}
if (flexSrc.includes('replicateExceedanceRate <= 0.2')) {
  failures.push('flex-verify must use LLM_STEADY_REPLICATE_EXCEEDANCE_MAX, not literal 0.2');
}
if (flexSrc.includes('directiveP99ToBaselineP99 <= 1.5')) {
  failures.push('flex-verify must use LLM_STEADY_P99_TO_BASELINE_MAX, not literal 1.5');
}

const dirSrc = readFileSync('scripts/bench/directive-suite.ts', 'utf8');
if (!dirSrc.includes('LLM_STEADY_REPLICATE_EXCEEDANCE_MAX')) {
  failures.push('directive-suite must reference LLM_STEADY_REPLICATE_EXCEEDANCE_MAX');
}
if (dirSrc.includes('replicateExceedanceRate > 0.2')) {
  failures.push('directive-suite must not use raw 0.2 for LLM steady exceedance narrative');
}

const rsSrc = readFileSync('scripts/report-runtime-seams.ts', 'utf8');
if (!rsSrc.includes('LLM_STEADY_REPLICATE_EXCEEDANCE_MAX')) {
  failures.push('report-runtime-seams must reference LLM_STEADY_REPLICATE_EXCEEDANCE_MAX');
}
if (rsSrc.includes('replicateExceedanceRate > 0.2')) {
  failures.push('report-runtime-seams must not use raw 0.2 for LLM steady classification');
}

if (failures.length > 0) {
  for (const line of failures) console.error(line);
  process.exit(1);
}
console.log('devx-check: ok');
