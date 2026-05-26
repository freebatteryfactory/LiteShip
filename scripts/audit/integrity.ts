/**
 * Integrity audit CLI wrapper (CUT D9b-1). Engine in `@czap/audit`; this thin
 * script re-exports it and provides the `pnpm run audit:integrity` entry.
 *
 * @module
 */
import { runIntegrityAudit, liteshipDevopsProfile, withRepoRoot } from '@czap/audit';
import { reportPaths } from './policy.js';
import { createCounts, isDirectExecution, repoRoot, writeTextFile } from './shared.js';

export { runIntegrityAudit } from '@czap/audit';
export type { IntegritySummary } from '@czap/audit';

function main(): void {
  const result = runIntegrityAudit(withRepoRoot(liteshipDevopsProfile, repoRoot));
  const outputPath = `${repoRoot}/${reportPaths.json.replace(/\.json$/, '.integrity.json')}`;
  writeTextFile(outputPath, JSON.stringify(result, null, 2));
  const counts = createCounts(result.findings);
  console.log(
    `integrity audit: ${counts.error} error(s), ${counts.warning} warning(s), ${counts.info} info finding(s), ${result.suppressed.length} suppressed`,
  );
}

if (isDirectExecution(import.meta.url)) {
  main();
}
