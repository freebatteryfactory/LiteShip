/**
 * Workspace dependency completeness — every cross-package import is declared.
 *
 * pnpm links a workspace package into a consumer's `node_modules` only when
 * the consumer's `package.json` declares it. An undeclared `@liteship/*`
 * import still resolves on a warm machine (hoisting, stale links, prior
 * installs) and then fails the clean-checkout build with TS2307 — observed on
 * CI run 30157749762 (`packages/vite/src/hmr.ts` importing `@liteship/web`
 * without a declaration). This contract enumerates every workspace package,
 * extracts every module specifier its sources reference (type-only included:
 * the typechecker resolves those through `node_modules` too), and reports any
 * workspace-package specifier absent from the importer's declared
 * dependencies.
 *
 * One deliberate exception exists and is carried, not ignored: a DYNAMIC-only
 * undeclared workspace import (`await import('@liteship/x')` behind an
 * injectable seam, e.g. the CLI's optional `@liteship/mcp-server` sibling) is
 * a designed optionality pattern — it cannot fail the build and its absence
 * is handled at the call site. Those edges are enumerated in the receipt as
 * `optionalDynamicImports` so they can never hide, but only STATIC undeclared
 * imports (which provably fail the cold build) are findings.
 *
 * Pure classifier over injected sources; the gate applies it to the live tree.
 *
 * @module
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve, sep } from 'node:path';
import ts from 'typescript';

const portable = (path: string): string => path.split(sep).join('/').replaceAll('\\', '/');

/** One workspace package's declaration surface. */
export interface WorkspacePackageSubject {
  readonly name: string;
  /** Repo-relative package directory. */
  readonly dir: string;
  /** Every dependency name declared in any dependency field. */
  readonly declared: readonly string[];
}

/** One undeclared cross-package import. */
export interface DependencyFinding {
  readonly kind: 'undeclared-workspace-import' | 'undeclared-workspace-import-dynamic';
  /** The importing package's name. */
  readonly package: string;
  /** Repo-relative importing file. */
  readonly file: string;
  /** The workspace specifier as written. */
  readonly specifier: string;
  /** The workspace package the specifier resolves to. */
  readonly dependency: string;
}

/** One dynamic-only undeclared workspace edge (designed optionality, enumerated). */
export interface OptionalDynamicImport {
  readonly package: string;
  readonly file: string;
  readonly dependency: string;
}

/** One statically enumerated cross-workspace source edge. */
export interface WorkspaceImportSubject {
  readonly package: string;
  readonly file: string;
  readonly specifier: string;
  readonly dependency: string;
  readonly binding: 'static' | 'dynamic';
  readonly declared: boolean;
  readonly exempt: boolean;
}

/** Complete current-head subject coverage for the dependency authority. */
export interface WorkspaceDependencyReceipt {
  readonly enumerator: 'workspace-package-source-imports';
  readonly censusDigest: `sha256:${string}`;
  readonly subjects: readonly WorkspacePackageSubject[];
  readonly imports: readonly WorkspaceImportSubject[];
  readonly findings: readonly DependencyFinding[];
  readonly optionalDynamicImports: readonly OptionalDynamicImport[];
}

const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const;

/** One module reference and how it binds: statically (build-time) or dynamically. */
export interface ModuleSpecifierEdge {
  readonly specifier: string;
  readonly binding: 'static' | 'dynamic';
}

