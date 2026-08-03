/** Run the pinned cargo-audit authority and persist raw plus aggregate receipts. @module */

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnArgvCaptureWithEnv } from '../packages/command/src/host/launcher.js';
import { runCargoAudit, type CargoAuditExecutor } from './lib/cargo-audit-contract.js';

const repoRoot = resolve(import.meta.dirname, '..');
if (process.argv.length !== 2) {
  console.error('usage: pnpm exec tsx scripts/cargo-audit.ts');
  process.exit(2);
}

const rawRoot = resolve(repoRoot, 'reports/cargo-audit');
await mkdir(rawRoot, { recursive: true });
let invocationIndex = 0;
const execute: CargoAuditExecutor = async (command, argv, options) => {
  const index = String(invocationIndex).padStart(2, '0');
  invocationIndex += 1;
  const result = await spawnArgvCaptureWithEnv(command, argv, options);
  await Promise.all([
    writeFile(resolve(rawRoot, `${index}.stdout.txt`), result.stdout, 'utf8'),
    writeFile(resolve(rawRoot, `${index}.stderr.txt`), result.stderr, 'utf8'),
  ]);
  return result;
};

const receipt = await runCargoAudit(repoRoot, execute);
const outputPath = resolve(repoRoot, 'reports/cargo-audit.json');
await writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(
  `[cargo-audit] PASS: ${receipt.subjects.length} Cargo lockfile subjects; receipt: reports/cargo-audit.json`,
);
