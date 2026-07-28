/** Cheap local minimum-version proof for security-sensitive overrides. @module */

import { readFileSync } from 'node:fs';
import { securityMinimumFindings } from './lib/security-audit-contract.ts';

const findings = securityMinimumFindings(
  JSON.parse(readFileSync('package.json', 'utf8')) as unknown,
  readFileSync('pnpm-lock.yaml', 'utf8'),
);
if (findings.length > 0) throw new Error(`security minimum gate failed:\n${findings.map((item) => `  - ${item}`).join('\n')}`);
console.log('Security minimum gate passed.');
