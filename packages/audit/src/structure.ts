/**
 * Structure audit pass (CUT D9b-1, relocated from scripts/audit) — package
 * topology, manifest/import resolution, orphan + symbol-orphan evidence, and the
 * CUT A0 self-trust coverage classification. Profile-driven (CUT D9a):
 * `profile.repoRoot` is the authoritative audit target.
 *
 * @module
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';
import { normalizeRepoPath } from './policy.js';
import { liteshipDevopsProfile } from './devops-profile.js';
import type { DevopsProfile } from './devops-profile.js';
import {
  defaultRoot,
  lineAndColumn,
  listPackageManifests,
  partitionAllowlistedFindings,
  readSourceFileRecords,
  relativeToRoot,
} from './shared.js';
import type {
  AllowlistUnexercisedEntry,
  AuditFinding,
  AuditSectionResult,
  StructureCoverageClassification,
  TopologyCoverageEntry,
} from './types.js';

export interface StructureSummary {
  readonly packageCount: number;
  readonly sourceFileCount: number;
  readonly internalImportEdges: number;
  readonly externalImportCount: number;
  readonly publicExportCount: number;
  readonly orphanCandidateCount: number;
  readonly defaultExportCount: number;
  readonly packageEdges: readonly {
    readonly from: string;
    readonly to: string;
    readonly count: number;
  }[];
  /**
   * Audit self-trust classification (CUT A0): how each structure check was
   * actually evaluated, so `0` findings cannot be read as proof where the check
   * is policy-absent or only a file-level proxy.
   */
  readonly coverageClassification: StructureCoverageClassification;
}

interface ExportedSymbol {
  readonly file: string;
  readonly packageName: string;
  readonly name: string;
  readonly line: number;
  readonly column: number;
}

interface ResolvedImport {
  readonly specifier: string;
  readonly targetFile: string | null;
  readonly targetPackage: string | null;
  readonly kind: 'relative' | 'internal-package' | 'external';
}

interface PackageExportTarget {
  readonly [subpath: string]: string;
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return ts.canHaveModifiers(node)
    ? (ts.getModifiers(node)?.some((modifier) => modifier.kind === kind) ?? false)
    : false;
}