/** Extract every module specifier edge (static, re-export, and dynamic) from one source. */
export function moduleSpecifierEdges(fileName: string, source: string): readonly ModuleSpecifierEdge[] {
  const parsed = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const edges: ModuleSpecifierEdge[] = [];
  for (const statement of parsed.statements) {
    if (
      (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
      statement.moduleSpecifier !== undefined &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      edges.push({ specifier: statement.moduleSpecifier.text, binding: 'static' });
    }
  }
  const visit = (node: ts.Node): void => {
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
      edges.push({ specifier: node.argument.literal.text, binding: 'static' });
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0 &&
      ts.isStringLiteralLike(node.arguments[0]!)
    ) {
      edges.push({ specifier: node.arguments[0].text, binding: 'dynamic' });
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(parsed, visit);
  return Object.freeze(edges);
}

/** The package name a bare specifier addresses (`@scope/name/sub` -> `@scope/name`). */
export function specifierPackageName(specifier: string): string | null {
  if (specifier.startsWith('.') || specifier.startsWith('node:')) return null;
  const segments = specifier.split('/');
  if (specifier.startsWith('@')) return segments.length >= 2 ? `${segments[0]}/${segments[1]}` : null;
  return segments[0] ?? null;
}

/**
 * Apply the completeness law to one package's sources: every specifier that
 * addresses another workspace package must be declared by the importer.
 */
export function evaluatePackageImports(
  subject: WorkspacePackageSubject,
  sources: readonly { readonly file: string; readonly text: string }[],
  workspaceNames: ReadonlySet<string>,
  dynamicImportExemptions: ReadonlySet<string> = new Set(),
): {
  readonly findings: readonly DependencyFinding[];
  readonly optional: readonly OptionalDynamicImport[];
  readonly imports: readonly WorkspaceImportSubject[];
} {
  const declared = new Set(subject.declared);
  const findings: DependencyFinding[] = [];
  const optional: OptionalDynamicImport[] = [];
  const imports: WorkspaceImportSubject[] = [];
  const seen = new Set<string>();
  for (const { file, text } of sources) {
    const undeclaredEdges = new Map<string, { specifier: string; hasStatic: boolean }>();
    for (const edge of moduleSpecifierEdges(file, text)) {
      const dependency = specifierPackageName(edge.specifier);
      if (dependency === null || dependency === subject.name) continue;
      if (!workspaceNames.has(dependency)) continue;
      const exemptionKey = `${subject.name} -> ${dependency}`;
      imports.push(
        Object.freeze({
          package: subject.name,
          file,
          specifier: edge.specifier,
          dependency,
          binding: edge.binding,
          declared: declared.has(dependency),
          exempt: edge.binding === 'dynamic' && dynamicImportExemptions.has(exemptionKey),
        }),
      );
      if (declared.has(dependency)) continue;
      const existing = undeclaredEdges.get(dependency);
      if (existing === undefined) {
        undeclaredEdges.set(dependency, { specifier: edge.specifier, hasStatic: edge.binding === 'static' });
      } else if (edge.binding === 'static') {
        existing.hasStatic = true;
      }
    }
    for (const [dependency, edge] of undeclaredEdges) {
      const key = `${file} ${dependency}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (edge.hasStatic) {
        findings.push(
          Object.freeze({
            kind: 'undeclared-workspace-import',
            package: subject.name,
            file,
            specifier: edge.specifier,
            dependency,
          }),
        );
      } else if (dynamicImportExemptions.has(`${subject.name} -> ${dependency}`)) {
        optional.push(Object.freeze({ package: subject.name, file, dependency }));
      } else {
        findings.push(
          Object.freeze({
            kind: 'undeclared-workspace-import-dynamic',
            package: subject.name,
            file,
            specifier: edge.specifier,
            dependency,
          }),
        );
      }
    }
  }
  return Object.freeze({
    findings: Object.freeze(findings),
    optional: Object.freeze(optional),
    imports: Object.freeze(imports),
  });
}

function* walkSourceFiles(root: string): Generator<string> {
  for (const entry of readdirSync(root, { withFileTypes: true }).sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      yield* walkSourceFiles(full);
    } else if (/\.[cm]?tsx?$/u.test(entry.name) && !/\.d\.[cm]?ts$/u.test(entry.name)) {
      yield full;
    }
  }
}

/** Build the complete receipt for the live repository. */
export function buildWorkspaceDependencyReceipt(
  repoRoot: string,
  dynamicImportExemptions: ReadonlySet<string> = new Set(),
): WorkspaceDependencyReceipt {
  const packagesDir = resolve(repoRoot, 'packages');
  const subjects: WorkspacePackageSubject[] = [];
  const sourcesByPackage = new Map<string, { readonly file: string; readonly text: string }[]>();

  if (existsSync(packagesDir)) {
    for (const entry of readdirSync(packagesDir).sort()) {
      const dir = resolve(packagesDir, entry);
      const manifestPath = join(dir, 'package.json');
      if (!statSync(dir).isDirectory() || !existsSync(manifestPath)) continue;
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
        readonly name?: string;
      } & Partial<Record<(typeof DEPENDENCY_FIELDS)[number], Readonly<Record<string, string>>>>;
      if (manifest.name === undefined) continue;
      const declared = [...new Set(DEPENDENCY_FIELDS.flatMap((field) => Object.keys(manifest[field] ?? {})))].sort();
      subjects.push(
        Object.freeze({ name: manifest.name, dir: `packages/${entry}`, declared: Object.freeze(declared) }),
      );

      const srcDir = join(dir, 'src');
      const sources: { readonly file: string; readonly text: string }[] = [];
      if (existsSync(srcDir)) {
        for (const file of walkSourceFiles(srcDir)) {
          sources.push({
            file: portable(file.slice(repoRoot.length + 1)),
            text: readFileSync(file, 'utf8'),
          });
        }
      }
      sourcesByPackage.set(manifest.name, sources);
    }
  }

  const workspaceNames = new Set(subjects.map((subject) => subject.name));
  const findings: DependencyFinding[] = [];
  const optionalDynamicImports: OptionalDynamicImport[] = [];
  const imports: WorkspaceImportSubject[] = [];
  for (const subject of subjects) {
    const evaluated = evaluatePackageImports(
      subject,
      sourcesByPackage.get(subject.name) ?? [],
      workspaceNames,
      dynamicImportExemptions,
    );
    findings.push(...evaluated.findings);
    optionalDynamicImports.push(...evaluated.optional);
    imports.push(...evaluated.imports);
  }
  const digest = createHash('sha256')
    .update(
      JSON.stringify({
        subjects: subjects.map((subject) => ({ name: subject.name, declared: subject.declared })),
        imports,
        dynamicImportExemptions: [...dynamicImportExemptions].sort(),
      }),
    )
    .digest('hex');
  return Object.freeze({
    enumerator: 'workspace-package-source-imports',
    censusDigest: `sha256:${digest}`,
    subjects: Object.freeze(subjects),
    imports: Object.freeze(imports),
    findings: Object.freeze(findings),
    optionalDynamicImports: Object.freeze(optionalDynamicImports),
  });
}
