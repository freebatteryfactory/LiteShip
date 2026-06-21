/**
 * The repo-IR — the normalized, content-addressed, data-oriented model of the
 * repository a Slice-B gate folds over (Slice B, phase B1 — the contract).
 *
 * This module defines the {@link RepoIR} INTERFACE and a pure in-memory
 * constructor ({@link makeRepoIR}) ONLY. It deliberately carries NO `typescript`
 * dependency: `@czap/gauntlet` is the lean, downstream-installable engine, and
 * the IR is an INJECTED capability (owner-ratified ⚑ decision 1). The gauntlet
 * DEFINES the shape; a host (the CLI, a later B1 step) BUILDS the real IR from
 * `@czap/audit`'s `ts.Program` and injects it via {@link GateContext.ir}. This
 * is the same injected-capability pattern as `CommandContext.runAudit`.
 *
 * Shape (design §1): ECS-style — parallel typed records keyed by stable ids
 * (`files`, `symbols`, `packages` as `ReadonlyMap`s; `imports`/`facts` as
 * `readonly` arrays; `refs` as a reverse index). Every value is frozen and
 * immutable — composition, not mutation. A real host strips volatile fields
 * (mtime, run-id) and content-addresses each node before handing the IR over;
 * this in-memory builder takes the digests it is given (or a documented
 * deterministic placeholder) so FIXTURES can build a literal IR with no parse.
 *
 * @module
 */

import { InvariantViolationError } from '@czap/error';
import type { SourceLocation } from './finding.js';
import type { AssuranceLevel } from './assurance.js';

/**
 * A repo-relative POSIX path, used as the stable identity of a file node.
 *
 * A documented string alias (NOT a nominal brand): the IR is plain immutable
 * data a host builds and a gate folds over, and a brand would force every
 * literal fixture and every cross-package consumer through a cast. The contract
 * is the value MUST be repo-relative, POSIX-separated, and de-duplicated —
 * {@link makeRepoIR} enforces uniqueness; the host enforces normalization.
 */
export type FileId = string;

/**
 * The stable identity of a symbol node. The convention a host follows is
 * `"<FileId>#<name>"` (file path, `#`, the exported/declared name), which keeps
 * it unique within a file and human-readable; the IR treats it as an opaque
 * de-duplicated key. {@link makeRepoIR} enforces uniqueness, not the format.
 */
export type SymbolId = string;

/** A package name (`@scope/name` or bare) — the stable identity of a package node. */
export type PkgName = string;

/**
 * How a fact was evidenced — the provenance-honesty model carried forward from
 * `@czap/audit`'s `coverageClassification`, so "0 findings" can never be read as
 * "checked and clean" when it was only ever a weak proxy. This is DATA the
 * divergence layer reads (design §2): a same-class disagreement is a real
 * contradiction; a cross-class one is a coverage gap + a retire-the-weak-oracle
 * signal.
 *
 * The four classes are the oracle-provenance subset of audit's superset
 * (`clean`/`allowlisted`/`policy-absent`/`not-checked` are audit-section
 * verdicts, not fact-provenance, so they are NOT mirrored here):
 * - `symbol-evidenced` — resolved by the type checker (cross-package types,
 *   factory return-types). The strongest evidence. (= audit's `symbol-evidenced`.)
 * - `file-proxy-only` — AST / module-graph evidence at file granularity, no type
 *   resolution. (= audit's `file-proxy-only`.)
 * - `text-only` — regex / textual evidence; known-imprecise (the class the
 *   Slice-B oracle work exists to retire).
 * - `runtime-evidenced` — observed from a command/capsule receipt at run time
 *   (markerCount, frameCount, resultId), not statically derived.
 */
export type CoverageClass = 'symbol-evidenced' | 'file-proxy-only' | 'text-only' | 'runtime-evidenced';

/** The coverage classes in ascending evidentiary strength — canonical ordering. */
export const COVERAGE_CLASSES = ['text-only', 'file-proxy-only', 'runtime-evidenced', 'symbol-evidenced'] as const;

