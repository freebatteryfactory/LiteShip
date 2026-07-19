/**
 * The SYMBOL-EVIDENCED reference oracle (Slice B, phase B3 — the GREENFIELD
 * LanguageService oracle the design names: no `createLanguageService` /
 * `getReferencesAtPosition` existed anywhere in the repo before this).
 *
 * The repo-IR's existing reference evidence is two weaker classes: the
 * `file-proxy-only` module graph (`structure.ts` / `repo-ir-build.ts` name-match
 * an import specifier to a target file and credit EVERY by-name binding it pulls)
 * and `text-only` regex. Neither RESOLVES a symbol — they match NAMES. A real
 * TypeScript {@link ts.LanguageService} resolves TRUE cross-file references via
 * `getReferencesAtPosition`: it follows the symbol through re-exports, aliases,
 * and factory wrappers, and it never credits a name that merely COLLIDES. That is
 * the `symbol-evidenced` class — the strongest static evidence.
 *
 * This oracle builds a LanguageService over the SAME source corpus + the SAME
 * `typeDirectedCompilerOptions` the repo-IR builder and the capsule detector use
 * (the ".ts source not .d.ts" trick is mandatory — cross-package references must
 * resolve to source or they collapse), and for each EXPORTED symbol emits two
 * facts keyed on the IR's `<file>#<name>` {@link SymbolId} convention:
 *   • `symbol-reference-count` (number) — references OUTSIDE the declaration file.
 *   • `symbol-orphan` (boolean) — true iff that external count is zero.
 *
 * The `symbol-orphan-divergence` gate (in `@liteship/gauntlet`) folds these against
 * the IR's `file-proxy-only` `refs` reverse index. Where they DISAGREE — the
 * file-proxy graph credits a reference the LanguageService cannot resolve (a name
 * collision the weak graph launders), or the LanguageService resolves one the
 * graph missed (a re-export / alias chain the name-match could not follow) — the
 * gate reports a self-explaining divergence; symbol-evidenced wins by class, and
 * the divergence is the work-list to retire the weak graph.
 *
 * PERFORMANCE: a LanguageService over the whole repo is HEAVY — it builds and
 * holds a full type-checked program, and `getReferencesAtPosition` walks every
 * source file per query. This is the most expensive oracle in the set. The
 * mitigations are the `--ir`-path (the IR is built ONCE per run and folded by
 * many gates) and the B2 content-addressed verdict cache (an unchanged corpus
 * digest serves the cached findings, so the LanguageService never re-runs). Treat
 * it as a per-run, not per-gate, cost; never call it inside a tight loop.
 *
 * Determinism: the corpus is read sorted (the shared `readProfileSourceFileRecords`
 * already sorts); symbols are visited in source order and the emitted facts are
 * sorted before return; no `Date.now` / `Math.random`. Building twice over
 * unchanged source yields identical facts — the property the B2 cache depends on.
 *
 * @module
 */
import ts from 'typescript';
import { resolve } from 'node:path';
import { InvariantViolationError } from '@liteship/error';
import type { Fact, FileId, SymbolId } from '@liteship/gauntlet';
import { liteshipDevopsProfile } from './devops-profile.js';
import type { DevopsProfile } from './devops-profile.js';
import { readProfileSourceFileRecords, listProfilePackageManifests } from './shared.js';
import type { SourceFileRecord, PackageManifestInfo } from './shared.js';
import { exportedNamesFromNode, hasModifier } from './structure.js';
import { typeDirectedCompilerOptions } from './ts-program.js';

/** The oracle id every fact this module emits is tagged with — the traceability key. */
export const LANGUAGE_SERVICE_ORACLE_ID = 'ts-language-service';

/**
 * The `symbol-orphan` property: a boolean fact, `true` iff the symbol has ZERO
 * references outside its own declaration file (resolved by the LanguageService).
 */
export const SYMBOL_ORPHAN_PROPERTY = 'symbol-orphan';

