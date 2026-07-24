/**
 * Audit shared helpers — split (CUT D9b-1). The reusable ENGINE helpers
 * (package-manifest + source-record reading, finding counting/sorting, allowlist
 * partitioning) live in `@liteship/audit` and are re-exported here so existing
 * `./shared.js` importers are unchanged. The repo-local `repoRoot` const, the
 * file-writing/`main()` utilities, and the HICP inventory walkers stay here.
 *
 * @module
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import fg from 'fast-glob';
import { auditIgnoreGlobs, normalizeRepoPath } from '@liteship/audit';
import { matchesHicpInventory } from './policy.js';

export {
  createCounts,
  compareSeverity,
  sortFindings,
  sortSuppressions,
  partitionAllowlistedFindings,
  nodeText,
  lineAndColumn,
  relativeToRoot,
  isSimpleDefaultExpression,
  listPackageManifests,
  readSourceFileRecords,
  walkAuditSourceFiles,
  readJsonFile,
} from '@liteship/audit';
export type { PackageManifestInfo, SourceFileRecord } from '@liteship/audit';

export interface InventoryFileRecord {
  readonly absolutePath: string;
  readonly relativePath: string;
  readonly text: string;
}

/** The LiteShip repo root — this file lives at scripts/audit, two dirs down. */
export const repoRoot = normalizeRepoPath(resolve(import.meta.dirname, '..', '..'));

export function isDirectExecution(moduleUrl: string): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return moduleUrl === pathToFileURL(entry).href;
}

export function writeTextFile(filePath: string, content: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  writeFileSync(tempPath, content);
  renameSync(tempPath, filePath);
}

function walkTrackedFilesWithGit(root: string): readonly string[] {
  const output = execFileSync('git', ['ls-files'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });

  return output
    .split(/\r?\n/u)
    .map((line) => normalizeRepoPath(line.trim()))
    .filter((line) => line.length > 0);
}

function walkTrackedFilesWithGlob(root: string): readonly string[] {
  return fg
    .sync(['**/*'], {
      cwd: root,
      absolute: false,
      onlyFiles: true,
      dot: true,
      ignore: [...auditIgnoreGlobs],
    })
    .map((file) => normalizeRepoPath(file))
    .sort((a, b) => a.localeCompare(b));
}

export function walkAllFiles(root = repoRoot): readonly string[] {
  return fg
    .sync(['**/*'], {
      cwd: root,
      absolute: false,
      onlyFiles: true,
      dot: true,
    })
    .map((file) => normalizeRepoPath(file))
    .sort((a, b) => a.localeCompare(b));
}

export function walkTrackedFiles(root = repoRoot): readonly string[] {
  try {
    return walkTrackedFilesWithGit(root);
  } catch {
    return walkTrackedFilesWithGlob(root);
  }
}

export function walkHicpInventoryFiles(root = repoRoot): readonly string[] {
  const tracked = walkTrackedFiles(root);

  return tracked.filter((relativePath) => matchesHicpInventory(relativePath));
}

export function readInventoryFileRecords(root = repoRoot): readonly InventoryFileRecord[] {
  return walkHicpInventoryFiles(root).map((relativePath) => {
    const absolutePath = normalizeRepoPath(resolve(root, relativePath));
    return {
      absolutePath,
      relativePath,
      text: readFileSync(absolutePath, 'utf8'),
    };
  });
}