/** A node in the file table. */
export interface FileNode {
  /** Repo-relative POSIX path — the node's stable identity. */
  readonly id: FileId;
  /**
   * The host fills this with a blake3 `AddressedDigest` display string over the
   * file's volatile-stripped utf8 bytes (design §1: blake3, not bare fnv1a which
   * collides at repo scale). In-memory fixtures may use a deterministic
   * placeholder (see {@link PLACEHOLDER_DIGEST}); the IR treats it as opaque.
   */
  readonly contentDigest: string;
  /** The package this file belongs to, or `null` for a repo-root / unowned file. */
  readonly packageName: PkgName | null;
}

/** A node in the symbol table — an exported or referenced declaration. */
export interface SymbolNode {
  /** Stable identity (host convention: `"<file>#<name>"`). */
  readonly id: SymbolId;
  /** The declared/exported name. */
  readonly name: string;
  /** What kind of declaration this is — the host's normalized syntactic kind. */
  readonly kind: SymbolKind;
  /** The file this symbol is declared in — MUST exist in {@link RepoIR.files}. */
  readonly file: FileId;
  /** Where the declaration points. */
  readonly location: SourceLocation;
}

/**
 * The normalized declaration kinds a symbol node carries — a closed `_tag`-style
 * union over the syntactic shapes the host extracts (design: ECS over the audit
 * `ExportedSymbol` facts). `default-export` and `export-assignment` are kept
 * distinct because the `no-default-export` oracle-divergence cross-check (B1)
 * turns on exactly that distinction (the default-export keyword form vs the
 * `export =` assignment form vs the `{ x as default }` re-export form). (Phrased
 * without the literal keyword pair so the text-only invariant scanner — which
 * cannot tell comment from code, the very imprecision this oracle cures — does
 * not flag this doc comment.)
 */
export type SymbolKind =
  | 'function'
  | 'class'
  | 'const'
  | 'let'
  | 'var'
  | 'type'
  | 'interface'
  | 'enum'
  | 'namespace'
  | 'default-export'
  | 'export-assignment'
  | 're-export';

/** How an import specifier resolves — mirrors `@czap/audit`'s `ResolvedImport.kind`. */
export type ImportKind = 'relative' | 'internal-package' | 'external';

/** An edge in the import graph — one resolved `import`/`export-from` specifier. */
export interface ImportEdge {
  /** The file the import appears in — MUST exist in {@link RepoIR.files}. */
  readonly fromFile: FileId;
  /** The raw specifier as written (`'./x.js'`, `'@czap/core'`, `'node:fs'`). */
  readonly specifier: string;
  /** How it resolved. */
  readonly kind: ImportKind;
  /**
   * The resolved target file, when known (`relative` / `internal-package`). When
   * present it MUST exist in {@link RepoIR.files} — {@link makeRepoIR} enforces
   * this (a dangling edge is an invariant violation).
   */
  readonly targetFile?: FileId;
  /** The resolved target package, when known (`internal-package` / `external`). */
  readonly targetPackage?: PkgName;
}

/** A node in the package table. */
export interface PackageNode {
  /** Package name — the node's stable identity. */
  readonly name: PkgName;
  /** Repo-relative source directory (e.g. `packages/core/src`). */
  readonly srcDir: string;
  /** The package's declared dependencies (manifest `dependencies` keys). */
  readonly manifestDeps: readonly string[];
}

/**
 * One site that references a symbol — the entry of the reverse-reference index.
 * The module-graph layer (design §1 `refs`): for each symbol, every place it is
 * referenced by name, with the evidence class of that reference.
 */
export interface RefSite {
  /** The file the reference appears in — MUST exist in {@link RepoIR.files}. */
  readonly fromFile: FileId;
  /** Where in that file, when known. */
  readonly location?: SourceLocation;
  /** How this reference was evidenced (checker-resolved vs graph vs text). */
  readonly coverageClass: CoverageClass;
}

