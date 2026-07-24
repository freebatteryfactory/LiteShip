import ts from 'typescript';
import { posix } from 'node:path';
import {
  FACADE_SUBPATH_CONTRACT_SOURCE,
  ROOT_EXPORT_CONTRACT_SOURCE,
  type FacadeSubpathContract,
  type RootExportContract,
} from '../../packages/liteship/src/export-budget.js';

export type SurfaceAudience = 'beginner' | 'expert' | 'historical';
export type SurfaceRole = 'feature' | 'host-setup';
export type BeginnerConceptFamily = 'define' | 'apply' | 'inspect';

export interface BeginnerSurfaceSource {
  readonly id: string;
  readonly text: string;
  readonly audience: SurfaceAudience;
  readonly role: SurfaceRole;
  readonly format?: 'source' | 'markdown' | 'astro';
  readonly selectedHost?: `liteship/${string}`;
}

export interface BeginnerSurfaceViolation {
  readonly code:
    | 'raw-package-import'
    | 'foreign-facade-subpath'
    | 'root-export-outside-contract'
    | 'expert-concept'
    | 'multiple-root-imports'
    | 'hidden-setup-primitive';
  readonly sourceId: string;
  readonly detail: string;
}

export interface BeginnerSurfaceAnalysis {
  readonly conceptFamilies: readonly BeginnerConceptFamily[];
  readonly imports: readonly string[];
  readonly violations: readonly BeginnerSurfaceViolation[];
}

interface ExecutableSegment {
  readonly text: string;
  readonly astro: boolean;
}

interface AnalyzedSegment extends ExecutableSegment {
  readonly id: string;
  readonly moduleId: string;
  readonly scopeId: string;
  readonly source: BeginnerSurfaceSource;
  readonly script: string;
  readonly imports: readonly ImportRecord[];
  readonly constructed: ReadonlySet<string>;
  readonly localExports: readonly { local: string; exported: string }[];
}

interface ImportBinding {
  readonly exported: string;
  readonly local: string;
}

interface ImportRecord {
  readonly specifier: string;
  readonly bindings: readonly ImportBinding[];
}

const ROOT_CONTRACT = JSON.parse(ROOT_EXPORT_CONTRACT_SOURCE) as RootExportContract[];
const SUBPATH_CONTRACT = JSON.parse(FACADE_SUBPATH_CONTRACT_SOURCE) as FacadeSubpathContract[];
const ROOT_EXPORTS = new Set(ROOT_CONTRACT.map((entry) => entry.name));
const GOVERNED_SUBPATHS = new Set(SUBPATH_CONTRACT.map((entry) => entry.specifier));

/**
 * The three beginner families are not a second hand-authored vocabulary. They
 * are projected from the flagship root contract's user story.
 */
export function beginnerConceptFamiliesFromContract(): readonly BeginnerConceptFamily[] {
  const adaptive = ROOT_CONTRACT.find((entry) => entry.name === 'defineAdaptive');
  if (adaptive === undefined) throw new Error('defineAdaptive is absent from the root facade contract');
  const admitted = new Set<BeginnerConceptFamily>();
  for (const match of adaptive.userStory.toLowerCase().matchAll(/\b(define|apply|inspect)\b/g)) {
    admitted.add(match[1] as BeginnerConceptFamily);
  }
  return [...admitted].sort();
}

export function markdownSection(markdown: string, heading: string, nextHeading?: string): string {
  const start = markdown.indexOf(heading);
  if (start < 0) throw new Error(`missing markdown heading: ${heading}`);
  if (nextHeading === undefined) return markdown.slice(start);
  const end = markdown.indexOf(nextHeading, start + heading.length);
  if (end < 0) throw new Error(`missing markdown heading after ${heading}: ${nextHeading}`);
  return markdown.slice(start, end);
}

export function authoredLineCount(source: string): number {
  return source.split(/\r?\n/).filter((line) => line.trim() !== '' && !line.trim().startsWith('//')).length;
}

