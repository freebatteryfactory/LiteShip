/**
 * Engine audit helpers (CUT D9b-1) — package-manifest + source-record reading,
 * finding counting/sorting, allowlist partitioning. These are the shared
 * primitives the three passes (structure/integrity/surface) sit on.
 *
 * `root` defaults to `process.cwd()` (evaluated at call time), so the engine
 * audits the caller's working tree unless a profile/explicit root says otherwise.
 * The repo-local report bundle (scripts/audit/shared.ts) keeps the LiteShip
 * `repoRoot` const + the HICP inventory walkers and re-exports these names.
 *
 * @module
 */
import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { IoError } from '@liteship/error';
import fg from 'fast-glob';
import ts from 'typescript';
import {
  auditIgnoreGlobs,
  auditSourceGlobs,
  defaultAnalyzableArtifacts,
  findAllowlistReason,
  normalizeRepoPath,
} from './policy.js';
import type { PackagePathResolver } from './policy.js';
import type { DevopsProfile } from './devops-profile.js';
import type { AuditCounts, AuditFinding, AuditSeverity, AuditSuppression, PackageArtifactCoverage } from './types.js';

/** Parsed package manifest plus its repository ownership path. */
export interface PackageManifestInfo {
  readonly name: string;
  readonly dir: string;
  readonly relativeDir: string;
  readonly srcDir: string;
  readonly packageJsonPath: string;
  readonly dependencies: readonly string[];
  readonly exports: Record<string, unknown>;
}

/** One discovered source file with normalized repository-relative identity. */
export interface SourceFileRecord {
  readonly absolutePath: string;
  readonly relativePath: string;
  readonly text: string;
  readonly sourceFile: ts.SourceFile;
  readonly packageName: string | null;
}

/** The audit target when no profile/root is supplied — the caller's cwd. */
export function defaultRoot(): string {
  return normalizeRepoPath(process.cwd());
}

/** Read one UTF-8 JSON file as host-selected data. */
export function readJsonFile<T>(filePath: string): T {
  // Node's bare SyntaxError/ENOENT names no file; the audit reads dozens.
  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as T;
  } catch (cause) {
    throw IoError(
      'readJsonFile',
      `Could not read ${filePath} as JSON: ${cause instanceof Error ? cause.message : String(cause)}`,
      { path: filePath, cause },
    );
  }
}

/** Discover executable source files under the audit root in stable order. */
export function walkAuditSourceFiles(root = defaultRoot()): readonly string[] {
  return fg
    .sync([...auditSourceGlobs], {
      cwd: root,
      absolute: true,
      onlyFiles: true,
      ignore: [...auditIgnoreGlobs],
    })
    .map((file) => normalizeRepoPath(file))
    .sort((a, b) => a.localeCompare(b));
}

function manifestInfoFromPackageJson(packageJsonPath: string, root: string): PackageManifestInfo {
  const manifest = readJsonFile<{
    name: string;
    exports?: Record<string, unknown>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  }>(packageJsonPath);
  const dir = normalizeRepoPath(dirname(packageJsonPath));
  const relativeDir = normalizeRepoPath(relative(root, dir));
  const dependencies = [
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
  ].sort((a, b) => a.localeCompare(b));

  return {
    name: manifest.name,
    dir,
    relativeDir,
    srcDir: `${dir}/src`,
    packageJsonPath: normalizeRepoPath(relative(root, packageJsonPath)),
    dependencies,
    exports: manifest.exports ?? {},
  };
}

/** Discover publishable and private package manifests in stable path order. */
export function listPackageManifests(root = defaultRoot()): readonly PackageManifestInfo[] {
  const packageJsons = fg
    .sync(['packages/*/package.json'], {
      cwd: root,
      absolute: true,
      onlyFiles: true,
    })
    .map((file) => normalizeRepoPath(file))
    .sort((a, b) => a.localeCompare(b));

  return packageJsons.map((packageJsonPath) => manifestInfoFromPackageJson(packageJsonPath, root));
}

/**
 * Profile-aware package discovery: with `profile.packageRoots`, enumerate
 * exactly those roots (the consumer-install seam — packages live under
 * node_modules, not `repoRoot/packages/*`); otherwise delegate to the
 * legacy monorepo glob, byte-identical to before.
 */
