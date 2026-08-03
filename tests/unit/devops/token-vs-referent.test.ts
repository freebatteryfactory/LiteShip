/**
 * THE REFERENT LAW — a source analyser may not treat a NAME as an identity.
 *
 * A scanner that reads code and asks `callee.text === 'escapeCssString'` is
 * asking whether a token is spelled a certain way, not whether it denotes the
 * function whose behaviour the check depends on. Any binding that happens to
 * carry the name satisfies it — `const escapeCssString = (v) => v` included —
 * so the guard clears exactly the code it exists to catch.
 *
 * That shipped on this branch in the CSS-identity scanner, inside the producer
 * feeding a blocking gate, and it is the same shape as two other findings
 * (a substring constructor claim, a runner-root classification).
 *
 * SCOPE, chosen so the law is sound rather than noisy: a comparison only falls
 * under it when the literal names a symbol this repository EXPORTS. Comparing
 * against `'console'`, `'globalThis'` or `'0'` is name-as-identity by the
 * language's own rules and is not in scope; comparing against a LiteShip
 * export is a claim about a specific function, and a claim needs resolution.
 *
 * Each in-scope site must declare how it establishes the referent, and name a
 * live proof. A declaration is not evidence.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { globSync } from 'fast-glob';
import ts from 'typescript';

const REPO_ROOT = resolve(import.meta.dirname, '../../..');

/** Modules that ANALYSE source text — the only place a token can pose as a referent. */
const ANALYSER_GLOBS: readonly string[] = Object.freeze([
  'packages/audit/src/**/*.ts',
  'packages/gauntlet/src/**/*.ts',
  'scripts/lib/*.ts',
]);

/** How one in-scope comparison establishes the identity it depends on. */
interface ReferentDisposition {
  /** `<module>:<literal>` */
  readonly site: string;
  /**
   * `resolved` — the referent is proven. `name-is-identity` — the name IS the
   * contract. `legacy-unresolved` — a real instance of the class, visible and
   * capped by the ratchet below, never a silent one.
   */
  readonly kind: 'resolved' | 'name-is-identity' | 'legacy-unresolved';
  /** Why, in one line. */
  readonly reason: string;
  /** REQUIRED for resolved/name-is-identity: a live law proving the claim. */
  readonly provenBy?: string;
  /** REQUIRED for legacy-unresolved: what actually breaks if a shadow appears. */
  readonly failureMode?: string;
}

/**
 * The ratchet. Legacy instances are visible and may only DECREASE — the same
 * discipline the test constitution applies to its legacy coupling sites.
 */
const LEGACY_UNRESOLVED_CEILING = 2;

const DISPOSITIONS: readonly ReferentDisposition[] = Object.freeze([
  Object.freeze({
    site: 'packages/audit/src/diagnostic-emission-ast.ts:Diagnostics',
    kind: 'legacy-unresolved' as const,
    reason: 'the emission census identifies its receiver by spelling rather than by resolving the imported binding',
    failureMode:
      'a module-local `const Diagnostics = {...}` would be censused as real emission, or a renamed import would vanish from the census that the diagnostic-code-registered gate consumes',
  }),
  Object.freeze({
    site: 'scripts/lib/capsule-detector.ts:defineCapsule',
    kind: 'legacy-unresolved' as const,
    reason: 'the direct-call discrimination identifies the factory by spelling rather than by resolving its import',
    failureMode:
      'a local helper named defineCapsule would be detected as the real factory, and an aliased import of the real factory would not be',
  }),
]);

/**
 * Every function or const this repository EXPORTS from shipped source — the
 * oracle for "is this literal a referent claim?". Taken from the declarations
 * themselves rather than a projection, so a symbol on a package subpath (the
 * very case that motivated this law) cannot fall outside the census.
 */
function exportedSymbolNames(): ReadonlySet<string> {
  const names = new Set<string>();
  const files = globSync('packages/*/src/**/*.ts', { cwd: REPO_ROOT, onlyFiles: true });
  for (const file of files) {
    const source = ts.createSourceFile(
      file,
      readFileSync(resolve(REPO_ROOT, file), 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    for (const statement of source.statements) {
      const exported = ts.canHaveModifiers(statement)
        ? ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true
        : false;
      if (!exported) continue;
      if (ts.isFunctionDeclaration(statement) && statement.name !== undefined) names.add(statement.name.text);
      if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name)) names.add(declaration.name.text);
        }
      }
    }
  }
  return names;
}

