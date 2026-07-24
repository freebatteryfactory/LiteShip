import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  assuranceRegressions,
  baselineFromInventory,
  buildAssuranceInventory,
  parseAssuranceBaseline,
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

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');
const baseline = parseAssuranceBaseline(JSON.parse(readFileSync(baselinePath, 'utf8')) as unknown);
const regressions = assuranceRegressions(inventory, baseline);
if (regressions.length > 0) {
  for (const regression of regressions) {
    process.stderr.write(
      regression.kind === 'density'
        ? `assurance density regressed for ${regression.package}: ${((regression.priorMilli ?? 0) / 1_000).toFixed(3)}x -> ${((regression.currentMilli ?? 0) / 1_000).toFixed(3)}x\n`
        : `assurance evidence gap opened for ${regression.package}: ${regression.evidenceGap}\n`,
    );
  }
  process.exit(1);
}

const targetPackages = inventory.packages.filter((entry) => entry.targetReached).length;
process.stdout.write(
  `assurance inventory passed: ${(inventory.totals.ratioMilli / 1_000).toFixed(3)}x authored evidence/source; ${targetPackages}/${inventory.packages.length} packages at 10x target\n`,
);
