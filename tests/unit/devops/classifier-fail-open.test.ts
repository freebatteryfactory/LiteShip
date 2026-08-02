/**
 * THE FAIL-OPEN LAW — a classifier may not clear input it could not read.
 *
 * Every fail-closed classifier in this repo reads a value through a helper
 * that returns `null` when it cannot parse (`stringScalarAt`, and its
 * siblings). Every one of those reads reaches a fork, and the shape of the
 * bug is always the same: the unreadable branch quietly moves on, so an
 * expression the classifier could not understand is treated exactly like one
 * it understood and cleared.
 *
 * That bug shipped three times on this branch alone — computed member keys,
 * then dynamic-import specifiers in the SIBLING call site of the same
 * function fifty lines away, and it would have shipped a fourth time in the
 * string-timer site. Each was found by review, one at a time.
 *
 * THE RULE, and it is a proof obligation rather than an annotation: every
 * unreadable-input fork must either
 *
 *   1. RECORD — add a finding/kind, so unreadable means unsafe; or
 *   2. HAND OFF — name the pass that DOES decide it, and that pass must have
 *      a proof test which exists and exercises the deferred shape.
 *
 * "Skipped for a reason" is not a third option. A comment explaining why a
 * guard fails open is a licence to fail open, which is strictly worse than
 * failing open honestly.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const REPO_ROOT = resolve(import.meta.dirname, '../../..');

/** Helpers that answer "I could not read this" with `null`. */
const UNREADABLE_READERS: ReadonlySet<string> = new Set(['stringScalarAt', 'immediateMemberReceiver']);

/** Modules whose job is fail-closed classification. */
const CLASSIFIER_MODULES: readonly string[] = Object.freeze(['scripts/lib/dynamic-code-residue.ts']);

/** How one unreadable-input fork discharges its obligation. */
interface ForkDisposition {
  /** `<module>:<reader>#<ordinal>` — ordinal counts reads of that reader in file order. */
  readonly site: string;
  readonly kind: 'records' | 'handoff';
  /** For `handoff` ONLY: the pass that decides the deferred shape. */
  readonly decidedBy?: string;
  /**
   * REQUIRED for both kinds. A declaration is not evidence: `records` must
   * point at a law proving unreadable input yields a finding, and `handoff`
   * must point at a law proving the named pass decides the deferred shape.
   */
  readonly provenBy: string;
}

/**
 * The declared disposition of every unreadable-input fork. A fork that is not
 * declared here fails the law — which is the point: adding a new `null` fork
 * to a classifier forces the author to say which of the two options it is.
 */
const DISPOSITIONS: readonly ForkDisposition[] = Object.freeze([
  Object.freeze({
    site: 'scripts/lib/dynamic-code-residue.ts:stringScalarAt#1',
    kind: 'records' as const,
    // Computed member on a global receiver: a key that is not a sole complete
    // literal is residue in both kinds.
    provenBy: 'tests/unit/devops/dynamic-code-sources.test.ts',
  }),
  Object.freeze({
    site: 'scripts/lib/dynamic-code-residue.ts:stringScalarAt#2',
    kind: 'records' as const,
    // Dynamic-import specifier: unreadable is residue, except the
    // pathToFileURL callee-contract clearance, which is a PROOF, not a skip.
    provenBy: 'tests/unit/devops/dynamic-code-sources.test.ts',
  }),
  Object.freeze({
    site: 'scripts/lib/dynamic-code-residue.ts:stringScalarAt#3',
    kind: 'handoff' as const,
    decidedBy: 'the DYNAMIC_TOKEN callee pass, which owns every non-literal timer callee',
    provenBy: 'tests/unit/devops/dynamic-code-sources.test.ts',
  }),
  Object.freeze({
    site: 'scripts/lib/dynamic-code-residue.ts:immediateMemberReceiver#1',
    kind: 'handoff' as const,
    decidedBy: 'the same DYNAMIC_TOKEN pass: a null receiver means a BARE callee, decided by the token guards below it',
    provenBy: 'tests/unit/devops/dynamic-code-sources.test.ts',
  }),
]);

/** Every read of an unreadable-reader in one module, in source order. */
function readerSites(modulePath: string): readonly string[] {
  const source = ts.createSourceFile(
    modulePath,
    readFileSync(resolve(REPO_ROOT, modulePath), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const counts = new Map<string, number>();
  const sites: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && UNREADABLE_READERS.has(node.expression.text)) {
      const name = node.expression.text;
      const ordinal = (counts.get(name) ?? 0) + 1;
      counts.set(name, ordinal);
      sites.push(`${modulePath}:${name}#${ordinal}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return sites;
}

describe('classifiers may not clear input they could not read', () => {
  it('the module and reader sets are non-vacuous', () => {
    expect(CLASSIFIER_MODULES.length).toBeGreaterThan(0);
    expect(UNREADABLE_READERS.size).toBeGreaterThan(0);
    for (const module of CLASSIFIER_MODULES) {
      expect(existsSync(resolve(REPO_ROOT, module)), `${module} missing`).toBe(true);
    }
  });

  it('every unreadable-input fork in a classifier declares its disposition', () => {
    const live = CLASSIFIER_MODULES.flatMap(readerSites);
    expect(live.length, 'the site census must not be vacuous').toBeGreaterThanOrEqual(4);
    const declared = new Set(DISPOSITIONS.map((entry) => entry.site));
    const undeclared = live.filter((site) => !declared.has(site));
    expect(
      undeclared,
      `undeclared fail-open fork(s): ${undeclared.join(', ')} — each must RECORD a finding or name the pass that decides it`,
    ).toEqual([]);
  });

  it('no disposition describes a fork that no longer exists', () => {
    const live = new Set(CLASSIFIER_MODULES.flatMap(readerSites));
    const stale = DISPOSITIONS.map((entry) => entry.site).filter((site) => !live.has(site));
    expect(stale, `stale disposition(s): ${stale.join(', ')}`).toEqual([]);
  });

  it('THE PROOF OBLIGATION: every fork — recording or deferring — names a live proof', () => {
    // A declaration is not evidence. `records` without a law proving that
    // unreadable input yields a finding is just a comment claiming the code
    // is fine, which is the licence this law exists to remove.
    for (const entry of DISPOSITIONS) {
      expect(entry.provenBy, `${entry.site} declares a disposition with no proof`).toBeTruthy();
      expect(
        existsSync(resolve(REPO_ROOT, entry.provenBy)),
        `${entry.site} names a proof that does not exist: ${entry.provenBy}`,
      ).toBe(true);
    }
  });

  it('only a handoff may name a deciding pass, and it must name one', () => {
    for (const entry of DISPOSITIONS) {
      if (entry.kind === 'handoff') {
        expect(entry.decidedBy, `${entry.site} defers without naming the deciding pass`).toBeTruthy();
      } else {
        expect(entry.decidedBy, `${entry.site} records AND defers — the dispositions are exclusive`).toBeUndefined();
      }
    }
  });
});
