// @vitest-environment node
/**
 * Exact public allocation census.
 *
 * A new standalone `create*` export or namespace `.create` on a curated facade
 * cannot ship until its ownership class and proving test are enrolled in the
 * canonical facade contract.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import ts from 'typescript';
import * as Schema from '../../../packages/liteship/src/schema.js';
import * as Reactive from '../../../packages/liteship/src/reactive.js';
import * as Motion from '../../../packages/liteship/src/motion.js';
import * as Graph from '../../../packages/liteship/src/graph.js';
import * as Media from '../../../packages/liteship/src/media.js';
import * as Evidence from '../../../packages/liteship/src/evidence.js';
import * as Compiler from '../../../packages/liteship/src/compiler.js';
import * as Runtime from '../../../packages/liteship/src/runtime.js';
import * as Astro from '../../../packages/liteship/src/astro.js';
import * as Vite from '../../../packages/liteship/src/vite.js';
import * as Testing from '../../../packages/liteship/src/testing.js';
import * as Migrate from '../../../packages/liteship/src/migrate.js';
import * as Genui from '../../../packages/liteship/src/genui.js';
import { FACADE_LIFECYCLE_CONTRACT, FACADE_SUBPATH_CONTRACT } from '../../../packages/liteship/src/export-budget.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const FACADES = Object.freeze({
  'liteship/schema': Schema,
  'liteship/reactive': Reactive,
  'liteship/motion': Motion,
  'liteship/graph': Graph,
  'liteship/media': Media,
  'liteship/evidence': Evidence,
  'liteship/compiler': Compiler,
  'liteship/runtime': Runtime,
  'liteship/astro': Astro,
  'liteship/vite': Vite,
  'liteship/testing': Testing,
  'liteship/migrate': Migrate,
  'liteship/genui': Genui,
} satisfies Record<string, Record<string, unknown>>);

function publicAllocationCensus(): string[] {
  const operations: string[] = [];
  for (const [specifier, facade] of Object.entries(FACADES)) {
    for (const [name, value] of Object.entries(facade)) {
      if (/^create[A-Z]/.test(name) && typeof value === 'function') {
        operations.push(`${specifier}:${name}`);
      }
      if (
        value !== null &&
        typeof value === 'object' &&
        'create' in value &&
        typeof (value as { create?: unknown }).create === 'function'
      ) {
        operations.push(`${specifier}:${name}.create`);
      }
    }
  }
  return operations.sort();
}

function calleeName(expression: ts.Expression): string | undefined {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression)) {
    return `${expression.expression.text}.${expression.name.text}`;
  }
  return undefined;
}

function isInsideTestCallback(node: ts.Node): boolean {
  for (let cursor: ts.Node | undefined = node; cursor?.parent !== undefined; cursor = cursor.parent) {
    const callback = cursor.parent;
    if (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback)) continue;
    const invocation = callback.parent;
    if (!ts.isCallExpression(invocation)) continue;
    const expression = invocation.expression;
    if (ts.isIdentifier(expression) && (expression.text === 'test' || expression.text === 'it')) return true;
    if (
      ts.isCallExpression(expression) &&
      ts.isPropertyAccessExpression(expression.expression) &&
      ts.isIdentifier(expression.expression.expression) &&
      (expression.expression.expression.text === 'test' || expression.expression.expression.text === 'it')
    ) {
      return true;
    }
  }
  return false;
}

/** Exact proof: the declared operation must be called from a real test callback. */
export function proofExecutesOperation(sourceText: string, operation: string): boolean {
  const source = ts.createSourceFile('proof.test.ts', sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let found = false;
  const visit = (node: ts.Node): void => {
    if (
      !found &&
      ts.isCallExpression(node) &&
      calleeName(node.expression) === operation &&
      isInsideTestCallback(node)
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

describe('facade lifecycle matrix', () => {
  test('exactly classifies every public create operation', () => {
    expect(Object.keys(FACADES).sort()).toEqual(FACADE_SUBPATH_CONTRACT.map((entry) => entry.specifier).sort());
    const declared = FACADE_LIFECYCLE_CONTRACT.map((entry) => `${entry.specifier}:${entry.operation}`).sort();
    expect(publicAllocationCensus()).toEqual(declared);
    expect(declared.length).toBeGreaterThan(0);
  });

  test('every lifecycle row points at a proof that executes the exact operation', () => {
    const missing = FACADE_LIFECYCLE_CONTRACT.filter((entry) => {
      const path = resolve(REPO_ROOT, entry.proof);
      return !existsSync(path) || !proofExecutesOperation(readFileSync(path, 'utf8'), entry.operation);
    }).map((entry) => `${entry.operation}:${entry.proof}`);
    expect(missing).toEqual([]);
  });

  test('references and comments cannot impersonate an executable lifecycle proof', () => {
    expect(
      proofExecutesOperation(
        "// createThing()\nconst named = createThing;\ntest('unrelated', () => true);",
        'createThing',
      ),
    ).toBe(false);
    expect(proofExecutesOperation("test('direct proof', () => createThing());", 'createThing')).toBe(true);
    expect(proofExecutesOperation("it('namespace proof', () => Owner.create());", 'Owner.create')).toBe(true);
  });

  test('the facade exposes the sanctioned create verb, not Lifetime.make', () => {
    expect(typeof Reactive.createLifetime).toBe('function');
    expect('Lifetime' in Reactive).toBe(false);
  });

  test('active ownership and GC/pure allocation remain disjoint', () => {
    for (const entry of FACADE_LIFECYCLE_CONTRACT) {
      if (entry.classification === 'active-owned') {
        expect(entry.disposal, entry.operation).not.toBe('none');
        expect(entry.postDispose, entry.operation).toBe('inert');
        expect(entry.siblingCleanup, entry.operation).toBe('aggregate');
      } else {
        expect(entry.disposal, entry.operation).toBe('none');
        expect(entry.postDispose, entry.operation).toBe('not-applicable');
        expect(entry.siblingCleanup, entry.operation).toBe('not-applicable');
      }
    }
  });
});
