// @vitest-environment node
// PROVES: INV-DIAGNOSTIC-CODE-CLOSED

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { explainDiagnostic } from '@liteship/error';
import { AUDIT_RULE_IDS, auditDiagnosticCode, type AuditRuleId } from '@liteship/audit';

const REPO_ROOT = resolve(import.meta.dirname, '..', '..', '..');
const EMITTER_FILES = ['index.ts', 'integrity.ts', 'structure.ts', 'surface.ts'] as const;

function emittedAuditRules(): readonly string[] {
  const rules = new Set<string>();
  for (const name of EMITTER_FILES) {
    const file = resolve(REPO_ROOT, 'packages', 'audit', 'src', name);
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const visit = (node: ts.Node): void => {
      if (
        ts.isPropertyAssignment(node) &&
        ((ts.isIdentifier(node.name) && node.name.text === 'rule') ||
          (ts.isStringLiteral(node.name) && node.name.text === 'rule')) &&
        (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer))
      ) {
        rules.add(node.initializer.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return [...rules].sort((left, right) => left.localeCompare(right));
}

describe('audit diagnostic enrollment', () => {
  it('is an exact bidirectional projection of every real audit emitter rule', () => {
    expect(AUDIT_RULE_IDS).toEqual(emittedAuditRules());
    for (const rule of AUDIT_RULE_IDS) {
      const code = auditDiagnosticCode(rule);
      expect(explainDiagnostic(code)?.area).toBe('audit');
      expect(explainDiagnostic(code)?.owner).toBe('@liteship/audit');
    }
  });

  it('rejects an invented audit rule at the type boundary', () => {
    // @ts-expect-error — audit rule slugs are derived from the exact registry.
    const invented: AuditRuleId = 'not-enrolled';
    expect(invented).toBe('not-enrolled');
  });
});