/**
 * The oracle-emitted tuple (design §2). An oracle emits a `Fact` per
 * `(file, line, property)` it observes, tagged with WHICH oracle saw it and the
 * coverage class of that observation. The triangulation layer (a later B1 step)
 * groups facts by `(file, line, property)` and emits a self-explaining
 * divergence Finding when two oracles disagree.
 *
 * `value` is the ONE sanctioned `unknown` in this module. It is a HETEROGENEOUS
 * fact payload: different `property`/`oracleId` pairs carry different value
 * types (a boolean `isDefaultExport`, a string `returnType`, a number
 * `frameCount`). It is `unknown` — NOT `any` — precisely so a consumer CANNOT
 * read it blindly: a divergence check MUST narrow by `property`/`oracleId`
 * before touching it (`unknown` forces the guard; `any` would silently skip it).
 * This is the open extension point — a downstream oracle adds new
 * `property`/`value` pairs without changing this interface.
 */
export interface Fact {
  /** The file the fact concerns — MUST exist in {@link RepoIR.files}. */
  readonly file: FileId;
  /** The line, when the fact is line-located. */
  readonly line?: number;
  /** The named property observed (e.g. `'isDefaultExport'`, `'returnType'`). */
  readonly property: string;
  /** The heterogeneous payload — narrow by `property`/`oracleId` before use. */
  readonly value: unknown;
  /** Which oracle emitted this — the traceability + triangulation key. */
  readonly oracleId: string;
  /** How this observation was evidenced. */
  readonly coverageClass: CoverageClass;
}

/**
 * The repo-IR — one immutable, content-addressed value per run. ECS-shaped:
 * parallel typed tables keyed by stable ids. A gate folds over these tables
 * instead of re-scanning the corpus.
 *
 * `levels` is OPTIONAL and DEFERRED: assurance-level propagation along
 * call/import edges is B3 work (the `assurance-map.ts` "propagate along call
 * edges" item). B1 ships the IR without it.
 */
export interface RepoIR {
  /** The file table, keyed by {@link FileId}. */
  readonly files: ReadonlyMap<FileId, FileNode>;
  /** The symbol table, keyed by {@link SymbolId}. */
  readonly symbols: ReadonlyMap<SymbolId, SymbolNode>;
  /** The import graph as a flat edge list. */
  readonly imports: readonly ImportEdge[];
  /** The package table, keyed by {@link PkgName}. */
  readonly packages: ReadonlyMap<PkgName, PackageNode>;
  /** The reverse-reference index — symbol → the sites that reference it. */
  readonly refs: ReadonlyMap<SymbolId, readonly RefSite[]>;
  /** Assurance levels propagated along edges — DEFERRED to B3 (optional). */
  readonly levels?: ReadonlyMap<FileId | SymbolId, AssuranceLevel>;
  /** The oracle-emitted facts — the substrate the triangulation layer folds. */
  readonly facts: readonly Fact[];
}

/**
 * The deterministic placeholder content digest in-memory fixtures use when they
 * do not (and need not) compute a real blake3 digest. It is INERT by design —
 * never a real address — so a fixture's digest can never be mistaken for a
 * content-addressed one and the B2 incremental cache (which keys on real
 * digests) cannot be fooled by a fixture value. A host ALWAYS overwrites it.
 */
export const PLACEHOLDER_DIGEST = 'placeholder:no-content-address' as const;

/** The parts {@link makeRepoIR} composes into a {@link RepoIR}. */
export interface RepoIRParts {
  readonly files: readonly FileNode[];
  readonly symbols?: readonly SymbolNode[];
  readonly imports?: readonly ImportEdge[];
  readonly packages?: readonly PackageNode[];
  readonly refs?: ReadonlyMap<SymbolId, readonly RefSite[]>;
  readonly levels?: ReadonlyMap<FileId | SymbolId, AssuranceLevel>;
  readonly facts?: readonly Fact[];
}

