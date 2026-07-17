/**
 * Type-directed capsule detector. Uses the TypeScript checker to find
 * every CallExpression whose resolved return type extends
 * CapsuleContract<K, In, Out, R>, regardless of whether the callee is
 * defineCapsule directly or a factory that wraps it.
 *
 * Replaces the syntax-only ts.createSourceFile walker that was blind to
 * factory wrappers (defineAsset, BeatMarkerProjection, ...).
 *
 * @module
 */

import ts from 'typescript';
import { resolve } from 'node:path';
// CUT B5b — one slash-normalize home. Slice B — the type-directed `ts.Program`
// config (WORKSPACE_ALIASES + CompilerOptions) is now sourced from @czap/audit
// so there is ONE config shared by the capsule detector and the repo-IR builder,
// never a divergent fork. WORKSPACE_ALIASES is re-exported below so the existing
// drift test (tests/unit/capsule-detector.test.ts) keeps pinning it.
import { normalizeRepoPath, WORKSPACE_ALIASES, createTypeDirectedProgram } from '@czap/audit';

export { WORKSPACE_ALIASES };

/**
 * Naming-convention map for known capsule factories. Source of truth lives in
 * the factory's `defineCapsule({ name: ... })` template literal — we mirror it
 * here so the manifest's surface name matches what the runtime registers. Keep
 * this in sync with the factories in `packages/assets/src/analysis/*.ts`.
 *
 * INDEXING NOTE: the projection factories now take a leading `registry` argument
 * — `BeatMarkerProjection(registry, audioAssetId)` — but {@link detectCapsuleCalls}
 * captures only DIRECTLY-SERIALIZABLE literal arguments: a non-literal like the
 * `registry` variable yields `undefined` from the literal reader and is SKIPPED,
 * never pushed. So `args` is the COMPACTED list of literal call-site arguments —
 * `['intro-bed']`, not `[undefined, 'intro-bed']`. The audioAssetId is therefore
 * still `args[0]`, and a bare numeric `bins` (if ever passed positionally) is
 * still `args[1]`. Do NOT bump these indices for the registry arg — it was never
 * captured.
 */
export const FACTORY_NAMING: Readonly<Record<string, (args: readonly unknown[]) => string | undefined>> = {
  BeatMarkerProjection: (args) => (typeof args[0] === 'string' ? `${args[0]}:beats` : undefined),
  OnsetProjection: (args) => (typeof args[0] === 'string' ? `${args[0]}:onsets` : undefined),
  WaveformProjection: (args) =>
    typeof args[0] === 'string' && typeof args[1] === 'number' ? `${args[0]}:waveform:${args[1]}` : undefined,
  WavMetadataProjection: (args) => (typeof args[0] === 'string' ? `${args[0]}:wav-metadata` : undefined),
};

/**
 * The bare source tokens that pre-select capsule-bearing files BEFORE the
 * type-directed detector runs: the two base factories (`defineCapsule`,
 * `defineAsset`) plus every {@link FACTORY_NAMING} key. DERIVED, never
 * hand-listed, so a new naming rule auto-extends the hint set.
 *
 * The SINGLE OWNER (scar S1.5.2): both `scripts/capsule-compile.ts`'s pre-filter
 * and the schema-strictness sweep (`tests/property/schema-strictness.prop.test.ts`)
 * import THIS list rather than keeping their own copies, so their candidate-file
 * sets can never drift apart — a hardcoded copy in the sweep previously could.
 *
 * Assumption: every capsule call site includes one of these bare tokens in its
 * source text — holds for all current invocation patterns (`defineCapsule({...})`,
 * `defineAsset(id, {...})`, `Factory(args)`).
 */
export const FACTORY_HINTS: readonly string[] = ['defineCapsule', 'defineAsset', ...Object.keys(FACTORY_NAMING)];

