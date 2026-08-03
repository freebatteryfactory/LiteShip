import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  assuranceRegressions,
  assuranceProgress,
  baselineFromInventory,
  buildAssuranceInventory,
  formatAssuranceRatchetSummary,
  parseAssuranceBaseline,
} from './lib/assurance-inventory.js';

const cwd = process.cwd();
const baselinePath = resolve(cwd, 'scripts/assurance-ratchet.json');
const reportPath = resolve(cwd, 'reports/assurance-inventory.json');
const progressPath = resolve(cwd, 'reports/assurance-progress.json');
const inventory = buildAssuranceInventory(cwd);

if (process.argv.includes('--write-baseline')) {
  writeFileSync(baselinePath, `${JSON.stringify(baselineFromInventory(inventory), null, 2)}\n`, 'utf8');
  process.stdout.write(`assurance baseline wrote ${baselinePath}\n`);
  process.exit(0);
}

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');
const baseline = parseAssuranceBaseline(JSON.parse(readFileSync(baselinePath, 'utf8')) as unknown);
writeFileSync(
  progressPath,
  `${JSON.stringify({ schemaVersion: 1, packages: assuranceProgress(inventory, baseline) }, null, 2)}\n`,
  'utf8',
);
const regressions = assuranceRegressions(inventory, baseline, {
  requireSemanticAssurance: process.argv.includes('--require-semantic'),
});
if (regressions.length > 0) {
  for (const regression of regressions) {
    process.stderr.write(
      regression.kind === 'density'
        ? `assurance density regressed for ${regression.package}: ${((regression.priorMilli ?? 0) / 1_000).toFixed(3)}x -> ${((regression.currentMilli ?? 0) / 1_000).toFixed(3)}x\n`
        : regression.kind === 'stale-strengthen'
          ? `assurance ratchet is stale for ${regression.package}: earned ${regression.evidenceGap}; review and advance the baseline\n`
          : `assurance evidence gap opened for ${regression.package}: ${regression.evidenceGap}\n`,
    );
  }
  process.exit(1);
}

process.stdout.write(formatAssuranceRatchetSummary(inventory));