/**
 * The `symbol-reference-count` property: a number fact carrying the count of
 * references OUTSIDE the symbol's declaration file (the cross-file reference
 * count the LanguageService resolved). Carried alongside `symbol-orphan` so a
 * reader sees the magnitude, not just the boolean.
 */
export const SYMBOL_REFERENCE_COUNT_PROPERTY = 'symbol-reference-count';

/**
 * The structured payload of a `symbol-orphan` fact's `value` — the heterogeneous
 * {@link Fact.value} for this oracle. It carries the symbol NAME and the resolved
 * external reference count alongside the orphan boolean, so the divergence gate
 * can (a) reconstruct the `<file>#<name>` {@link SymbolId} to join against the
 * IR's `refs` index and (b) report the magnitude. `value` is `unknown` on the
 * Fact, so the consumer MUST narrow to this shape before reading it.
 */
export interface OrphanValue {
  /** The exported symbol's declared name (the `#<name>` half of its SymbolId). */
  readonly name: string;
  /** True iff the LanguageService resolved ZERO references outside the decl file. */
  readonly isOrphan: boolean;
  /** The count of references OUTSIDE the declaration file (the external count). */
  readonly externalReferenceCount: number;
}

/** Input to {@link symbolReferenceOracle} — the same profile/corpus seam `buildRepoIR` uses. */
export interface SymbolReferenceOracleInput {
  /**
   * The audit profile (`profile.repoRoot` is the authoritative target). Defaults
   * to the LiteShip reference profile — the integrator passes the SAME profile it
   * hands `buildRepoIR`, so the oracle's facts land on the same file nodes.
   */
  readonly profile?: DevopsProfile;
}

/** A minimal in-memory {@link ts.IScriptSnapshot} over a fixed source string. */
function scriptSnapshot(text: string): ts.IScriptSnapshot {
  return {
    getText: (start, end) => text.slice(start, end),
    getLength: () => text.length,
    // The corpus is immutable for the oracle's lifetime — there is no prior
    // snapshot to diff against, so no incremental change range.
    getChangeRange: () => undefined,
  };
}

/**
 * Build a {@link ts.LanguageServiceHost} over a fixed corpus of source records.
 * The host is the read-only projection a LanguageService needs: the script file
 * set, a constant version per file (the corpus never mutates within one run), an
 * in-memory snapshot per file, and the SHARED type-directed compiler options +
 * default-lib resolution. The ".ts source not .d.ts" trick lives in
 * {@link typeDirectedCompilerOptions}'s `paths`, so cross-package references
 * resolve to source.
 */
function makeLanguageServiceHost(records: readonly SourceFileRecord[], baseUrl: string): ts.LanguageServiceHost {
  // The script set is the absolute paths of the corpus, plus the lib files the
  // resolver pulls in transitively. The default compiler host supplies lib reads.
  const options = typeDirectedCompilerOptions(baseUrl);
  const fileNames = records.map((record) => resolve(record.absolutePath));
  const textByPath = new Map<string, string>(records.map((record) => [resolve(record.absolutePath), record.text]));

  return {
    getScriptFileNames: () => fileNames,
    // A constant version: the corpus is fixed for this oracle's lifetime, so the
    // LanguageService never needs to invalidate a snapshot.
    getScriptVersion: () => '1',
    getScriptSnapshot: (fileName) => {
      const inMemory = textByPath.get(resolve(fileName));
      if (inMemory !== undefined) return scriptSnapshot(inMemory);
      // A lib / external .d.ts the resolver reached for — read it from disk via
      // the default sys. ts.sys is the sanctioned host fs reader (not a bare fs).
      const onDisk = ts.sys.readFile(fileName);
      return onDisk !== undefined ? scriptSnapshot(onDisk) : undefined;
    },
    getCompilationSettings: () => options,
    getCurrentDirectory: () => baseUrl,
    getDefaultLibFileName: (opts) => ts.getDefaultLibFilePath(opts),
    fileExists: (path) => textByPath.has(resolve(path)) || ts.sys.fileExists(path),
    readFile: (path, encoding) => textByPath.get(resolve(path)) ?? ts.sys.readFile(path, encoding),
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  };
}

