/** Live pnpm registry audit with an always-written raw JSON receipt. @module */

import { mkdir, writeFile } from 'node:fs/promises';
import { spawnArgvCaptureWithEnv } from '../packages/command/src/host/launcher.js';
import { blockingAuditFindings, parsePnpmAuditReceipt } from './lib/security-audit-contract.js';

const reportPath = 'reports/pnpm-audit.json';
const stderrPath = 'reports/pnpm-audit.stderr.txt';
await mkdir('reports', { recursive: true });
const result = await spawnArgvCaptureWithEnv('pnpm', ['audit', '--json'], { cwd: process.cwd() });
await writeFile(reportPath, result.stdout.length > 0 ? `${result.stdout.trimEnd()}\n` : '{}\n');
await writeFile(stderrPath, result.stderr);
if (result.signal !== null) {
  throw new Error(`pnpm audit terminated by ${result.signal}; raw receipt: ${reportPath}`);
}
let receipt: ReturnType<typeof parsePnpmAuditReceipt>;
try {
  receipt = parsePnpmAuditReceipt(JSON.parse(result.stdout) as unknown);
} catch (cause) {
  throw new Error(`pnpm audit emitted no valid receipt (exit ${result.exitCode}): ${String(cause)}`);
}
const findings = blockingAuditFindings(receipt);
if (findings.length > 0) throw new Error(`pnpm audit blocked:\n${findings.map((item) => `  - ${item}`).join('\n')}`);
console.log(`Security audit passed; raw receipt written to ${reportPath}.`);
