/** Fail closed when a $GITHUB_OUTPUT heredoc runs a fallible command between its delimiters. */

import { resolve } from 'node:path';
import { buildWorkflowOutputReceipt } from './lib/workflow-output-contract.js';

const repoRoot = resolve(import.meta.dirname, '..');
const receipt = buildWorkflowOutputReceipt(repoRoot);
const { findings, subjects, writes } = receipt;

if (writes.length === 0) {
  process.stderr.write('workflow-output: enumerated zero $GITHUB_OUTPUT writes — the census is opaque.\n');
  process.exitCode = 1;
} else if (findings.length > 0) {
  process.stderr.write(
    [
      `workflow-output: ${findings.length} $GITHUB_OUTPUT heredoc violation(s) of the compute-then-emit law.`,
      ...findings.map(
        (finding) => `  [${finding.kind}] ${finding.file}:${finding.line} (<<${finding.delimiter}): ${finding.text}`,
      ),
      'A command failing between the delimiter open and close corrupts $GITHUB_OUTPUT and buries the root error.',
      'Compute into a shell variable first; open the heredoc only to echo/printf the already-computed value.',
    ].join('\n') + '\n',
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `workflow-output: ${writes.length} output write(s), ${subjects.length} multiline record(s) enumerated (${receipt.censusDigest}); all writes are atomic or compute-then-emit.\n`,
  );
}
