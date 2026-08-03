/**
 * THE FAIL-OPEN LAW — a classifier may not clear input it could not read.
 *
 * Every fail-closed classifier in this repo reads a value through a helper
 * that reports absence when it cannot decide. Every one of those reads reaches
 * a fork, and the shape of the bug is always the same: the unreadable branch
 * quietly moves on, so an expression the classifier could not understand is
 * treated exactly like one it understood and cleared.
 *
 * The law outlived the technique it was written against. When the dynamic-code
 * classifier moved from masked-text regexes to a parsed tree, its text readers
 * (`stringScalarAt`, `immediateMemberReceiver`) disappeared and this census
 * went to zero — the vacuity floor caught that immediately, which is what a
 * floor is for. The obligation is a property of classifying, not of the
 * technique, so it re-anchored on the new engine's sources of absence.
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

/**
 * Helpers that answer "I could not read this".
 *
 * These are the AST engine's two sources of absence. `staticKey` cannot read a
 * member key that is not a literal; `nearestBinding` reports that NO enclosing
 * scope binds a name, which is how a reference to the host global is
 * recognised. Both were previously spelled as text readers (`stringScalarAt`,
 * `immediateMemberReceiver`) whose absence meant the same thing; the obligation
 * survived the rewrite because it is a property of classification, not of the
 * technique used to classify.
 */
const UNREADABLE_READERS: ReadonlySet<string> = new Set(['staticKey', 'nearestBinding']);

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
    site: 'scripts/lib/dynamic-code-residue.ts:nearestBinding#1',
    kind: 'records' as const,
    // isFree: no enclosing scope binds the name, so it IS the host global.
    // This is the fork that makes `globalThis`, `Reflect`, and a bare `eval`
    // count as the real capability rather than as some local of that name.
    provenBy: 'tests/unit/devops/dynamic-code-sources.test.ts',
  }),
  Object.freeze({
    site: 'scripts/lib/dynamic-code-residue.ts:nearestBinding#2',
    kind: 'records' as const,
    // provablySafeReceiver: an unbound receiver is never proven safe, so
    // `receiver.eval` on it stays residue.
    provenBy: 'tests/unit/devops/dynamic-code-sources.test.ts',
  }),
  Object.freeze({
    site: 'scripts/lib/dynamic-code-residue.ts:nearestBinding#3',
    kind: 'records' as const,
    // fileUrlSpecifier: the pathToFileURL clearance is only as good as its
    // referent, so an unresolved callee refuses the clearance and the import
    // is reported.
    provenBy: 'tests/unit/devops/dynamic-code-sources.test.ts',
  }),
  Object.freeze({
    site: 'scripts/lib/dynamic-code-residue.ts:nearestBinding#4',
    kind: 'records' as const,
    // timerArgumentProvenCallable: an unresolved argument is NOT proven
    // callable, so the timer is reported. The polarity is deliberate — asking
    // "is it a string?" would clear everything unreadable.
    provenBy: 'tests/unit/devops/dynamic-code-sources.test.ts',
  }),
  Object.freeze({
    site: 'scripts/lib/dynamic-code-residue.ts:nearestBinding#5',
    kind: 'records' as const,
    // The identifier pass: an unbound `eval`/`Function` reference is the
    // global capability and is reported.
    provenBy: 'tests/unit/devops/dynamic-code-sources.test.ts',
  }),
  Object.freeze({
    site: 'scripts/lib/dynamic-code-residue.ts:staticKey#1',
    kind: 'handoff' as const,
    decidedBy:
      'the element-access arm of collectResidue (staticKey#3): an unreadable key on a global receiver is residue in BOTH kinds there, which necessarily covers the timer names this call declines to match',
    provenBy: 'tests/unit/devops/dynamic-code-sources.test.ts',
  }),
  Object.freeze({
    site: 'scripts/lib/dynamic-code-residue.ts:staticKey#2',
    kind: 'records' as const,
    // reflectGetKey: an unreadable key in `Reflect.get(globalThis, k)` is
    // residue in both kinds, exactly as the equivalent `globalThis[k]` is.
    provenBy: 'tests/unit/devops/dynamic-code-sources.test.ts',
  }),
  Object.freeze({
    site: 'scripts/lib/dynamic-code-residue.ts:staticKey#3',
    kind: 'records' as const,
    // The element-access arm: a key on a global receiver that is not a literal
    // this engine can read is residue in both kinds.
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
    expect(live.length, 'the site census must not be vacuous').toBeGreaterThanOrEqual(8);
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
