/**
 * THE ACTIVE-SURFACE READER ORACLE — field-level TS-AST facts for #132.
 *
 * Extends the audit engine's source analysis (does NOT duplicate symbol-level orphan
 * detection). For each enrolled active modeled surface, scans designated reader paths
 * (interpreter / lowerer / runtime) and records which load-bearing fields are READ.
 *
 * Emits `ActiveSurfaceFacts` for the gauntlet FactGate — gauntlet stays lean
 * (no `typescript` dep); this module lives in `@liteship/audit`.
 *
 * @module
 */
import ts from 'typescript';
import { resolve } from 'node:path';
import type { ActiveSurfaceFacts, ActiveSurfaceEntry, ActiveSurfacePromotion } from '@liteship/gauntlet';
import { createTypeDirectedProgram } from './ts-program.js';
import type { TypeScriptPathAliases } from './ts-program.js';

/** The oracle id every active-surface fact is tagged with (traceability). */
export const ACTIVE_SURFACE_ORACLE_ID = 'ts-active-surface-reader';

type SurfaceField = string;

/** One host-enrolled modeled surface and the files that must read it. */
export interface EnrolledActiveSurface {
  readonly family: string;
  readonly switchCaseLabel: string;
  readonly readerFiles: readonly string[];
  readonly dedicatedReaderFiles: readonly string[];
  /** Identifier used by dedicated readers for this family. */
  readonly dedicatedReaderSubject: string;
}

/** Injected inputs for {@link buildActiveSurfaceFacts}. */
export interface ActiveSurfaceReaderOptions {
  /** Absolute repo root; every relative path resolves against it. */
  readonly repoRoot: string;
  /** Host-owned surface enrollment; the engine names no project families or paths. */
  readonly surfaces: readonly EnrolledActiveSurface[];
  /** Load-bearing fields keyed by the enrolled surface family. */
  readonly requiredFields: Readonly<Record<string, readonly string[]>>;
  /** Host-owned source aliases used by the TypeScript resolver. */
  readonly typeScriptPathAliases?: TypeScriptPathAliases;
  /**
   * The live `--ir` path now injects `'blocking'` (#130 landed the `interpretTransition`
   * reader, so the TransitionNode surface has readers and the gate is green at blocking).
   * `'advisory'` surfaces unread fields without blocking; fixtures also pass `'blocking'`
   * to prove the ratchet's teeth.
   */
  readonly promotion?: ActiveSurfacePromotion;
}

/** Collect property names read on `subject` inside `body` (direct access + destructuring). */
function fieldReadsInBlock(subject: string, body: ts.Node, requiredFields: readonly string[]): Set<SurfaceField> {
  const reads = new Set<SurfaceField>();
  const isField = (name: string): name is SurfaceField => requiredFields.includes(name);

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

/** Find `switch (X.family) { case '<label>': ... }` blocks and collect reads on X. */
function familyReadsInSourceFile(
  sf: ts.SourceFile,
  switchCaseLabel: string,
  requiredFields: readonly string[],
): Set<SurfaceField> {
  const reads = new Set<SurfaceField>();

  const visitSwitch = (stmt: ts.SwitchStatement): void => {
    const expr = stmt.expression;
    if (!ts.isPropertyAccessExpression(expr) || expr.name.text !== 'family') return;
    if (!ts.isIdentifier(expr.expression)) return;
    const subject = expr.expression.text;

    for (const clause of stmt.caseBlock.clauses) {
      if (!ts.isCaseClause(clause)) continue;
      const label = clause.expression;
      if (!ts.isStringLiteral(label) || label.text !== switchCaseLabel) continue;
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

/** Scan a dedicated interpreter file for node field property access. */
function familyReadsInDedicatedFile(
  sf: ts.SourceFile,
  subject: string,
  requiredFields: readonly string[],
): Set<SurfaceField> {
  return fieldReadsInBlock(subject, sf, requiredFields);
}

/** Scan one reader file; returns fields read in enrolled family contexts. */
function readsInFile(
  relPath: string,
  absPath: string,
  program: ts.Program,
  surface: EnrolledActiveSurface,
  requiredFields: readonly string[],
): Set<SurfaceField> {
  const sf = program.getSourceFile(absPath);
  if (sf === undefined) return new Set();
  if (surface.dedicatedReaderFiles.includes(relPath)) {
    return familyReadsInDedicatedFile(sf, surface.dedicatedReaderSubject, requiredFields);
  }
  return familyReadsInSourceFile(sf, surface.switchCaseLabel, requiredFields);
}

function makeSurfaceEntry(
  family: string,
  readFields: readonly SurfaceField[],
  requiredFields: readonly string[],
  readerFiles: readonly string[],
  promotion: ActiveSurfacePromotion,
): ActiveSurfaceEntry {
  const required = [...requiredFields];
  const readSet = new Set(readFields);
  const unread = required.filter((f) => !readSet.has(f));
  return Object.freeze({
    family,
    requiredFields: Object.freeze(required),
    readFields: Object.freeze([...readSet].sort()),
    active: true,
    readerFiles: Object.freeze([...readerFiles]),
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
  const allReaderFiles = opts.surfaces.flatMap((s) => [...s.readerFiles]);
  const readerAbs = allReaderFiles.map((f) => resolve(opts.repoRoot, f));
  const program = createTypeDirectedProgram(readerAbs, opts.repoRoot, opts.typeScriptPathAliases);

  const surfaces: ActiveSurfaceEntry[] = [];
  for (const surface of opts.surfaces) {
    const requiredFields = opts.requiredFields[surface.family];
    if (!requiredFields) continue;

    const allReads = new Set<SurfaceField>();
    for (let i = 0; i < surface.readerFiles.length; i++) {
      const rel = surface.readerFiles[i]!;
      const abs = resolve(opts.repoRoot, rel);
      for (const f of readsInFile(rel, abs, program, surface, requiredFields)) {
        allReads.add(f);
      }
    }
    surfaces.push(
      makeSurfaceEntry(surface.family, [...allReads].sort(), requiredFields, surface.readerFiles, promotion),
    );
  }

  return Object.freeze({
    surfaces: Object.freeze(surfaces),
  });
}
