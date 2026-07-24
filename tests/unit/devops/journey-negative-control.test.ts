import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { journeysPassed, type JourneyResult } from '../../journey/harness.js';
import { proveRegisteredCheckRejects } from '../../support/registered-check-negative-control.js';

const REPO_ROOT = resolve(import.meta.dirname, '..', '..', '..');

function sourceFile(relativePath: string): ts.SourceFile {
  const path = resolve(REPO_ROOT, relativePath);
  return ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function importedBindings(file: ts.SourceFile): ReadonlySet<string> {
  const names = new Set<string>();
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const clause = statement.importClause;
    if (clause?.name !== undefined) names.add(clause.name.text);
    if (clause?.namedBindings !== undefined && ts.isNamedImports(clause.namedBindings)) {
      for (const element of clause.namedBindings.elements) names.add(element.name.text);
    }
  }
  return names;
}

function calledIdentifiers(file: ts.SourceFile): readonly string[] {
  const names: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) names.push(node.expression.text);
    ts.forEachChild(node, visit);
  };
  visit(file);
  return names;
}

describe('check/journey negative control', () => {
  it('the registered consumer-journey authority blocks on a non-zero result', () => {
    const failed: JourneyResult = { name: 'planted', status: 'fail', detail: 'fixture', notes: [] };
    expect(journeysPassed([failed])).toBe(false);
    expect(journeysPassed([])).toBe(false);
    proveRegisteredCheckRejects(
      'check/journey',
      'pnpm run test:journey',
      'tests/unit/devops/journey-negative-control.test.ts',
    );
  });

  it('recovery and cold-agent journeys stay on one packed facade executable', () => {
    const runner = sourceFile('scripts/test-journey.ts');
    const recovery = sourceFile('tests/journey/journey-debug-diagnostic.ts');
    const coldAgent = sourceFile('tests/journey/journey-cold-agent-context.ts');

    const runnerCalls = calledIdentifiers(runner);
    expect(runnerCalls).toEqual(
      expect.arrayContaining([
        'packWorkspace',
        'scaffoldConsumer',
        'rewriteConsumerToTarballs',
        'installConsumer',
        'journeyDebugDiagnostic',
        'journeyColdAgentContext',
      ]),
    );

    const recoveryImports = importedBindings(recovery);
    expect(recoveryImports.has('runLiteshipCli')).toBe(false);
    expect(recoveryImports.has('runInstalledLiteshipCli')).toBe(true);
    expect(calledIdentifiers(recovery)).toEqual(
      expect.arrayContaining(['runInstalledLiteshipCli', 'findFiles', 'readFileSync']),
    );

    const coldAgentImports = importedBindings(coldAgent);
    expect(coldAgentImports.has('runLiteshipCli')).toBe(false);
    expect(coldAgentImports.has('runInstalledLiteshipCliAt')).toBe(true);
    expect(calledIdentifiers(coldAgent)).toContain('runInstalledLiteshipCliAt');
  });
});
