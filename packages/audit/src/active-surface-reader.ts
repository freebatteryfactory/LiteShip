/**
 * THE ACTIVE-SURFACE READER ORACLE — field-level TS-AST facts for #132.
 *
 * Extends the audit engine's source analysis (does NOT duplicate symbol-level orphan
 * detection). For each enrolled active modeled surface, scans designated reader paths
 * (interpreter / lowerer / runtime) and records which load-bearing fields are READ.
 *
 * Emits `ActiveSurfaceFacts` for the gauntlet FactGate — gauntlet stays lean
 * (no `typescript` dep); this module lives in `@czap/audit`.
 *
 * @module
 */
import ts from 'typescript';
import { resolve } from 'node:path';
import type { ActiveSurfaceFacts, ActiveSurfaceEntry, ActiveSurfacePromotion } from '@czap/gauntlet';
import { createTypeDirectedProgram } from './ts-program.js';

/** The oracle id every active-surface fact is tagged with (traceability). */
export const ACTIVE_SURFACE_ORACLE_ID = 'ts-active-surface-reader';

type TransitionField = string;

/** Reader paths that MUST consume an active TransitionNode when present. */
const TRANSITION_READER_FILES = [
  'packages/astro/src/runtime/graph-lower.ts',
  'packages/astro/src/runtime/graph-runtime.ts',
  'packages/core/src/interpret-transition.ts',
] as const;

/** Dedicated interpreter files — scan whole file for transition field reads (no switch/case). */
const TRANSITION_DEDICATED_READER_FILES = new Set<string>(['packages/core/src/interpret-transition.ts']);

/** Injected inputs for {@link buildActiveSurfaceFacts}. */
export interface ActiveSurfaceReaderOptions {
  /** Absolute repo root; every relative path resolves against it. */
  readonly repoRoot: string;
  /**
   * Load-bearing field names for the active `transition` surface — injected by the
   * HOST from the real `@czap/core` type (`keyof TransitionNode`), never derived
   * inside audit (audit-leaf-purity / D9b).
   */
  readonly transitionRequiredFields: readonly string[];
  /**
   * When `'advisory'`, unread fields surface but do not block (live orphan until #130).
   * Fixtures pass `'blocking'` to prove the ratchet's teeth.
   */
  readonly promotion?: ActiveSurfacePromotion;
}

/** Collect property names read on `subject` inside `body` (direct access + destructuring). */
function fieldReadsInBlock(subject: string, body: ts.Node, requiredFields: readonly string[]): Set<TransitionField> {
  const reads = new Set<TransitionField>();
  const isField = (name: string): name is TransitionField => requiredFields.includes(name);

  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === subject) {
      if (isField(node.name.text)) reads.add(node.name.text);
    }
    if (ts.isBindingElement(node) && ts.isIdentifier(node.name)) {
      if (isField(node.name.text)) reads.add(node.name.text);
    }
    if (ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === subject) {
      if (ts.isStringLiteral(node.argumentExpression) && isField(node.argumentExpression.text)) {
        reads.add(node.argumentExpression.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  return reads;
}

/** Find `switch (X.family) { case 'transition': ... }` blocks and collect reads on X. */
function transitionReadsInSourceFile(sf: ts.SourceFile, requiredFields: readonly string[]): Set<TransitionField> {
  const reads = new Set<TransitionField>();

  const visitSwitch = (stmt: ts.SwitchStatement): void => {
    const expr = stmt.expression;
    if (!ts.isPropertyAccessExpression(expr) || expr.name.text !== 'family') return;
    if (!ts.isIdentifier(expr.expression)) return;
    const subject = expr.expression.text;

    for (const clause of stmt.caseBlock.clauses) {
      if (!ts.isCaseClause(clause)) continue;
      const label = clause.expression;
      if (!ts.isStringLiteral(label) || label.text !== 'transition') continue;
      for (const f of fieldReadsInBlock(subject, clause, requiredFields)) reads.add(f);
    }
  };

  const visit = (node: ts.Node): void => {
    if (ts.isSwitchStatement(node)) visitSwitch(node);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return reads;
}

/** Scan a dedicated interpreter file for transition-node field property access. */
function transitionReadsInDedicatedFile(sf: ts.SourceFile, requiredFields: readonly string[]): Set<TransitionField> {
  return fieldReadsInBlock('transition', sf, requiredFields);
}

/** Scan one reader file; returns fields read in transition contexts. */
function readsInFile(
  relPath: string,
  absPath: string,
  program: ts.Program,
  requiredFields: readonly string[],
): Set<TransitionField> {
  const sf = program.getSourceFile(absPath);
  if (sf === undefined) return new Set();
  if (TRANSITION_DEDICATED_READER_FILES.has(relPath)) {
    return transitionReadsInDedicatedFile(sf, requiredFields);
  }
  return transitionReadsInSourceFile(sf, requiredFields);
}

function makeTransitionEntry(
  readFields: readonly TransitionField[],
  requiredFields: readonly string[],
  promotion: ActiveSurfacePromotion,
): ActiveSurfaceEntry {
  const required = [...requiredFields];
  const readSet = new Set(readFields);
  const unread = required.filter((f) => !readSet.has(f));
  return Object.freeze({
    family: 'transition',
    requiredFields: Object.freeze(required),
    readFields: Object.freeze([...readSet].sort()),
    active: true,
    readerFiles: Object.freeze([...TRANSITION_READER_FILES]),
    unreadFields: Object.freeze(unread),
    promotion,
  });
}

/**
 * Build `ActiveSurfaceFacts` — the HOST's job for #132. Pure given the source on
 * disk: a deterministic `ts.Program` over the reader paths yields the same field-read
 * verdict every run.
 */
export function buildActiveSurfaceFacts(opts: ActiveSurfaceReaderOptions): ActiveSurfaceFacts {
  const promotion = opts.promotion ?? 'advisory';
  const requiredFields = [...opts.transitionRequiredFields];
  const readerAbs = TRANSITION_READER_FILES.map((f) => resolve(opts.repoRoot, f));
  const program = createTypeDirectedProgram(readerAbs, opts.repoRoot);

  const allReads = new Set<TransitionField>();
  for (let i = 0; i < readerAbs.length; i++) {
    for (const f of readsInFile(TRANSITION_READER_FILES[i]!, readerAbs[i]!, program, requiredFields)) {
      allReads.add(f);
    }
  }

  return Object.freeze({
    surfaces: Object.freeze([makeTransitionEntry([...allReads].sort(), requiredFields, promotion)]),
  });
}