/** A single resolved capsule call site. */
export interface DetectedCall {
  /** Absolute path of the source file. */
  readonly file: string;
  /** 1-based line number of the call expression. */
  readonly line: number;
  /** Capsule kind, parsed from the K type parameter (e.g. 'cachedProjection'). */
  readonly kind: string;
  /** Capsule name. From the object literal `.name` for direct defineCapsule, or
   * from the first string-literal argument for factory calls. */
  readonly name: string;
  /** Set when the callee is not the literal `defineCapsule` identifier. */
  readonly factory?: string;
  /** Literal arguments captured from a factory call (string/number/bool/null). */
  readonly args?: readonly unknown[];
  /**
   * If the call sits at the right-hand side of an `export const X = ...`
   * (or top-level `const X = ...` followed by an `export { X }`), this is
   * the bound identifier — used by the harness to import the runtime
   * capsule binding into generated test files.
   */
  readonly binding?: string;
  /**
   * True when the binding is importable from the module: either its
   * variable statement carries the `export` modifier (`export const X = ...`)
   * or a same-file export list names it (`const X = ...; export { X };`,
   * including `export { X as Y }` — `binding` then holds the EXPORTED
   * name `Y`). Only exported bindings are importable by generated tests —
   * factory-wrapped capsules (defineAsset) are wired into the harness
   * only when this holds.
   */
  readonly exported?: boolean;
  /**
   * String-literal `source` property captured from a factory call's
   * object-literal argument (the defineAsset decl). The compile driver
   * threads it to the harness as the canonical decode fixture.
   */
  readonly declSource?: string;
}

/** Internal record before name resolution. */
interface RawHit {
  readonly file: string;
  readonly line: number;
  readonly kind: string;
  readonly node: ts.CallExpression;
  readonly callee: ts.Expression;
  readonly binding?: string;
  readonly exported?: boolean;
}

/** Type names whose `<K, ...>` first argument is the capsule kind. */
const CAPSULE_TYPE_NAMES = new Set(['CapsuleContract', 'CapsuleDef']);

/**
 * Build a TypeScript program covering enough of the repo to resolve
 * capsule contract return types across factory wrappers. Delegates to the
 * shared `@czap/audit` config (the ONE type-directed program substrate).
 */
function createProgram(files: readonly string[]): ts.Program {
  return createTypeDirectedProgram(files, process.cwd());
}

/**
 * Strip surrounding double quotes from a string literal type as rendered
 * by `checker.typeToString` (e.g. `"cachedProjection"` -> `cachedProjection`).
 * Returns undefined if the value is not a single-quoted-string form.
 */
function unquoteLiteralString(s: string): string | undefined {
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    return s.slice(1, -1);
  }
  return undefined;
}

/**
 * Try to extract the capsule kind from a resolved type.
 *
 * Returns the kind string (e.g. 'pureTransform') if `type` is or extends
 * CapsuleContract<K, ...> / CapsuleDef<K, ...>, else undefined.
 */
function tryExtractKind(checker: ts.TypeChecker, type: ts.Type): string | undefined {
  // Walk the candidate type itself plus its base types so we catch
  // CapsuleDef<K,...> which extends CapsuleContract<K,...>.
  const candidates: ts.Type[] = [type];
  const baseTypes = type.getBaseTypes?.() ?? [];
  for (const b of baseTypes) candidates.push(b);
  const apparent = checker.getApparentType(type);
  if (apparent !== type) candidates.push(apparent);

  for (const candidate of candidates) {
    // Check BOTH the alias name (covers literal `CapsuleContract<...>`
    // type expressions and external type aliases) AND the structural
    // symbol (covers cases where a private type alias like
    // `AnyAssetCapsule = CapsuleDef<...>` masks the underlying interface).
    const aliasName = candidate.aliasSymbol?.getName();
    const structuralName = candidate.getSymbol()?.getName();
    const matchedAlias = aliasName !== undefined && CAPSULE_TYPE_NAMES.has(aliasName);
    const matchedStructural =
      structuralName !== undefined && CAPSULE_TYPE_NAMES.has(structuralName);
    if (!matchedAlias && !matchedStructural) continue;

    // When the alias matched (CapsuleContract used directly), prefer
    // aliasTypeArguments — they were given by the user. Otherwise fall
    // back to structural type arguments on the reference (resolved
    // through any type-alias indirection).
    let typeArgs: readonly ts.Type[] | undefined;
    if (matchedAlias) {
      typeArgs = candidate.aliasTypeArguments;
    }
    if ((!typeArgs || typeArgs.length === 0) && matchedStructural) {
      typeArgs = checker.getTypeArguments(candidate as ts.TypeReference) as
        | readonly ts.Type[]
        | undefined;
    }
    if (!typeArgs || typeArgs.length === 0) continue;

    const first = typeArgs[0];
    if (!first) continue;

    // Direct string-literal type.
    if (first.isStringLiteral()) return first.value;
    // Render fallback handles weirder shapes like inferred string-literal
    // unions where the literal still prints as `"foo"`.
    const printed = checker.typeToString(first);
    const unquoted = unquoteLiteralString(printed);
    if (unquoted) return unquoted;
  }
  return undefined;
}