function executableSegments(source: BeginnerSurfaceSource): readonly ExecutableSegment[] {
  if (source.format !== 'markdown') {
    return [{ text: source.text, astro: source.format === 'astro' || source.id.endsWith('.astro') }];
  }
  const segments: ExecutableSegment[] = [];
  const fences = /^```([^\r\n]*)\r?\n([\s\S]*?)^```\s*$/gm;
  for (const match of source.text.matchAll(fences)) {
    const language = (match[1] ?? '').trim().toLowerCase();
    if (/^(?:ba)?sh|shell|console|text|plaintext$/.test(language)) continue;
    segments.push({ text: match[2] ?? '', astro: language === 'astro' });
  }
  return segments;
}

function scriptText(segment: ExecutableSegment): string {
  if (!segment.astro) return segment.text;
  const match = segment.text.match(/^\s*---\s*\r?\n([\s\S]*?)\r?\n---/);
  return match?.[1] ?? '';
}

function importsFrom(text: string, id: string): readonly ImportRecord[] {
  const file = ts.createSourceFile(id, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const imports: ImportRecord[] = [];
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const clause = statement.importClause;
    const bindings: ImportBinding[] = [];
    if (clause?.name !== undefined) bindings.push({ exported: 'default', local: clause.name.text });
    if (clause?.namedBindings !== undefined) {
      if (ts.isNamespaceImport(clause.namedBindings)) {
        bindings.push({ exported: '*', local: clause.namedBindings.name.text });
      } else {
        for (const element of clause.namedBindings.elements) {
          bindings.push({
            exported: element.propertyName?.text ?? element.name.text,
            local: element.name.text,
          });
        }
      }
    }
    imports.push({ specifier: statement.moduleSpecifier.text, bindings });
  }
  return imports;
}

