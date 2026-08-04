/**
 * Fail closed on both halves of the domain-directory grammar.
 *
 * A domain directory is an organizing axis, not a namespace for one file: its
 * `index.ts` facade is a pure re-export entry surface and never counts as
 * content, so a governed domain needs at least two non-facade source modules.
 * A facade is also the seam a package presents OUTWARD, so no concrete module
 * may reach one — a sibling that imports its neighbour's facade instead of the
 * real owner re-enters its own package through the front door and makes
 * directory-level cycles expressible (the anti-cycle law).
 */

import { resolve } from 'node:path';
import { buildFacadeEdgeReceipt, buildSourceLayoutReceipt } from './lib/source-layout-contract.js';

const repoRoot = resolve(import.meta.dirname, '..');
const receipt = buildSourceLayoutReceipt(repoRoot);
const { findings } = receipt;
const edgeReceipt = buildFacadeEdgeReceipt(repoRoot);

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

if (edgeReceipt.findings.length > 0) {
  process.stderr.write(
    [
      `facade-edges: ${edgeReceipt.findings.length} concrete module${edgeReceipt.findings.length === 1 ? '' : 's'} import a governed facade (anti-cycle law).`,
      ...edgeReceipt.findings.map(
        (finding) =>
          `  ${finding.importer}:${finding.line}: '${finding.specifier}' reaches the facade ${finding.facade}.`,
      ),
      `Import the concrete owner instead. The governed facade set is derived from ${edgeReceipt.rule} and every package.json \`exports\` target — it is not an authored roster.`,
    ].join('\n') + '\n',
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `facade-edges: ${edgeReceipt.importers.length} concrete module${edgeReceipt.importers.length === 1 ? '' : 's'} checked against ${edgeReceipt.facades.length} governed facades and ${edgeReceipt.entryPoints.length} published entry points (${edgeReceipt.censusDigest}); zero facade imports from concrete files.\n`,
  );
}