function candidatePaths(basePath: string): readonly string[] {
  return [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.jsx`,
    resolve(basePath, 'index.ts'),
    resolve(basePath, 'index.tsx'),
  ];
}

function resolveRelativeImport(specifier: string, containingFile: string): string | null {
  const basePath = resolve(dirname(containingFile), specifier);
  for (const candidate of candidatePaths(basePath)) {
    const tsCandidate =
      candidate.endsWith('.js') && existsSync(candidate.replace(/\.js$/, '.ts'))
        ? candidate.replace(/\.js$/, '.ts')
        : candidate.endsWith('.jsx') && existsSync(candidate.replace(/\.jsx$/, '.tsx'))
          ? candidate.replace(/\.jsx$/, '.tsx')
          : candidate;
    if (existsSync(tsCandidate)) {
      return normalizeRepoPath(tsCandidate);
    }
  }
  return null;
}

function buildPackageExportTargets(root = defaultRoot()): Map<string, PackageExportTarget> {
  const targets = new Map<string, PackageExportTarget>();

  for (const pkg of listPackageManifests(root)) {
    const packageTargets: Record<string, string> = {};
    const entries = Object.entries(pkg.exports);

    for (const [subpath, rawValue] of entries) {
      if (typeof rawValue === 'string') {
        packageTargets[subpath] = normalizeRepoPath(resolve(pkg.dir, rawValue));
        continue;
      }

      if (rawValue && typeof rawValue === 'object') {
        const developmentPath = (rawValue as { development?: string }).development;
        const importPath = (rawValue as { import?: string }).import;
        if (developmentPath) {
          packageTargets[subpath] = normalizeRepoPath(resolve(pkg.dir, developmentPath));
          continue;
        }
        if (importPath) {
          packageTargets[subpath] = normalizeRepoPath(resolve(pkg.dir, importPath));
        }
      }
    }

    targets.set(pkg.name, packageTargets);
  }

  return targets;
}

function resolveInternalPackageImport(
  specifier: string,
  packageExportTargets: Map<string, PackageExportTarget>,
  internalPrefix: string,
): ResolvedImport {
  if (!specifier.startsWith(internalPrefix)) {
    return {
      specifier,
      targetFile: null,
      targetPackage: null,
      kind: 'external',
    };
  }

  const parts = specifier.split('/');
  const packageName = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
  const subpath = parts.length > 2 ? `./${parts.slice(2).join('/')}` : '.';
  const exports = packageExportTargets.get(packageName);

  if (!exports) {
    return {
      specifier,
      targetFile: null,
      targetPackage: packageName,
      kind: 'internal-package',
    };
  }

  const directMatch = exports[subpath];
  if (directMatch) {
    return {
      specifier,
      targetFile: normalizeRepoPath(directMatch),
      targetPackage: packageName,
      kind: 'internal-package',
    };
  }

  const wildcard = exports['./*'];
  if (wildcard) {
    const suffix = subpath.slice(2);
    return {
      specifier,
      targetFile: normalizeRepoPath(wildcard.replace('*', suffix)),
      targetPackage: packageName,
      kind: 'internal-package',
    };
  }

  if (subpath === '.') {
    return {
      specifier,
      targetFile: exports['.'] ?? null,
      targetPackage: packageName,
      kind: 'internal-package',
    };
  }

  return {
    specifier,
    targetFile: null,
    targetPackage: packageName,
    kind: 'internal-package',
  };
}

function resolveImport(
  specifier: string,
  containingFile: string,
  packageExportTargets: Map<string, PackageExportTarget>,
  internalPrefix: string,
): ResolvedImport {
  if (specifier.startsWith('.')) {
    return {
      specifier,
      targetFile: resolveRelativeImport(specifier, containingFile),
      targetPackage: null,
      kind: 'relative',
    };
  }

  return resolveInternalPackageImport(specifier, packageExportTargets, internalPrefix);
}

function exportedNamesFromNode(node: ts.Node): readonly { name: string; pos: number }[] {
  if (
    ts.isFunctionDeclaration(node) ||
    ts.isClassDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isEnumDeclaration(node)
  ) {
    return node.name ? [{ name: node.name.text, pos: node.name.getStart() }] : [];
  }

  if (ts.isVariableStatement(node)) {
    return node.declarationList.declarations
      .filter((declaration): declaration is ts.VariableDeclaration & { name: ts.Identifier } =>
        ts.isIdentifier(declaration.name),
      )
      .map((declaration) => ({
        name: declaration.name.text,
        pos: declaration.name.getStart(),
      }));
  }

  if (
    ts.isExportDeclaration(node) &&
    !node.moduleSpecifier &&
    node.exportClause &&
    ts.isNamedExports(node.exportClause)
  ) {
    return node.exportClause.elements.map((element) => ({
      name: element.name.text,
      pos: element.name.getStart(),
    }));
  }

  if (ts.isExportAssignment(node)) {
    return [{ name: 'default', pos: node.getStart() }];
  }

  return [];
}

export function runStructureAudit(
  profile: DevopsProfile = liteshipDevopsProfile,
): AuditSectionResult<StructureSummary> {
  // CUT D9a: `profile.repoRoot` is the single, authoritative audit target — no
  // parallel `root` param that could silently shadow it. Callers that want a
  // different tree derive a profile with `withRepoRoot(profile, root)`.
  const root = profile.repoRoot;
  const packageInfos = listPackageManifests(root);
  const packageByName = new Map(packageInfos.map((pkg) => [pkg.name, pkg] as const));
  const packageExportTargets = buildPackageExportTargets(root);
  const knownSurfaceFiles = new Set<string>([
    ...profile.surfacePolicy.astroRuntimeFiles,
    ...profile.surfacePolicy.astroClientDirectives.map(
      (directive) => `packages/astro/src/client-directives/${directive}.ts`,
    ),
    'packages/astro/src/middleware.ts',
    ...packageInfos.flatMap((pkg) =>
      Object.values(pkg.exports)
        .map((value) => {
          const candidate =
            typeof value === 'string'
              ? value
              : value && typeof value === 'object'
                ? ((value as { development?: string }).development ?? (value as { import?: string }).import ?? null)
                : null;
          if (!candidate || candidate.includes('*')) return null;
          return relativeToRoot(resolve(pkg.dir, candidate), root);
        })
        .filter((value): value is string => Boolean(value)),
    ),
  ]);
  const sourceRecords = readSourceFileRecords(root);
  const sourceByPath = new Map(sourceRecords.map((record) => [record.absolutePath, record] as const));

  const rawFindings: AuditFinding[] = [];
  const exportedSymbols: ExportedSymbol[] = [];
  const inboundReferences = new Map<string, Set<string>>();
  const inboundFiles = new Set<string>();
  const packageEdges = new Map<string, number>();
  let externalImportCount = 0;
  let internalImportEdges = 0;
  let defaultExportCount = 0;

  for (const record of sourceRecords) {
    const packageInfo = record.packageName ? packageByName.get(record.packageName) : null;
    if (!packageInfo) continue;

    const visit = (node: ts.Node): void => {
      if (
        (ts.isFunctionDeclaration(node) ||
          ts.isClassDeclaration(node) ||
          ts.isInterfaceDeclaration(node) ||
          ts.isTypeAliasDeclaration(node) ||
          ts.isEnumDeclaration(node) ||
          ts.isVariableStatement(node) ||
          ts.isExportDeclaration(node) ||
          ts.isExportAssignment(node)) &&
        (hasModifier(node, ts.SyntaxKind.ExportKeyword) || ts.isExportDeclaration(node) || ts.isExportAssignment(node))
      ) {
        for (const symbol of exportedNamesFromNode(node)) {
          const { line, column } = lineAndColumn(record.sourceFile, symbol.pos);
          exportedSymbols.push({
            file: record.relativePath,
            packageName: packageInfo.name,
            name: symbol.name,
            line,
            column,
          });

          if (symbol.name === 'default') {
            defaultExportCount += 1;
            rawFindings.push({
              id: `structure/default-export/${record.relativePath}:${line}:${column}`,
              section: 'structure',
              rule: 'default-export',
              severity: 'warning',
              title: 'Default export found in package source',
              summary: 'czap standardizes on named exports; this default export should be justified or removed.',
              location: {
                file: record.relativePath,
                line,
                column,
              },
              metadata: {
                packageName: packageInfo.name,
              },
            });
          }
        }
      }

      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const specifier = node.moduleSpecifier.text;
        const resolved = resolveImport(
          specifier,
          record.absolutePath,
          packageExportTargets,
          profile.internalPackagePrefix,
        );

        if (resolved.kind === 'external') {
          externalImportCount += 1;
        }

        if (resolved.kind === 'relative' && !resolved.targetFile) {
          const { line, column } = lineAndColumn(record.sourceFile, node.moduleSpecifier.getStart());
          rawFindings.push({
            id: `structure/unresolved-relative/${record.relativePath}:${line}:${column}`,
            section: 'structure',
            rule: 'unresolved-internal-import',
            severity: 'error',
            title: 'Unresolved relative import',
            summary: `Could not resolve relative import "${specifier}".`,
            location: {
              file: record.relativePath,
              line,
              column,
            },
          });
        }

        if (resolved.kind === 'internal-package') {
          internalImportEdges += 1;
          const { line, column } = lineAndColumn(record.sourceFile, node.moduleSpecifier.getStart());
          if (!resolved.targetPackage || !packageByName.has(resolved.targetPackage)) {
            rawFindings.push({
              id: `structure/unknown-package/${record.relativePath}:${line}:${column}`,
              section: 'structure',
              rule: 'unknown-internal-package',
              severity: 'error',
              title: 'Unknown internal package import',
              summary: `Import "${specifier}" does not resolve to a known workspace package.`,
              location: {
                file: record.relativePath,
                line,
                column,
              },
            });
          } else {
            const edgeKey = `${packageInfo.name} -> ${resolved.targetPackage}`;
            packageEdges.set(edgeKey, (packageEdges.get(edgeKey) ?? 0) + 1);

            if (
              resolved.targetPackage !== packageInfo.name &&
              !packageInfo.dependencies.includes(resolved.targetPackage)
            ) {
              rawFindings.push({
                id: `structure/manifest-mismatch/${record.relativePath}:${line}:${column}`,
                section: 'structure',
                rule: 'missing-manifest-dependency',
                severity: 'warning',
                title: 'Workspace import missing from package manifest',
                summary: `Package ${packageInfo.name} imports ${resolved.targetPackage} but does not declare it in package.json.`,
                location: {
                  file: record.relativePath,
                  line,
                  column,
                },
                metadata: {
                  packageName: packageInfo.name,
                  targetPackage: resolved.targetPackage,
                },
              });
            }

            const policy = profile.packageTopology[packageInfo.name];
            if (
              resolved.targetPackage !== packageInfo.name &&
              policy &&
              !policy.allowedInternalImports.includes(resolved.targetPackage)
            ) {
              rawFindings.push({
                id: `structure/layer-violation/${record.relativePath}:${line}:${column}`,
                section: 'structure',
                rule: 'package-topology',
                severity: 'error',
                title: 'Package import violates audit topology',
                summary: `Package ${packageInfo.name} is not expected to import ${resolved.targetPackage} in the repo-native topology.`,
                location: {
                  file: record.relativePath,
                  line,
                  column,
                },
                metadata: {
                  packageName: packageInfo.name,
                  targetPackage: resolved.targetPackage,
                },
              });
            }
          }
        }

        const referencedNames = new Set<string>();
        if (ts.isImportDeclaration(node)) {
          const clause = node.importClause;
          if (clause?.name) {
            referencedNames.add('default');
          }
          if (clause?.namedBindings) {
            if (ts.isNamespaceImport(clause.namedBindings)) {
              referencedNames.add('*');
            } else {
              clause.namedBindings.elements.forEach((element) => {
                referencedNames.add(element.propertyName?.text ?? element.name.text);
              });
            }
          }
          if (!clause) {
            referencedNames.add('*');
          }
        } else if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          node.exportClause.elements.forEach((element) => {
            referencedNames.add(element.propertyName?.text ?? element.name.text);
          });
        } else {
          referencedNames.add('*');
        }

        if (resolved.targetFile && sourceByPath.has(resolved.targetFile)) {
          const targetRelativePath = relativeToRoot(resolved.targetFile, root);
          const refs = inboundReferences.get(targetRelativePath) ?? new Set<string>();
          referencedNames.forEach((name) => refs.add(name));
          inboundReferences.set(targetRelativePath, refs);
          inboundFiles.add(targetRelativePath);
        }
      }

      // Dynamic import — `import('@czap/...')`. The static branches above only
      // visit import/export DECLARATIONS, so a dynamic package import would slip
      // past the manifest audit entirely (the seam the cli↔mcp cycle hid behind).
      // A1-T3: surface pkg→pkg dynamic imports of a workspace package that the
      // importer doesn't declare in package.json and isn't on the exemption list.
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments.length > 0 &&
        ts.isStringLiteral(node.arguments[0]!)
      ) {
        const specifier = node.arguments[0]!.text;
        const resolved = resolveImport(
          specifier,
          record.absolutePath,
          packageExportTargets,
          profile.internalPackagePrefix,
        );
        if (
          resolved.kind === 'internal-package' &&
          resolved.targetPackage &&
          resolved.targetPackage !== packageInfo.name &&
          packageByName.has(resolved.targetPackage)
        ) {
          const edgeKey = `${packageInfo.name} -> ${resolved.targetPackage}`;
          if (
            !packageInfo.dependencies.includes(resolved.targetPackage) &&
            !profile.dynamicImportExemptions.has(edgeKey)
          ) {
            const { line, column } = lineAndColumn(record.sourceFile, node.arguments[0]!.getStart());
            rawFindings.push({
              id: `structure/manifest-mismatch-dynamic/${record.relativePath}:${line}:${column}`,
              section: 'structure',
              rule: 'missing-manifest-dependency-dynamic',
              severity: 'warning',
              title: 'Dynamic workspace import missing from package manifest',
              summary: `Package ${packageInfo.name} dynamically imports ${resolved.targetPackage} but neither declares it in package.json nor is the edge exempt (the profile's dynamicImportExemptions).`,
              location: { file: record.relativePath, line, column },
              metadata: { packageName: packageInfo.name, targetPackage: resolved.targetPackage },
            });
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(record.sourceFile);
  }

  for (const symbol of exportedSymbols) {
    if (symbol.name === 'default' || symbol.file.endsWith('/index.ts')) continue;
    if (knownSurfaceFiles.has(symbol.file)) continue;
    if (inboundFiles.has(symbol.file)) continue;
    const inbound = inboundReferences.get(symbol.file);
    if (inbound?.has(symbol.name) || inbound?.has('*')) continue;

    rawFindings.push({
      id: `structure/orphan-export/${symbol.file}:${symbol.line}:${symbol.column}:${symbol.name}`,
      section: 'structure',
      rule: 'orphan-export-candidate',
      severity: 'info',
      title: 'Exported symbol has no in-repo consumers',
      summary: `Export "${symbol.name}" is not imported or re-exported by another source file in the repository.`,
      location: {
        file: symbol.file,
        line: symbol.line,
        column: symbol.column,
      },
      metadata: {
        packageName: symbol.packageName,
        symbol: symbol.name,
      },
    });
  }

  // CUT A6 — symbol-level orphan evidence. The loop above is file-level: it
  // clears every export of a file once any import resolves to it. Here we go
  // finer — for each exported symbol in a file that IS reached, check whether
  // the exact name is referenced (or re-exported by a barrel). Exact-name hits
  // are consumed; a namespace/`*` import is broad coverage, not exact proof;
  // the rest are exported-but-unconsumed despite the file being reached — the
  // gap the file-level proxy launders. Never-imported files are already covered
  // by the file-level finding above, so they are skipped here (no double-count).
  let symbolConsumedCount = 0;
  let symbolStarCoveredCount = 0;
  for (const symbol of exportedSymbols) {
    if (symbol.name === 'default' || symbol.file.endsWith('/index.ts')) continue;
    if (knownSurfaceFiles.has(symbol.file)) continue;
    if (!inboundFiles.has(symbol.file)) continue;
    const inbound = inboundReferences.get(symbol.file);
    if (inbound?.has(symbol.name)) {
      symbolConsumedCount += 1;
      continue;
    }
    if (inbound?.has('*')) {
      symbolStarCoveredCount += 1;
      continue;
    }
    rawFindings.push({
      id: `structure/symbol-orphan/${symbol.file}:${symbol.line}:${symbol.column}:${symbol.name}`,
      section: 'structure',
      rule: 'symbol-orphan-candidate',
      severity: 'info',
      title: 'Exported symbol unused despite its file being imported',
      summary: `Export "${symbol.name}" in ${symbol.file} is never referenced by name; the file is reached only via other exports (or a namespace import). File-level orphan detection clears it — symbol-level evidence does not.`,
      location: { file: symbol.file, line: symbol.line, column: symbol.column },
      metadata: { packageName: symbol.packageName, symbol: symbol.name, evidence: 'symbol-level' },
    });
  }

  const partitioned = partitionAllowlistedFindings(rawFindings);
  const packageEdgeSummary = [...packageEdges.entries()]
    .map(([edge, count]) => {
      const [from, to] = edge.split(' -> ');
      return {
        from: from!,
        to: to!,
        count,
      };
    })
    .sort(
      (left, right) =>
        right.count - left.count || left.from.localeCompare(right.from) || left.to.localeCompare(right.to),
    );

  const orphanCandidateCount = partitioned.findings.filter(
    (finding) => finding.rule === 'orphan-export-candidate',
  ).length;
  const symbolOrphanCandidateCount = partitioned.findings.filter(
    (finding) => finding.rule === 'symbol-orphan-candidate',
  ).length;

  // CUT A0 — classify how each structure check was evaluated so a clean result
  // is never confused with an unchecked one. This does not change what is
  // allowed or flagged; it only reports coverage honestly.
  const edgeKeys = new Set(packageEdges.keys());
  const topology: TopologyCoverageEntry[] = packageInfos.map((pkg) => ({
    package: pkg.name,
    coverage: profile.packageTopology[pkg.name] ? 'clean' : 'policy-absent',
  }));
  const allowlistUnexercised: AllowlistUnexercisedEntry[] = packageInfos.flatMap((pkg) => {
    const policy = profile.packageTopology[pkg.name];
    if (!policy) return [];
    return policy.allowedInternalImports
      .filter((dependency) => dependency !== pkg.name && !edgeKeys.has(`${pkg.name} -> ${dependency}`))
      .map((dependency) => ({
        package: pkg.name,
        permitted: dependency,
        coverage: 'allowlisted' as const,
        exercised: false as const,
      }));
  });
  const coverageClassification: StructureCoverageClassification = {
    topology,
    orphan: {
      coverage: 'file-proxy-only',
      candidateCount: orphanCandidateCount,
      note: 'Orphan detection clears an entire file once any import resolves to it and skips index.ts files, so this count (including 0) does not prove every exported symbol has an in-repo consumer. The finer-grained truth is in `symbol` below (CUT A6).',
    },
    symbol: {
      coverage: 'symbol-evidenced',
      consumedCount: symbolConsumedCount,
      starCoveredCount: symbolStarCoveredCount,
      candidateCount: symbolOrphanCandidateCount,
      note: 'Symbol-level evidence (CUT A6): for each exported symbol in a file that IS imported, checks whether that exact name is referenced (or re-exported by a barrel). Exact-name hits are consumed; namespace/`*` imports are broad coverage, not exact proof; the remainder are exported-but-unconsumed despite the file being reached — the gap the file-level proxy launders. index.ts barrels, package entrypoints, and default exports are out of symbol scope; symbols in never-imported files stay with the file-level orphan finding. CONSUMER EVIDENCE IS PACKAGE-SOURCE ONLY — tests/ are not scanned — so a test-only helper or an intentionally-public export with no in-package by-name consumer also lands here. Treat candidates as a review list, not proof of deadness; allowlist the intentional ones (the profile) so they classify as suppressed-with-reason rather than silently cleared.',
    },
    allowlistUnexercised,
  };

  return {
    section: 'structure',
    summary: {
      packageCount: packageInfos.length,
      sourceFileCount: sourceRecords.length,
      internalImportEdges,
      externalImportCount,
      publicExportCount: exportedSymbols.length,
      orphanCandidateCount,
      defaultExportCount,
      packageEdges: packageEdgeSummary,
      coverageClassification,
    },
    findings: partitioned.findings,
    suppressed: partitioned.suppressed,
  };
}