function normalizedModuleId(id: string): string {
  return posix.normalize(id.replaceAll('\\', '/').replace(/[?#].*$/, ''));
}

function moduleStem(id: string): string {
  return normalizedModuleId(id).replace(/\.(?:[cm]?[jt]sx?|astro)$/, '');
}

function segmentModuleId(source: BeginnerSurfaceSource, segment: ExecutableSegment, index: number): string {
  if (source.format !== 'markdown') return normalizedModuleId(source.id);
  const authoredPath = scriptText(segment).match(/^\s*\/\/\s*([^\s]+\.(?:[cm]?[jt]sx?|astro))\s*$/m)?.[1];
  return authoredPath === undefined
    ? `${normalizedModuleId(source.id)}::segment-${index}`
    : normalizedModuleId(authoredPath);
}

function definitionFacts(
  text: string,
  id: string,
  imports: readonly ImportRecord[],
): Pick<AnalyzedSegment, 'constructed' | 'localExports'> {
  const file = ts.createSourceFile(id, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const defineBindings = new Set(
    imports
      .filter((record) => record.specifier === 'liteship')
      .flatMap((record) => record.bindings)
      .filter((binding) => binding.exported === 'defineAdaptive')
      .map((binding) => binding.local),
  );
  const constructed = new Set<string>();
  const localExports: { local: string; exported: string }[] = [];

  for (const statement of file.statements) {
    if (ts.isVariableStatement(statement)) {
      const exported = statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
      for (const declaration of statement.declarationList.declarations) {
        if (
          ts.isIdentifier(declaration.name) &&
          declaration.initializer !== undefined &&
          ts.isCallExpression(declaration.initializer) &&
          ts.isIdentifier(declaration.initializer.expression) &&
          defineBindings.has(declaration.initializer.expression.text)
        ) {
          constructed.add(declaration.name.text);
          if (exported) localExports.push({ local: declaration.name.text, exported: declaration.name.text });
        }
      }
      continue;
    }
    if (
      ts.isExportDeclaration(statement) &&
      statement.exportClause !== undefined &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const element of statement.exportClause.elements) {
        localExports.push({
          local: element.propertyName?.text ?? element.name.text,
          exported: element.name.text,
        });
      }
      continue;
    }
    if (ts.isExportAssignment(statement) && ts.isIdentifier(statement.expression)) {
      localExports.push({ local: statement.expression.text, exported: 'default' });
    }
  }
  return { constructed, localExports };
}

function resolveRelativeModule(
  importer: string,
  specifier: string,
  modules: ReadonlyMap<string, AnalyzedSegment>,
): string | undefined {
  const resolvedStem = moduleStem(posix.join(posix.dirname(normalizedModuleId(importer)), specifier));
  const exact = [...modules.keys()].find((candidate) => moduleStem(candidate) === resolvedStem);
  if (exact !== undefined) return exact;

  // Markdown examples often omit a virtual page filename. A unique basename is
  // still a deterministic relative named-import witness within that corpus.
  const basename = posix.basename(resolvedStem);
  const candidates = [...modules.keys()].filter((candidate) => posix.basename(moduleStem(candidate)) === basename);
  return candidates.length === 1 ? candidates[0] : undefined;
}

function adaptiveMethodFamilies(
  text: string,
  id: string,
  admitted: ReadonlySet<string>,
): ReadonlySet<BeginnerConceptFamily> {
  const file = ts.createSourceFile(id, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const families = new Set<BeginnerConceptFamily>();
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      admitted.has(node.expression.expression.text)
    ) {
      const method = node.expression.name.text;
      if (method === 'attrs' || method === 'plan') families.add('apply');
      if (method === 'explain') families.add('inspect');
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return families;
}

function markupMethodFamilies(text: string, admitted: ReadonlySet<string>): ReadonlySet<BeginnerConceptFamily> {
  const executable = withoutCommentsAndStrings(text);
  const families = new Set<BeginnerConceptFamily>();
  for (const receiver of admitted) {
    const escaped = receiver.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const calls = new RegExp(`\\b${escaped}\\s*\\.\\s*(attrs|plan|explain)\\s*\\(`, 'g');
    for (const match of executable.matchAll(calls)) {
      if (match[1] === 'attrs' || match[1] === 'plan') families.add('apply');
      if (match[1] === 'explain') families.add('inspect');
    }
  }
  return families;
}

function withoutCommentsAndStrings(text: string): string {
  return text
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1 ')
    .replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g, ' ');
}

function pushViolation(
  target: BeginnerSurfaceViolation[],
  sourceId: string,
  code: BeginnerSurfaceViolation['code'],
  detail: string,
): void {
  target.push({ code, sourceId, detail });
}

export function analyzeBeginnerSurface(sources: readonly BeginnerSurfaceSource[]): BeginnerSurfaceAnalysis {
  const families = new Set<BeginnerConceptFamily>();
  const imports = new Set<string>();
  const violations: BeginnerSurfaceViolation[] = [];
  const segments: AnalyzedSegment[] = [];
  const rootImportsBySource = new Map<string, number>();

  for (const source of sources) {
    if (source.audience !== 'beginner') continue;
    for (const [index, segment] of executableSegments(source).entries()) {
      const script = scriptText(segment);
      const records = importsFrom(script, source.id);
      const facts = definitionFacts(script, source.id, records);
      segments.push({
        ...segment,
        id: `${source.id}::segment-${index}`,
        moduleId: segmentModuleId(source, segment, index),
        scopeId: source.id,
        source,
        script,
        imports: records,
        ...facts,
      });

      for (const record of records) {
        if (
          record.specifier === 'liteship' ||
          record.specifier.startsWith('liteship/') ||
          record.specifier.startsWith('@liteship/')
        ) {
          imports.add(record.specifier);
        }
        if (record.specifier.startsWith('@liteship/')) {
          pushViolation(violations, source.id, 'raw-package-import', record.specifier);
          continue;
        }
        if (record.specifier === 'liteship') {
          rootImportsBySource.set(source.id, (rootImportsBySource.get(source.id) ?? 0) + 1);
          for (const binding of record.bindings) {
            if (!ROOT_EXPORTS.has(binding.exported)) {
              pushViolation(violations, source.id, 'root-export-outside-contract', binding.exported);
            } else if (source.role === 'feature' && binding.exported !== 'defineAdaptive') {
              pushViolation(violations, source.id, 'expert-concept', binding.exported);
            }
          }
          continue;
        }
        if (record.specifier.startsWith('liteship/')) {
          if (!GOVERNED_SUBPATHS.has(record.specifier as `liteship/${string}`)) {
            pushViolation(violations, source.id, 'foreign-facade-subpath', record.specifier);
          } else if (record.specifier !== source.selectedHost) {
            pushViolation(violations, source.id, 'foreign-facade-subpath', record.specifier);
          }
        }
      }
    }
  }

  for (const [sourceId, count] of rootImportsBySource) {
    if (count > 1) pushViolation(violations, sourceId, 'multiple-root-imports', String(count));
  }

  const modules = new Map(segments.map((segment) => [segment.moduleId, segment]));
  const admittedBySegment = new Map<string, Set<string>>();
  const constructedByScope = new Map<string, Set<string>>();
  const exportsByModule = new Map<string, Set<string>>();

  for (const segment of segments) {
    const admitted = new Set(segment.constructed);
    admittedBySegment.set(segment.id, admitted);
    const scoped = constructedByScope.get(segment.scopeId) ?? new Set<string>();
    for (const identifier of segment.constructed) scoped.add(identifier);
    constructedByScope.set(segment.scopeId, scoped);
    const exported = exportsByModule.get(segment.moduleId) ?? new Set<string>();
    for (const relation of segment.localExports) {
      if (segment.constructed.has(relation.local)) exported.add(relation.exported);
    }
    exportsByModule.set(segment.moduleId, exported);
    if (segment.source.role === 'feature' && segment.constructed.size > 0) families.add('define');
  }

  // Markdown snippets in one authored section share lexical teaching context;
  // physical source files instead acquire authority only through imports.
  for (const segment of segments) {
    if (segment.source.format !== 'markdown') continue;
    const admitted = admittedBySegment.get(segment.id)!;
    for (const identifier of constructedByScope.get(segment.scopeId) ?? []) admitted.add(identifier);
  }

  // Resolve named/default aliases to exported Adaptive definitions. Iterate so
  // a barrel-style relative re-export cannot depend on input ordering.
  let changed = true;
  while (changed) {
    changed = false;
    for (const segment of segments) {
      const admitted = admittedBySegment.get(segment.id)!;
      for (const record of segment.imports) {
        if (!record.specifier.startsWith('.')) continue;
        const target = resolveRelativeModule(segment.moduleId, record.specifier, modules);
        if (target === undefined) continue;
        const targetExports = exportsByModule.get(target) ?? new Set<string>();
        for (const binding of record.bindings) {
          if (!targetExports.has(binding.exported) || admitted.has(binding.local)) continue;
          admitted.add(binding.local);
          changed = true;
        }
      }
      const moduleExports = exportsByModule.get(segment.moduleId)!;
      for (const relation of segment.localExports) {
        if (!admitted.has(relation.local) || moduleExports.has(relation.exported)) continue;
        moduleExports.add(relation.exported);
        changed = true;
      }
    }
  }

  for (const segment of segments) {
    if (segment.source.role !== 'feature') continue;
    const admitted = admittedBySegment.get(segment.id)!;
    for (const family of adaptiveMethodFamilies(segment.script, segment.id, admitted)) families.add(family);
    for (const family of markupMethodFamilies(segment.text, admitted)) families.add(family);

    const executable = withoutCommentsAndStrings(segment.text);
    const hidden = [
      /\bdata-liteship-[\w-]+\s*=/,
      /\bcontainer-(?:name|type)\s*:/,
      /@(?:quantize|style|token|theme)\b/,
    ].find((pattern) => pattern.test(executable));
    if (hidden !== undefined) {
      pushViolation(violations, segment.source.id, 'hidden-setup-primitive', hidden.source);
    }
  }

  return {
    conceptFamilies: [...families].sort(),
    imports: [...imports].sort(),
    violations,
  };
}
