import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  baselineFromTestFindings,
  scanTestConstitution,
  testConstitutionRegressions,
  type TestConstitutionBaseline,
} from './lib/test-constitution.js';

const cwd = process.cwd();
const baselinePath = resolve(cwd, 'scripts/test-constitution-ratchet.json');
const findings = scanTestConstitution(cwd);
if (process.argv.includes('--write-baseline')) {
  writeFileSync(baselinePath, `${JSON.stringify(baselineFromTestFindings(findings), null, 2)}\n`, 'utf8');
  process.stdout.write(`test constitution baseline wrote ${baselinePath}\n`);
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8')) as TestConstitutionBaseline;
const regressions = testConstitutionRegressions(findings, baseline);
if (regressions.length > 0) {
  for (const finding of regressions) {
    process.stderr.write(
      `test constitution regressed: ${finding.file} ${finding.kind} ${finding.prior} -> ${finding.current}\n`,
    );
  }
  process.exit(1);
}
process.stdout.write(
  `test constitution passed: ${findings.length} legacy coupling site(s), ratcheted by file and kind\n`,
);