/**
 * Convert a literal-ish AST node to its primitive value, or undefined if
 * the node is not a directly serializable literal.
 */
function literalValue(node: ts.Node): unknown | undefined {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  return undefined;
}

/** Extract a callee's printable name, handling member expressions. */
function calleeName(expr: ts.Expression): string {
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr)) {
    return `${calleeName(expr.expression)}.${expr.name.text}`;
  }
  return expr.getText();
}

/**
 * Read a string-typed property out of a defineCapsule / defineAsset
 * object literal. Tries each name in `keys` in order. Returns the first
 * matching string-literal initializer found.
 */
function readStringPropertyFromObjectLiteral(
  obj: ts.ObjectLiteralExpression,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    for (const prop of obj.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;
      const keyText = ts.isIdentifier(prop.name)
        ? prop.name.text
        : ts.isStringLiteral(prop.name)
          ? prop.name.text
          : undefined;
      if (keyText === key && ts.isStringLiteral(prop.initializer)) {
        return prop.initializer.text;
      }
    }
  }
  return undefined;
}

/**
 * Public entrypoint: detect every capsule call site reachable from the
 * supplied root file set.
 */
export function detectCapsuleCalls(files: readonly string[]): readonly DetectedCall[] {
  if (files.length === 0) return [];

  const program = createProgram(files);
  const checker = program.getTypeChecker();
  const rootSet = new Set(files.map((f) => normalizeRepoPath(resolve(f))));

  const hits: RawHit[] = [];

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) continue;
    const normalized = normalizeRepoPath(resolve(sourceFile.fileName));
    if (!rootSet.has(normalized)) continue;

    // Export-list bindings — `const asset = defineAsset(...); export { asset };`
    // (incl. `export { asset as renamed }`) are just as importable as
    // `export const`. Map each LOCAL name to its EXPORTED name so binding
    // resolution below can (a) mark the capsule exported and (b) report the
    // name a generated test must actually import. Re-exports with a module
    // specifier (`export { x } from './y'`) and type-only exports are
    // skipped: neither makes THIS file's local value binding importable.
    const exportListNames = new Map<string, string>();
    for (const stmt of sourceFile.statements) {
      if (
        ts.isExportDeclaration(stmt) &&
        !stmt.isTypeOnly &&
        stmt.moduleSpecifier === undefined &&
        stmt.exportClause !== undefined &&
        ts.isNamedExports(stmt.exportClause)
      ) {
        for (const el of stmt.exportClause.elements) {
          if (el.isTypeOnly) continue;
          const local = el.propertyName?.text ?? el.name.text;
          exportListNames.set(local, el.name.text);
        }
      }
    }

    visit(sourceFile);

    function visit(node: ts.Node): void {
      if (ts.isCallExpression(node)) {
        const type = checker.getTypeAtLocation(node);
        const kind = tryExtractKind(checker, type);
        if (kind !== undefined) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
          // Walk up to find the enclosing `const X = ...` declaration so the
          // harness can later `import { X } from '<source>'`. We only need
          // direct `VariableDeclaration` parents — call sites buried deeper
          // (e.g. inside an array literal) won't have a stable binding name.
          let binding: string | undefined;
          let exported: boolean | undefined;
          let p: ts.Node | undefined = node.parent;
          while (p !== undefined) {
            if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) {
              binding = p.name.text;
              // `export const X = ...` — the variable statement two levels up
              // (VariableDeclaration -> VariableDeclarationList -> VariableStatement)
              // carries the export modifier when the binding is importable.
              const stmt = p.parent?.parent;
              if (stmt !== undefined && ts.isVariableStatement(stmt)) {
                exported =
                  stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) === true;
              }
              break;
            }
            // Stop walking once we've left the variable-decl initializer
            // chain — we don't want to climb into surrounding statements.
            if (
              !ts.isParenthesizedExpression(p) &&
              !ts.isAsExpression(p) &&
              !ts.isTypeAssertionExpression(p) &&
              !ts.isSatisfiesExpression(p) &&
              !ts.isCallExpression(p) &&
              !ts.isObjectLiteralExpression(p) &&
              !ts.isPropertyAssignment(p)
            ) {
              break;
            }
            p = p.parent;
          }
          // No export modifier on the variable statement — the binding can
          // still be exported through a later export list. Use the EXPORTED
          // name as the binding: that is the importable identifier.
          if (binding !== undefined && exported !== true) {
            const exportedAs = exportListNames.get(binding);
            if (exportedAs !== undefined) {
              binding = exportedAs;
              exported = true;
            }
          }
          hits.push({
            file: resolve(sourceFile.fileName),
            line: line + 1,
            kind,
            node,
            callee: node.expression,
            ...(binding !== undefined ? { binding } : {}),
            ...(exported !== undefined ? { exported } : {}),
          });
        }
      }
      ts.forEachChild(node, visit);
    }
  }

  // Resolve names + dedupe nested calls (a factory body's inner
  // defineCapsule resolves to the same kind; we only want the outermost
  // hit per file:line to avoid double-reporting).
  const out: DetectedCall[] = [];
  const seen = new Set<string>();

  for (const hit of hits) {
    const key = `${hit.file}:${hit.line}`;
    if (seen.has(key)) continue;

    const callee = hit.callee;
    const isDirectDefineCapsule =
      ts.isIdentifier(callee) && callee.text === 'defineCapsule';

    let name: string | undefined;
    let factory: string | undefined;
    let args: unknown[] | undefined;
    let declSource: string | undefined;

    if (isDirectDefineCapsule) {
      const [arg] = hit.node.arguments;
      if (arg && ts.isObjectLiteralExpression(arg)) {
        name = readStringPropertyFromObjectLiteral(arg, ['name']);
      }
    } else {
      factory = calleeName(callee);
      // First string-literal argument is the conventional name for factories
      // such as BeatMarkerProjection('intro-bed'). For factories that take
      // a config object (defineAsset({id, ...})), fall back to the object's
      // `id` (asset convention) or `name` property.
      const literalArgs: unknown[] = [];
      for (const a of hit.node.arguments) {
        const v = literalValue(a);
        if (v !== undefined) literalArgs.push(v);
      }
      args = literalArgs;
      const firstStr = literalArgs.find((v): v is string => typeof v === 'string');
      if (firstStr !== undefined) {
        name = firstStr;
      } else {
        const [firstArg] = hit.node.arguments;
        if (firstArg && ts.isObjectLiteralExpression(firstArg)) {
          name = readStringPropertyFromObjectLiteral(firstArg, ['name', 'id']);
          // Asset decls carry their canonical byte source — the harness's
          // decode fixture (defineAsset({ id, source, ... })).
          declSource = readStringPropertyFromObjectLiteral(firstArg, ['source']);
        }
      }
    }

    if (name === undefined) continue;

    seen.add(key);
    const bindingProp = hit.binding !== undefined ? { binding: hit.binding } : {};
    const exportedProp = hit.exported !== undefined ? { exported: hit.exported } : {};
    const declSourceProp = declSource !== undefined ? { declSource } : {};
    const detected: DetectedCall = factory === undefined
      ? { file: hit.file, line: hit.line, kind: hit.kind, name, ...bindingProp, ...exportedProp }
      : args !== undefined && args.length > 0
        ? { file: hit.file, line: hit.line, kind: hit.kind, name, factory, args, ...bindingProp, ...exportedProp, ...declSourceProp }
        : { file: hit.file, line: hit.line, kind: hit.kind, name, factory, ...bindingProp, ...exportedProp, ...declSourceProp };
    out.push(detected);
  }

  return out;
}