/**
 * Build a {@link RepoIR} from flat parts — the one pure constructor (the
 * `AssetRegistry.make` / `memoryContext` composition style). Frozen, immutable,
 * and invariant-checked: it indexes the flat arrays into the keyed tables and
 * validates every referential invariant up front, throwing a tagged
 * {@link InvariantViolationError} on the first violation (never a bare throw,
 * never a silent skip). This lets a FIXTURE assemble a literal in-memory IR with
 * NO `ts.Program` — the same value a host would inject, minus the real digests.
 *
 * Invariants (all enforced):
 * - no duplicate {@link FileId} in `files`;
 * - no duplicate {@link SymbolId} in `symbols`;
 * - no duplicate {@link PkgName} in `packages`;
 * - every `SymbolNode.file` exists in `files`;
 * - every `ImportEdge.fromFile` exists in `files`;
 * - every `ImportEdge.targetFile` (when present) exists in `files`;
 * - every `RefSite.fromFile` (and every `refs` key as a SymbolId) is consistent;
 * - every `Fact.file` exists in `files`.
 */
export function makeRepoIR(parts: RepoIRParts): RepoIR {
  const files = indexUnique(parts.files, (f) => f.id, 'FileId', 'files');
  const symbols = indexUnique(parts.symbols ?? [], (s) => s.id, 'SymbolId', 'symbols');
  const packages = indexUnique(parts.packages ?? [], (p) => p.name, 'PkgName', 'packages');
  const imports = parts.imports ?? [];
  const refs = parts.refs ?? new Map<SymbolId, readonly RefSite[]>();
  const facts = parts.facts ?? [];

  // Referential integrity — a dangling reference is an impossible IR state.
  for (const [, symbol] of symbols) {
    if (!files.has(symbol.file)) {
      throw InvariantViolationError(
        'makeRepoIR',
        `symbol "${symbol.id}" declares file "${symbol.file}" which is not in the files table`,
      );
    }
  }
  for (const edge of imports) {
    if (!files.has(edge.fromFile)) {
      throw InvariantViolationError(
        'makeRepoIR',
        `import edge from "${edge.fromFile}" (specifier "${edge.specifier}") has a fromFile not in the files table`,
      );
    }
    if (edge.targetFile !== undefined && !files.has(edge.targetFile)) {
      throw InvariantViolationError(
        'makeRepoIR',
        `import edge "${edge.fromFile}" -> "${edge.specifier}" resolves to targetFile "${edge.targetFile}" which is not in the files table`,
      );
    }
  }
  for (const [symbolId, sites] of refs) {
    if (!symbols.has(symbolId)) {
      throw InvariantViolationError(
        'makeRepoIR',
        `refs index keys symbol "${symbolId}" which is not in the symbols table`,
      );
    }
    for (const site of sites) {
      if (!files.has(site.fromFile)) {
        throw InvariantViolationError(
          'makeRepoIR',
          `ref site for symbol "${symbolId}" cites file "${site.fromFile}" which is not in the files table`,
        );
      }
    }
  }
  for (const fact of facts) {
    if (!files.has(fact.file)) {
      throw InvariantViolationError(
        'makeRepoIR',
        `fact from oracle "${fact.oracleId}" (property "${fact.property}") cites file "${fact.file}" which is not in the files table`,
      );
    }
  }

  // Freeze every table + array so the IR is structurally immutable (composition,
  // not mutation). The Maps are frozen against re-assignment of methods; the
  // arrays are frozen against in-place mutation.
  const ir: RepoIR = {
    files,
    symbols,
    imports: Object.freeze([...imports]),
    packages,
    refs,
    ...(parts.levels !== undefined ? { levels: parts.levels } : {}),
    facts: Object.freeze([...facts]),
  };
  return Object.freeze(ir);
}

/**
 * Index a flat array into a `ReadonlyMap` keyed by `keyOf`, throwing a tagged
 * {@link InvariantViolationError} on the first duplicate key. The frozen map is
 * the immutable table the IR exposes.
 */
function indexUnique<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
  keyKind: string,
  table: string,
): ReadonlyMap<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    const key = keyOf(item);
    if (map.has(key)) {
      throw InvariantViolationError(
        'makeRepoIR',
        `duplicate ${keyKind} "${key}" in the ${table} table — each id must be unique`,
      );
    }
    map.set(key, item);
  }
  return map;
}