export function listProfilePackageManifests(profile: DevopsProfile): readonly PackageManifestInfo[] {
  if (!profile.packageRoots) {
    return listPackageManifests(profile.repoRoot);
  }

  return Object.values(profile.packageRoots)
    .map((pkgDir) => normalizeRepoPath(resolve(pkgDir, 'package.json')))
    .sort((a, b) => a.localeCompare(b))
    .map((packageJsonPath) => manifestInfoFromPackageJson(packageJsonPath, profile.repoRoot));
}

function sourceRecordFromFile(
  absolutePath: string,
  root: string,
  packageByDir: ReadonlyMap<string, string>,
): SourceFileRecord {
  const relativePath = normalizeRepoPath(relative(root, absolutePath));
  const text = readFileSync(absolutePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    absolutePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    absolutePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const packageName =
    [...packageByDir.entries()]
      .sort(([left], [right]) => right.length - left.length)
      .find(([packageDir]) => normalizeRepoPath(absolutePath).startsWith(packageDir + '/'))?.[1] ?? null;

  return {
    absolutePath,
    relativePath,
    text,
    sourceFile,
    packageName,
  };
}

/** Materialize normalized source records for all discovered audit files. */
export function readSourceFileRecords(root = defaultRoot()): readonly SourceFileRecord[] {
  const packageInfos = listPackageManifests(root);
  const packageByDir = new Map(packageInfos.map((pkg) => [pkg.dir, pkg.name] as const));

  return walkAuditSourceFiles(root).map((absolutePath) => sourceRecordFromFile(absolutePath, root, packageByDir));
}

function profileArtifactFiles(profile: DevopsProfile): ReadonlyMap<string, readonly string[]> {
  return new Map(
    listProfilePackageManifests(profile).map((pkg) => {
      const globs = profile.packageTopology[pkg.name]?.analyzableArtifacts ?? defaultAnalyzableArtifacts;
      const files = [
        ...new Set(
          fg.sync([...globs], {
            cwd: pkg.dir,
            absolute: true,
            onlyFiles: true,
            ignore: ['**/node_modules/**'],
          }),
        ),
      ]
        .map((file) => normalizeRepoPath(file))
        .sort((left, right) => left.localeCompare(right));
      return [pkg.name, files] as const;
    }),
  );
}

/**
 * Classify the exact package-relative artifact contract before any audit pass
 * can call a zero-file package clean.
 */
export function collectProfileArtifactCoverage(profile: DevopsProfile): readonly PackageArtifactCoverage[] {
  const filesByPackage = profileArtifactFiles(profile);
  return listProfilePackageManifests(profile).map((pkg): PackageArtifactCoverage => {
    const expectedArtifacts = [
      ...(profile.packageTopology[pkg.name]?.analyzableArtifacts ?? defaultAnalyzableArtifacts),
    ];
    const matchedFiles = (filesByPackage.get(pkg.name) ?? []).map((file) => normalizeRepoPath(relative(pkg.dir, file)));
    return matchedFiles.length > 0
      ? { package: pkg.name, coverage: 'analyzed', expectedArtifacts, matchedFiles }
      : {
          package: pkg.name,
          coverage: 'unverified',
          expectedArtifacts,
          reason: `No files matched the declared analyzable artifacts: ${expectedArtifacts.join(', ') || '(none)'}`,
        };
  });
}

/**
 * Profile-aware source walking. With `profile.packageRoots`, glob each
 * package's `src/` individually — the global `auditSourceGlobs` assume a
 * `packages/*` layout and `auditIgnoreGlobs` exclude `node_modules`, which
 * is exactly where consumer-installed packages live.
 */
export function readProfileSourceFileRecords(profile: DevopsProfile): readonly SourceFileRecord[] {
  const packageInfos = listProfilePackageManifests(profile);
  const packageByDir = new Map(packageInfos.map((pkg) => [pkg.dir, pkg.name] as const));
  const files = [...profileArtifactFiles(profile).values()].flat().sort((a, b) => a.localeCompare(b));

  return files.map((absolutePath) => sourceRecordFromFile(absolutePath, profile.repoRoot, packageByDir));
}

/** Fold findings into exact severity counts. */
export function createCounts(findings: readonly AuditFinding[]): AuditCounts {
  return findings.reduce<AuditCounts>(
    (counts, finding) => ({
      error: counts.error + (finding.severity === 'error' ? 1 : 0),
      warning: counts.warning + (finding.severity === 'warning' ? 1 : 0),
      info: counts.info + (finding.severity === 'info' ? 1 : 0),
    }),
    { error: 0, warning: 0, info: 0 },
  );
}

/** Compare audit severities from most to least release-significant. */
export function compareSeverity(a: AuditSeverity, b: AuditSeverity): number {
  const order: Record<AuditSeverity, number> = { error: 0, warning: 1, info: 2 };
  return order[a] - order[b];
}

/** Return findings in deterministic severity, rule, and location order. */
export function sortFindings<T extends AuditFinding>(findings: readonly T[]): T[] {
  return [...findings].sort((left, right) => {
    const severity = compareSeverity(left.severity, right.severity);
    if (severity !== 0) return severity;
    const leftFile = left.location?.file ?? '';
    const rightFile = right.location?.file ?? '';
    const fileCmp = leftFile.localeCompare(rightFile);
    if (fileCmp !== 0) return fileCmp;
    return left.id.localeCompare(right.id);
  });
}

/** Return suppressions in deterministic finding order. */
export function sortSuppressions<T extends AuditSuppression>(suppressions: readonly T[]): T[] {
  return [...suppressions].sort((left, right) => left.finding.id.localeCompare(right.finding.id));
}

/**
 * Map repo-relative finding paths to their owning package via the profile's
 * discovered manifests. Monorepo: `packages/astro/src/x.ts` → `@liteship/astro` +
 * `src/x.ts`. Consumer install: the same file resolves identically from its
 * `node_modules/.../@liteship/astro` root, so package-relative allowlist entries
 * suppress in both layouts. Longest root wins (pnpm virtual-store roots nest
 * under `node_modules/.pnpm/...`).
 */
export function createPackagePathResolver(profile: DevopsProfile): PackagePathResolver {
  const roots = listProfilePackageManifests(profile)
    .map((manifest) => ({ prefix: `${manifest.relativeDir}/`, name: manifest.name }))
    .sort((a, b) => b.prefix.length - a.prefix.length);

  return (file) => {
    for (const root of roots) {
      if (file.startsWith(root.prefix)) {
        return { packageName: root.name, packageRelativePath: file.slice(root.prefix.length) };
      }
    }
    return null;
  };
}

/** Partition raw findings through only the allowlist supplied by the host profile. */
export function partitionAllowlistedFindings(
  findings: readonly AuditFinding[],
  profile: DevopsProfile,
): {
  readonly findings: AuditFinding[];
  readonly suppressed: AuditSuppression[];
} {
  const active: AuditFinding[] = [];
  const suppressed: AuditSuppression[] = [];
  const resolvePackagePath = createPackagePathResolver(profile);

  for (const finding of findings) {
    const reason = findAllowlistReason(finding, profile.allowlist ?? [], resolvePackagePath);
    if (reason) {
      suppressed.push({
        rule: finding.rule,
        reason,
        finding,
      });
      continue;
    }
    active.push(finding);
  }

  return {
    findings: sortFindings(active),
    suppressed: sortSuppressions(suppressed),
  };
}

/** Read normalized source text for one TypeScript node. */
export function nodeText(node: ts.Node, sourceFile: ts.SourceFile): string {
  return node.getText(sourceFile);
}

/** Convert an absolute source position to one-based line and column coordinates. */
export function lineAndColumn(sourceFile: ts.SourceFile, position: number): { line: number; column: number } {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(position);
  return {
    line: line + 1,
    column: character + 1,
  };
}

/** Normalize an absolute path to a slash-separated audit-root path. */
export function relativeToRoot(filePath: string, root = defaultRoot()): string {
  return normalizeRepoPath(relative(root, filePath));
}

/** Test whether an export-default expression is statically safe to classify. */
export function isSimpleDefaultExpression(node: ts.Expression): boolean {
  return (
    ts.isArrayLiteralExpression(node) ||
    ts.isObjectLiteralExpression(node) ||
    node.kind === ts.SyntaxKind.NullKeyword ||
    node.kind === ts.SyntaxKind.TrueKeyword ||
    node.kind === ts.SyntaxKind.FalseKeyword ||
    ts.isNumericLiteral(node) ||
    ts.isStringLiteral(node) ||
    (ts.isIdentifier(node) && node.text === 'undefined')
  );
}
