import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assuranceRegressions,
  baselineFromInventory,
  buildAssuranceInventory,
  type AssuranceBaseline,
} from './lib/assurance-inventory.js';

const cwd = process.cwd();
const baselinePath = resolve(cwd, 'scripts/assurance-ratchet.json');
const reportPath = resolve(cwd, 'reports/assurance-inventory.json');
const inventory = buildAssuranceInventory(cwd);

if (process.argv.includes('--write-baseline')) {
  writeFileSync(baselinePath, `${JSON.stringify(baselineFromInventory(inventory), null, 2)}\n`, 'utf8');
  process.stdout.write(`assurance baseline wrote ${baselinePath}\n`);
  process.exit(0);
}

writeFileSync(reportPath, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8')) as AssuranceBaseline;
const regressions = assuranceRegressions(inventory, baseline);
if (regressions.length > 0) {
  for (const regression of regressions) {
    process.stderr.write(
      `assurance density regressed for ${regression.package}: ${(regression.priorMilli / 1_000).toFixed(3)}x -> ${(regression.currentMilli / 1_000).toFixed(3)}x\n`,
    );
  }
  process.exit(1);
}

const targetPackages = inventory.packages.filter((entry) => entry.targetReached).length;
process.stdout.write(
  `assurance inventory passed: ${(inventory.totals.ratioMilli / 1_000).toFixed(3)}x authored evidence/source; ${targetPackages}/${inventory.packages.length} packages at 10x target\n`,
);
