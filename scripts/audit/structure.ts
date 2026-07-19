/**
 * Structure audit CLI wrapper (CUT D9b-1). The engine lives in `@liteship/audit`;
 * this thin script re-exports it (so `report.ts` and tests keep importing
 * `./structure.js`) and provides the `pnpm run audit:structure` entry that
 * writes the JSON section report against the LiteShip repo root.
 *
 * @module
 */
import { resolve } from 'node:path';
import { runStructureAudit, liteshipDevopsProfile, withRepoRoot } from '@liteship/audit';
import { reportPaths } from './policy.js';
import { createCounts, isDirectExecution, relativeToRoot, repoRoot, writeTextFile } from './shared.js';

export { runStructureAudit } from '@liteship/audit';
export type { StructureSummary } from '@liteship/audit';

function main(): void {
  const result = runStructureAudit(withRepoRoot(liteshipDevopsProfile, repoRoot));
  const outputPath = resolve(repoRoot, reportPaths.json.replace(/\.json$/, '.structure.json'));
  writeTextFile(outputPath, JSON.stringify(result, null, 2));
  const counts = createCounts(result.findings);
  console.log(
    `structure audit: ${counts.error} error(s), ${counts.warning} warning(s), ${counts.info} info finding(s), ${result.suppressed.length} suppressed`,
  );
  console.log(`wrote ${relativeToRoot(outputPath, repoRoot)}`);
}

if (isDirectExecution(import.meta.url)) {
  main();
}
