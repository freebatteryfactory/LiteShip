/**
 * Fail closed when a governed domain directory is facade-only or singleton.
 *
 * A domain directory is an organizing axis, not a namespace for one file: its
 * `index.ts` facade is a pure re-export entry surface and never counts as
 * content, so a governed domain needs at least two non-facade source modules.
 */

import { resolve } from 'node:path';
import { buildSourceLayoutReceipt } from './lib/source-layout-contract.js';

const repoRoot = resolve(import.meta.dirname, '..');
const receipt = buildSourceLayoutReceipt(repoRoot);
const { findings } = receipt;

if (findings.length > 0) {
  process.stderr.write(
    [
      `source-layout: ${findings.length} singleton domain director${findings.length === 1 ? 'y' : 'ies'} violate the source-grammar law.`,
      ...findings.map((finding) => {
        const members = finding.contentModules.length === 0 ? '(none)' : finding.contentModules.join(', ');
        const facade = finding.facade ?? '(no facade)';
        return `  ${finding.directory}: facade ${facade} has content modules ${members}; two are required.`;
      }),
      'An index.ts facade never counts as a content module. Keep a singleton top-level or split the subject into real owners.',
    ].join('\n') + '\n',
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `source-layout: ${receipt.subjects.length} immediate source director${receipt.subjects.length === 1 ? 'y' : 'ies'} enumerated (${receipt.censusDigest}); every subject has at least two content modules.\n`,
  );
}
