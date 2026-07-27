/** Fail closed when a $GITHUB_OUTPUT heredoc runs a fallible command between its delimiters. */

import { resolve } from 'node:path';
import { buildWorkflowOutputReceipt } from './lib/workflow-output-contract.js';

const repoRoot = resolve(import.meta.dirname, '..');
const receipt = buildWorkflowOutputReceipt(repoRoot);
const { artifactDownloads, artifactFindings, findings, subjects, writes } = receipt;

if (writes.length === 0) {
  process.stderr.write('workflow-output: enumerated zero $GITHUB_OUTPUT writes — the census is opaque.\n');
  process.exitCode = 1;
} else if (findings.length > 0 || artifactFindings.length > 0) {
  process.stderr.write(
    [
      `workflow-output: ${findings.length} heredoc violation(s), ${artifactFindings.length} delivery-ingress violation(s).`,
      ...findings.map(
        (finding) => `  [${finding.kind}] ${finding.file}:${finding.line} (<<${finding.delimiter}): ${finding.text}`,
      ),
      ...artifactFindings.map(
        (finding) => `  [${finding.kind}] ${finding.file}:${finding.line}: ${finding.detail}`,
      ),
      'A command failing between the delimiter open and close corrupts $GITHUB_OUTPUT and buries the root error.',
      'Compute into a shell variable first; open the heredoc only to echo/printf the already-computed value.',
      'Delivery evidence must download exactly once beneath reports/, the admission owner\'s canonical root.',
    ].join('\n') + '\n',
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `workflow-output: ${writes.length} output write(s), ${subjects.length} multiline record(s), ${artifactDownloads.length} delivery ingress(es) enumerated (${receipt.censusDigest}); all writes and ingress paths are admissible.\n`,
  );
}
