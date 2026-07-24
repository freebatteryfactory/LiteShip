/**
 * Surface audit CLI wrapper (CUT D9b-1). Engine in `@liteship/audit`; this thin
 * script re-exports it and provides the `pnpm run audit:surface` entry.
 *
 * @module
 */
import { runSurfaceAudit, liteshipDevopsProfile, withRepoRoot } from '@liteship/audit';
import { reportPaths } from './policy.js';
import { createCounts, isDirectExecution, repoRoot, writeTextFile } from './shared.js';

export { runSurfaceAudit } from '@liteship/audit';
export type { SurfaceSummary } from '@liteship/audit';

function main(): void {
  const result = runSurfaceAudit(withRepoRoot(liteshipDevopsProfile, repoRoot));
  const outputPath = `${repoRoot}/${reportPaths.json.replace(/\.json$/, '.surface.json')}`;
  writeTextFile(outputPath, JSON.stringify(result, null, 2));
  const counts = createCounts(result.findings);
  console.log(
    `surface audit: ${counts.error} error(s), ${counts.warning} warning(s), ${counts.info} info finding(s), ${result.suppressed.length} suppressed`,
  );
}

if (isDirectExecution(import.meta.url)) {
  main();
}
