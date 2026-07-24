#!/usr/bin/env tsx
import { resolve } from 'node:path';
import { assertTypeDocInputFingerprint, writeTypeDocInputFingerprint } from './lib/typedoc-input-fingerprint.js';

const repoRoot = resolve(import.meta.dirname, '..');
const write = process.argv.includes('--write');

try {
  const fingerprint = write ? writeTypeDocInputFingerprint(repoRoot) : assertTypeDocInputFingerprint(repoRoot);
  console.log(`typedoc input fingerprint ${write ? 'wrote' : 'passed'} — ${fingerprint.digest}`);
} catch (error) {
  console.error(`typedoc input fingerprint failed — ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