/** One exported symbol's declaration site — the name position the oracle queries. */
interface ExportSite {
  /** Repo-relative file id (the IR's FileId). */
  readonly file: FileId;
  /** The declared/exported name. */
  readonly name: string;
  /** Absolute path of the declaring file (the LanguageService query target). */
  readonly absolutePath: string;
  /** 0-based offset of the name in the source (the `getReferencesAtPosition` pos). */
  readonly pos: number;
  /** 1-based line of the declaration (the fact's location). */
  readonly line: number;
}

/**
 * Collect every EXPORTED symbol declaration site in one source file, reusing
 * `structure.ts`'s {@link exportedNamesFromNode} + {@link hasModifier} (the same
 * extraction the audit pass uses — no divergent fork). A statement contributes
 * its names only when it is an exported declaration (the `export` modifier, or an
 * export-declaration / export-assignment which are exports by construction),
 * exactly the gate condition `structure.ts` applies. The query position is the
 * NAME's start (so the LanguageService resolves the symbol, not the keyword).
 */
function collectExportSites(record: SourceFileRecord): readonly ExportSite[] {
  const sites: ExportSite[] = [];
  const sourceFile = record.sourceFile;

  const visit = (node: ts.Node): void => {
    const isExportable =
      ts.isFunctionDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isEnumDeclaration(node) ||
      ts.isVariableStatement(node) ||
      ts.isExportDeclaration(node) ||
      ts.isExportAssignment(node);
    if (
      isExportable &&
      (hasModifier(node, ts.SyntaxKind.ExportKeyword) || ts.isExportDeclaration(node) || ts.isExportAssignment(node))
    ) {
      for (const symbol of exportedNamesFromNode(node)) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(symbol.pos);
        sites.push({
          file: record.relativePath,
          name: symbol.name,
          absolutePath: record.absolutePath,
          pos: symbol.pos,
          line: line + 1,
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return sites;
}

/**
 * Count the references to the symbol at `site` that resolve to a DIFFERENT file
 * than its declaration — the external (cross-file) reference count. The
 * LanguageService's `getReferencesAtPosition` returns every resolved reference
 * (including the declaration itself and same-file uses); the external count
 * filters to references whose `fileName` differs from the declaration file. A
 * symbol with zero external references is an orphan (no in-repo cross-file
 * consumer resolves to it).
 */
function countExternalReferences(service: ts.LanguageService, site: ExportSite, declAbsolute: string): number {
  const references = service.getReferencesAtPosition(site.absolutePath, site.pos);
  if (references === undefined) return 0;
  let external = 0;
  for (const reference of references) {
    if (resolve(reference.fileName) !== declAbsolute) external += 1;
  }
  return external;
}

/**
 * The SYMBOL-EVIDENCED reference oracle. Builds a {@link ts.LanguageService} over
 * the profile's source corpus and, for each exported symbol, resolves its TRUE
 * cross-file references via `getReferencesAtPosition`. Emits a `symbol-orphan`
 * fact (boolean, structured {@link OrphanValue} payload) and a paired
 * `symbol-reference-count` fact (number) per exported symbol, both tagged
 * `oracleId: 'ts-language-service'`, `coverageClass: 'symbol-evidenced'`, and
 * located at the declaration `(file, line)`.
 *
 * Pure + deterministic: same source bytes → identical, sorted facts. Throws a
 * tagged {@link InvariantViolationError} (never a bare throw, never a silent
 * catch) when the corpus is non-empty yet the LanguageService cannot construct a
 * program — a genuinely unresolvable program is a hard fault, not a silent zero.
 *
 * @param input The profile seam — pass the SAME `DevopsProfile` handed to
 *   `buildRepoIR` so the facts land on the IR's file nodes.
 */
export function symbolReferenceOracle(input: SymbolReferenceOracleInput = {}): readonly Fact[] {
  const profile = input.profile ?? liteshipDevopsProfile;
  const records = readProfileSourceFileRecords(profile);
  if (records.length === 0) return [];

  // The manifests are listed for parity with buildRepoIR's corpus discovery; the
  // oracle resolves references over the SAME records, so it needs no separate
  // package model. (Listed to fail early + identically if discovery is broken.)
  const manifests: readonly PackageManifestInfo[] = listProfilePackageManifests(profile);
  if (manifests.length === 0) {
    // A non-empty corpus with no discovered packages is an impossible IR state
    // (every source record is discovered through a package) — fail loud.
    throw InvariantViolationError(
      'symbolReferenceOracle',
      `read ${records.length} source records but discovered no packages under "${profile.repoRoot}" — the corpus and package discovery diverged`,
    );
  }

  const host = makeLanguageServiceHost(records, profile.repoRoot);
  const service = ts.createLanguageService(host, ts.createDocumentRegistry());

  // A non-empty corpus MUST yield a program; if the LanguageService cannot build
  // one the references are unresolvable and a zero count would be a LIE.
  const program = service.getProgram();
  if (program === undefined) {
    throw InvariantViolationError(
      'symbolReferenceOracle',
      `the LanguageService produced no program over ${records.length} source files rooted at "${profile.repoRoot}" — the corpus is unresolvable`,
    );
  }

  const facts: Fact[] = [];
  for (const record of records) {
    for (const site of collectExportSites(record)) {
      const declAbsolute = resolve(site.absolutePath);
      const externalReferenceCount = countExternalReferences(service, site, declAbsolute);
      const isOrphan = externalReferenceCount === 0;
      // The gate reconstructs the IR SymbolId (`<file>#<name>`) from (file, name)
      // via symbolIdOfOrphanFact — the oracle carries the name in the value payload.
      const orphanValue: OrphanValue = { name: site.name, isOrphan, externalReferenceCount };
      facts.push({
        file: site.file,
        line: site.line,
        property: SYMBOL_ORPHAN_PROPERTY,
        value: orphanValue,
        oracleId: LANGUAGE_SERVICE_ORACLE_ID,
        coverageClass: 'symbol-evidenced',
      });
      facts.push({
        file: site.file,
        line: site.line,
        property: SYMBOL_REFERENCE_COUNT_PROPERTY,
        value: externalReferenceCount,
        oracleId: LANGUAGE_SERVICE_ORACLE_ID,
        coverageClass: 'symbol-evidenced',
      });
    }
  }

  // Deterministic ordering: file, then line, then property (so the two facts per
  // symbol sit together in a stable order). Mirrors buildRepoIR's fact sort.
  facts.sort(
    (a, b) => a.file.localeCompare(b.file) || (a.line ?? 0) - (b.line ?? 0) || a.property.localeCompare(b.property),
  );
  return facts;
}

/**
 * Reconstruct the IR {@link SymbolId} (`<file>#<name>`) a `symbol-orphan` fact
 * concerns, from the fact's `file` and its structured {@link OrphanValue} `name`.
 * Exported so the divergence gate JOINS the symbol-evidenced facts against the
 * IR's `refs` reverse index (which is keyed on the same convention) WITHOUT the
 * gate re-deriving the convention — one source of the key shape.
 */
export function symbolIdOfOrphanFact(file: FileId, value: OrphanValue): SymbolId {
  return `${file}#${value.name}`;
}

/**
 * Narrow a {@link Fact}'s `unknown` value to {@link OrphanValue} — the guard a
 * consumer MUST pass before reading a `symbol-orphan` fact's payload (the value
 * is `unknown` precisely to force this). Returns `undefined` for any other shape
 * (never throws — a malformed fact is simply not an orphan observation).
 */
export function asOrphanValue(value: unknown): OrphanValue | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.name === 'string' &&
    typeof candidate.isOrphan === 'boolean' &&
    typeof candidate.externalReferenceCount === 'number'
  ) {
    return {
      name: candidate.name,
      isOrphan: candidate.isOrphan,
      externalReferenceCount: candidate.externalReferenceCount,
    };
  }
  return undefined;
}
