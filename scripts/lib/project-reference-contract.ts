/**
 * Static workspace-import to TypeScript project-reference closure.
 *
 * Native `tsc --build` may schedule sibling projects concurrently. A package
 * therefore cannot rely on catalog order or stale `dist/` output to make an
 * undeclared workspace build edge happen to resolve.
 *
 * @module
 */

import { posix } from 'node:path';
import ts from 'typescript';

export interface ProjectReferenceCatalogRecord {
  readonly name: string;
  readonly dir: string;
  readonly runtimeSurface: 'module' | 'types-only';
}

export interface ProjectReferenceConfig {
  readonly references?: readonly { readonly path: string }[];
}

export interface ProjectReferenceSource {
  readonly path: string;
  readonly text: string;
}

export interface ProjectReferenceFinding {
  readonly copy: string;
  readonly detail: string;
  readonly packageName: string;
  readonly dependency: string;
  readonly importers: readonly string[];
}

function normalizeRepoPath(path: string): string {
  return posix.normalize(path.replaceAll('\\', '/')).replace(/^\.\//, '');
}

function workspacePackageName(specifier: string): string | null {
  if (specifier === 'liteship' || specifier.startsWith('liteship/')) return 'liteship';
  return /^(@liteship\/[^/]+)/.exec(specifier)?.[1] ?? null;
}

/** Static imports, re-exports, and import-type expressions that require declarations at build time. */
export function staticModuleSpecifiers(source: ProjectReferenceSource): readonly string[] {
  const kind = source.path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const ast = ts.createSourceFile(source.path, source.text, ts.ScriptTarget.Latest, true, kind);
  const specifiers: string[] = [];
  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal)
    ) {
      specifiers.push(node.argument.literal.text);
    }
    // Dynamic import() is deliberately not a project edge: LiteShip uses it for
    // guarded optional integrations such as CLI -> MCP, backed by ambient types.
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return [...new Set(specifiers)].sort((left, right) => left.localeCompare(right));
}

/**
 * Report every static workspace import whose owning package is absent from the
 * importing package's TypeScript project references.
 *
 * Declaration-only packages are excluded: `_spine` is consumed through its
 * published `.d.ts` paths and intentionally is not a composite build project.
 */
export function validateProjectReferenceClosure(
  catalog: readonly ProjectReferenceCatalogRecord[],
  configs: ReadonlyMap<string, ProjectReferenceConfig>,
  sources: readonly ProjectReferenceSource[],
): readonly ProjectReferenceFinding[] {
  const byName = new Map(catalog.map((record) => [record.name, record] as const));
  const byDir = new Map(catalog.map((record) => [normalizeRepoPath(record.dir), record.name] as const));
  const findings: ProjectReferenceFinding[] = [];

  for (const record of catalog) {
    const packageDir = normalizeRepoPath(record.dir);
    const config = configs.get(packageDir);
    if (config === undefined) continue;
    const referencedPackages = new Set(
      (config.references ?? [])
        .map((reference) => byDir.get(normalizeRepoPath(posix.join(packageDir, reference.path))))
        .filter((name): name is string => name !== undefined),
    );
    const importersByDependency = new Map<string, string[]>();
    const sourcePrefix = `${packageDir}/src/`;

    for (const source of sources) {
      const path = normalizeRepoPath(source.path);
      if (!path.startsWith(sourcePrefix) || !/\.tsx?$/.test(path)) continue;
      for (const specifier of staticModuleSpecifiers({ path, text: source.text })) {
        const dependency = workspacePackageName(specifier);
        const dependencyRecord = dependency === null ? undefined : byName.get(dependency);
        if (
          dependencyRecord === undefined ||
          dependency === record.name ||
          dependencyRecord.runtimeSurface === 'types-only' ||
          referencedPackages.has(dependency)
        ) {
          continue;
        }
        const importers = importersByDependency.get(dependency) ?? [];
        importers.push(path);
        importersByDependency.set(dependency, importers);
      }
    }

    for (const [dependency, importerPaths] of importersByDependency) {
      const importers = [...new Set(importerPaths)].sort((left, right) => left.localeCompare(right));
      findings.push({
        copy: `${packageDir}/tsconfig.json`,
        detail: `static workspace import ${dependency} is missing from project references (imported by ${importers.join(', ')})`,
        packageName: record.name,
        dependency,
        importers,
      });
    }
  }

  return findings.sort(
    (left, right) =>
      left.packageName.localeCompare(right.packageName) || left.dependency.localeCompare(right.dependency),
  );
}
