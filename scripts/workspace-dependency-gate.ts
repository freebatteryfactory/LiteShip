/** Fail closed when a package's source imports an undeclared workspace package. */

import { resolve } from 'node:path';
import { dynamicImportExemptions } from '../packages/cli/src/internal/liteship-audit-policy.js';
import { buildWorkspaceDependencyReceipt } from './lib/workspace-dependency-contract.js';

const repoRoot = resolve(import.meta.dirname, '..');
const receipt = buildWorkspaceDependencyReceipt(repoRoot, dynamicImportExemptions);
const { findings, subjects } = receipt;

if (subjects.length === 0) {
  process.stderr.write('workspace-deps: enumerated zero workspace packages — the census enumerator is broken.\n');
  process.exitCode = 1;
} else if (findings.length > 0) {
  process.stderr.write(
    [
      `workspace-deps: ${findings.length} undeclared workspace import(s).`,
      ...findings.map(
        (finding) =>
          `  ${finding.file} imports "${finding.specifier}" but ${finding.package} does not declare ${finding.dependency}`,
      ),
      'Undeclared imports resolve on a warm machine and fail the clean-checkout build (TS2307).',
      "Declare the dependency (workspace:*) in the importer's package.json.",
    ].join('\n') + '\n',
  );
  process.exitCode = 1;
} else {
  const optional =
    receipt.optionalDynamicImports.length === 0
      ? ''
      : ` ${receipt.optionalDynamicImports.length} dynamic-only optional edge(s) enumerated: ${receipt.optionalDynamicImports
          .map((edge) => `${edge.file} -> ${edge.dependency}`)
          .join(', ')}.`;
  process.stdout.write(
    `workspace-deps: ${subjects.length} package(s) enumerated (${receipt.censusDigest}); every static workspace import is declared.${optional}\n`,
  );
}
