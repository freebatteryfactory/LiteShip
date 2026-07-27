/** Fail closed when a pre-build entry script's import closure reaches workspace dist. */

import { resolve } from 'node:path';
import { buildPrebuildClosureReceipt } from './lib/prebuild-closure-contract.js';

const repoRoot = resolve(import.meta.dirname, '..');
const receipt = buildPrebuildClosureReceipt(repoRoot);
const { findings, entrypoints, closure } = receipt;

if (entrypoints.length === 0) {
  process.stderr.write(
    'prebuild-dist-free: enumerated zero pre-build entrypoints — the census enumerator is broken.\n',
  );
  process.exitCode = 1;
} else if (findings.length > 0) {
  process.stderr.write(
    [
      `prebuild-dist-free: ${findings.length} cold-checkout-fatal import(s) in the pre-build closure.`,
      ...findings.map(
        (finding) =>
          `  [${finding.kind}] ${finding.importer} imports "${finding.specifier}"` +
          `${finding.resolved === null ? '' : ` -> ${finding.resolved}`}\n    via ${finding.chain.join(' -> ')}`,
      ),
      'These scripts run on a clean CI checkout before any workspace build exists.',
      'Remove the value-import (construct locally, or import type-only), or move the script after the build step.',
    ].join('\n') + '\n',
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `prebuild-dist-free: ${entrypoints.length} entrypoint(s), ${closure.length} module(s) in closure (${receipt.censusDigest}); no dist-reaching import.\n`,
  );
}