/** In-scope comparisons: `<expr>.text === '<repo export>'` inside an analyser. */
function referentComparisons(exported: ReadonlySet<string>): readonly string[] {
  const sites: string[] = [];
  const files = ANALYSER_GLOBS.flatMap((pattern) => globSync(pattern, { cwd: REPO_ROOT, onlyFiles: true }));
  for (const file of [...new Set(files)].sort()) {
    if (file.includes('.test.')) continue;
    const source = ts.createSourceFile(
      file,
      readFileSync(resolve(REPO_ROOT, file), 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const visit = (node: ts.Node): void => {
      if (
        ts.isBinaryExpression(node) &&
        (node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken ||
          node.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken)
      ) {
        for (const [side, other] of [
          [node.left, node.right],
          [node.right, node.left],
        ] as const) {
          // Only an IDENTIFIER's spelling can pose as a referent. Reading the
          // NAME of a property access (`node.expression.name.text === 'join'`)
          // is a method-name check, where the name IS the contract.
          const readsAName =
            ts.isPropertyAccessExpression(side) &&
            ['text', 'escapedText'].includes(side.name.text) &&
            !(ts.isPropertyAccessExpression(side.expression) && side.expression.name.text === 'name');
          if (readsAName && ts.isStringLiteralLike(other) && exported.has(other.text)) {
            sites.push(`${file}:${other.text}`);
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return [...new Set(sites)].sort();
}

describe('a source analyser may not treat a name as an identity', () => {
  const exported = exportedSymbolNames();

  it('the export oracle and analyser census are non-vacuous', () => {
    expect(exported.size).toBeGreaterThan(200);
    // The scoping oracle must actually contain the symbol that motivated the
    // law, or the census would be vacuously empty.
    expect(exported.has('escapeCssString')).toBe(true);
    const files = ANALYSER_GLOBS.flatMap((pattern) => globSync(pattern, { cwd: REPO_ROOT, onlyFiles: true }));
    expect(files.length).toBeGreaterThan(50);
  });

  it('every comparison against a repo-exported symbol declares how it establishes the referent', () => {
    const live = referentComparisons(exported);
    const declared = new Set(DISPOSITIONS.map((entry) => entry.site));
    const undeclared = live.filter((site) => !declared.has(site));
    expect(
      undeclared,
      `undeclared token-as-referent comparison(s): ${undeclared.join(', ')} — resolve the referent, or declare why the name IS the identity`,
    ).toEqual([]);
  });

  it('no disposition describes a comparison that no longer exists', () => {
    const live = new Set(referentComparisons(exported));
    const stale = DISPOSITIONS.map((entry) => entry.site).filter((site) => !live.has(site));
    expect(stale, `stale disposition(s): ${stale.join(', ')}`).toEqual([]);
  });

  it('THE PROOF OBLIGATION: a cleared disposition names a live proof; a legacy one names its failure mode', () => {
    for (const entry of DISPOSITIONS) {
      expect(entry.reason.length, `${entry.site} declares no reason`).toBeGreaterThan(20);
      if (entry.kind === 'legacy-unresolved') {
        // Not a licence: the failure mode must be stated in the open, so the
        // cost of leaving it unresolved is legible rather than implied.
        expect(entry.failureMode, `${entry.site} is unresolved without a stated failure mode`).toBeTruthy();
        expect(entry.failureMode!.length).toBeGreaterThan(40);
        continue;
      }
      expect(entry.provenBy, `${entry.site} claims clearance with no proof`).toBeTruthy();
      expect(
        existsSync(resolve(REPO_ROOT, entry.provenBy!)),
        `${entry.site} names a proof that does not exist: ${entry.provenBy}`,
      ).toBe(true);
    }
  });

  it('THE RATCHET: unresolved instances may only decrease', () => {
    const legacy = DISPOSITIONS.filter((entry) => entry.kind === 'legacy-unresolved');
    expect(
      legacy.length,
      `unresolved token-as-referent sites must not grow beyond ${LEGACY_UNRESOLVED_CEILING}; resolve one before adding another`,
    ).toBeLessThanOrEqual(LEGACY_UNRESOLVED_CEILING);
  });
});
