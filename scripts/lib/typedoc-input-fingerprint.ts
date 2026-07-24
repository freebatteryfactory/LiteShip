import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import ts from 'typescript';

export const TYPEDOC_INPUT_FINGERPRINT_PATH = 'docs/api/.typedoc-input-fingerprint.json';

export interface TypeDocInputFingerprint {
  readonly schemaVersion: 1;
  readonly algorithm: 'sha256';
  readonly digest: `sha256:${string}`;
  readonly inputCount: number;
}

interface TypeDocConfigShape {
  readonly entryPoints?: readonly string[];
  readonly readme?: string;
}

export interface FingerprintInput {
  readonly path: string;
  readonly content: string;
}

const normalizeText = (text: string): string => text.replace(/\r\n?/g, '\n');
const normalizePath = (path: string): string => path.replace(/\\/g, '/');
const codeUnitCompare = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

function hasExportModifier(node: ts.Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    (ts
      .getModifiers(node)
      ?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword || modifier.kind === ts.SyntaxKind.DefaultKeyword,
      ) ??
      false)
  );
}

function isPublicTopLevelStatement(statement: ts.Statement): boolean {
  return ts.isExportDeclaration(statement) || ts.isExportAssignment(statement) || hasExportModifier(statement);
}

function bodyCanBeErased(node: ts.Node): node is ts.FunctionLikeDeclaration & { readonly body: ts.Block } {
  if (!ts.isFunctionLike(node) || node.body === undefined || !ts.isBlock(node.body)) return false;
  return (
    ts.isConstructorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    (('type' in node && node.type !== undefined) as boolean)
  );
}

function eraseImplementationBodies(source: string, root: ts.Node): string {
  const start = root.getFullStart();
  const end = root.getEnd();
  let projection = source.slice(start, end);
  const ranges: Array<readonly [number, number]> = [];
  const visit = (node: ts.Node): void => {
    if (bodyCanBeErased(node)) ranges.push([node.body.getStart() - start + 1, node.body.getEnd() - start - 1]);
    ts.forEachChild(node, visit);
  };
  visit(root);
  for (const [rangeStart, rangeEnd] of ranges.sort((left, right) => right[0] - left[0])) {
    // Preserve only line breaks: source-link positions after a multiline body
    // remain identity-bearing, while same-line implementation text does not.
    const lineBreaks = projection.slice(rangeStart, rangeEnd).replace(/[^\r\n]/g, '');
    projection = `${projection.slice(0, rangeStart)}${lineBreaks}${projection.slice(rangeEnd)}`;
  }
  return projection;
}

/**
 * Project the syntax that can affect TypeDoc without retaining ordinary
 * explicitly-typed function implementations. Declaration line numbers remain
 * in the projection because generated source links include them.
 */
export function projectTypeDocSource(path: string, sourceText: string): string {
  const source = normalizeText(sourceText);
  const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const declarations = sourceFile.statements.filter(isPublicTopLevelStatement).map((statement) => {
    const line = sourceFile.getLineAndCharacterOfPosition(statement.getStart(sourceFile)).line + 1;
    return `L${line}:${eraseImplementationBodies(source, statement).trim()}`;
  });
  const moduleDocs = [...source.matchAll(/\/\*\*[\s\S]*?\*\//g)]
    .map((match) => match[0])
    .filter((comment) => /@module\b/.test(comment));
  return [...moduleDocs, ...declarations].join('\n\u0000\n');
}

/** Pure, order-independent digest over already-collected inputs. */
export function fingerprintTypeDocInputs(inputs: readonly FingerprintInput[]): TypeDocInputFingerprint {
  const hash = createHash('sha256');
  const ordered = [...inputs].sort((left, right) =>
    codeUnitCompare(normalizePath(left.path), normalizePath(right.path)),
  );
  for (const input of ordered) {
    const path = normalizePath(input.path);
    const projection = path.endsWith('.ts') ? projectTypeDocSource(path, input.content) : normalizeText(input.content);
    hash.update(path, 'utf8');
    hash.update('\0', 'utf8');
    hash.update(projection, 'utf8');
    hash.update('\0', 'utf8');
  }
  return {
    schemaVersion: 1,
    algorithm: 'sha256',
    digest: `sha256:${hash.digest('hex')}`,
    inputCount: ordered.length,
  };
}

function walkTypeScriptFiles(directory: string): readonly string[] {
  const files: string[] = [];
  const visit = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.d.ts'))) files.push(path);
    }
  };
  visit(directory);
  return files;
}

/** Build the live fingerprint from typedoc.json's authored entry-point roots. */
export function buildTypeDocInputFingerprint(repoRoot: string): TypeDocInputFingerprint {
  const configPath = resolve(repoRoot, 'typedoc.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8')) as TypeDocConfigShape;
  if (config.entryPoints === undefined || config.entryPoints.length === 0) {
    throw new Error('typedoc-input-fingerprint: typedoc.json declares no entryPoints');
  }
  const roots = [...new Set(config.entryPoints.map((entry) => dirname(resolve(repoRoot, entry))))];
  const sourcePaths = [...new Set(roots.flatMap(walkTypeScriptFiles))];
  const authoredPaths = [configPath, ...(config.readme === undefined ? [] : [resolve(repoRoot, config.readme)])];
  const paths = [...sourcePaths, ...authoredPaths].filter(existsSync);
  return fingerprintTypeDocInputs(
    paths.map((path) => ({ path: normalizePath(relative(repoRoot, path)), content: readFileSync(path, 'utf8') })),
  );
}

export function serializeTypeDocInputFingerprint(fingerprint: TypeDocInputFingerprint): string {
  return `${JSON.stringify(fingerprint, null, 2)}\n`;
}

export function writeTypeDocInputFingerprint(repoRoot: string, outputPath?: string): TypeDocInputFingerprint {
  const fingerprint = buildTypeDocInputFingerprint(repoRoot);
  writeFileSync(
    outputPath ?? resolve(repoRoot, TYPEDOC_INPUT_FINGERPRINT_PATH),
    serializeTypeDocInputFingerprint(fingerprint),
    'utf8',
  );
  return fingerprint;
}

export function assertTypeDocInputFingerprint(repoRoot: string): TypeDocInputFingerprint {
  const manifestPath = resolve(repoRoot, TYPEDOC_INPUT_FINGERPRINT_PATH);
  if (!existsSync(manifestPath)) {
    throw new Error(`missing ${TYPEDOC_INPUT_FINGERPRINT_PATH}; run 'pnpm run docs:build'`);
  }
  const expected = serializeTypeDocInputFingerprint(buildTypeDocInputFingerprint(repoRoot));
  const actual = normalizeText(readFileSync(manifestPath, 'utf8'));
  if (actual !== expected) {
    throw new Error(
      `${TYPEDOC_INPUT_FINGERPRINT_PATH} is stale; public declarations, TSDoc, source-link lines, or TypeDoc configuration changed. Run 'pnpm run docs:build'.`,
    );
  }
  return JSON.parse(actual) as TypeDocInputFingerprint;
}
