/**
 * Spine-relation FACTS builder — the heavy `ts.Program` host that computes the
 * two-axis `SpineRelationFacts` the lean `spineRelationGate` folds (Wave 8.5,
 * ADR-0023: the host produces the facts, the lean gate folds them; @liteship/gauntlet
 * carries no `typescript` dependency, so this work lives here).
 *
 * HOW IT OBSERVES THE RELATION (the compiler is the oracle, never a hand-rolled
 * structural comparison — no cheerful holes in the floor). For each admitted mirror
 * type it generates ONE synthetic module carrying a bidirectional assignability probe:
 * a namespace import of the spine + the runtime producer module, a `declare const` per
 * side (the RESOLUTION probe), and two `const` assignments (spine→runtime and
 * runtime→spine — the ASSIGNABILITY probe). For `CompositeState` the generated lines are,
 * in effect: `declare const s_0: Spine.CompositeState; declare const r_0:
 * Rt0.CompositeState; const _s2r_0: Rt0.CompositeState = s_0; const _r2s_0:
 * Spine.CompositeState = r_0;` (the imports are emitted as string data, never as real
 * imports of THIS module — audit's own import graph stays clean).
 *
 * It compiles the module through the audit type-directed program (an overlay
 * `CompilerHost` serves the synthetic file + any injected drift), reads the compiler's
 * OWN diagnostics, and attributes each to its line: a diagnostic on a `declare const`
 * line means the type did not RESOLVE (a renamed/removed mirror); a diagnostic on an
 * assertion line means that DIRECTION of assignability failed. `(s2r, r2s)` →
 * `classifyStructuralRelation` → the observed relation. This uses ONLY the
 * public TypeScript API (the same `getPreEmitDiagnostics` the whole toolchain trusts)
 * and the compiler's own assignability judgment — the exact oracle the frozen
 * spine-conformance pins relied on, now driven mechanically over the COMPLETE admitted
 * set so no Codec-class type is forgotten.
 *
 * DETERMINISTIC: fixed compiler options (the shared {@link typeDirectedCompilerOptions}),
 * admissions probed in a stable order, no time/random input. Byte-stable facts over
 * unchanged source.
 *
 * POLICY-FREE (ADR-0012): this module names no LiteShip mirror. The host (the devops
 * test / the CLI) supplies the admission table; the audit engine only probes it.
 *
 * @module
 */

import { resolve } from 'node:path';
import ts from 'typescript';
import type { SpineAuthority, SpineRelationFacts, SpineRelationObservation, SurfaceRelation } from '@liteship/gauntlet';
import { classifyStructuralRelation } from '@liteship/gauntlet';
import { typeDirectedCompilerOptions } from './ts-program.js';
import type { TypeScriptPathAliases } from './ts-program.js';

/**
 * One admitted mirror type — the host-supplied seed row (frozen from the current
 * spine-conformance pins). `spineExpr` is the type expression under the `@liteship/_spine`
 * namespace (e.g. `CompositeState`, `Codec<{ readonly a: 1 }, { readonly a: 1 }>`,
 * `Millis`); `runtimeExpr` the expression under the runtime module's namespace;
 * `runtimeModule` the repo-relative `.ts` source path of the runtime producer.
 */
export interface SpineTypeAdmission {
  readonly typeName: string;
  readonly authority: SpineAuthority;
  readonly admittedRelation: SurfaceRelation;
  readonly spineExpr: string;
  readonly runtimeModule: string;
  readonly runtimeExpr: string;
}

/** Options for {@link buildSpineRelationFacts}. */
export interface SpineRelationBuildOptions {
  /** Host-owned module specifier for the declaration spine under test. */
  readonly spinePackageSpecifier: string;
  /** Host-owned source aliases used by the TypeScript resolver. */
  readonly typeScriptPathAliases?: TypeScriptPathAliases;
  /**
   * In-memory content overrides, keyed by ABSOLUTE path — the seam the acceptance test
   * uses to inject a DRIFTED spine (e.g. CapSet `Set`→array) without touching disk. A
   * path present here is served with the override content; every other file reads from
   * the real filesystem.
   */
  readonly overlay?: Readonly<Record<string, string>>;
}

/** The synthetic probe file's absolute path (never written to disk — served by the overlay host). */
function syntheticPath(repoRoot: string): string {
  return resolve(repoRoot, '__liteship_spine_relation_probe__.ts');
}

/**
 * The spine package specifier the generated probe imports — assembled from parts so the
 * `from '<spine>'` import literal never appears verbatim in THIS module's source. It is
 * a mention inside generated string data, not a real import of this module; the b5
 * package-graph law greps raw text and would otherwise false-positive on it (the audit
 * import graph itself only reaches the blessed @liteship/gauntlet leaf).
 */
/** The import specifier for a runtime module: repo-relative `.ts` → `./…/x.js`. */
function moduleSpecifier(runtimeModule: string): string {
  const normalized = runtimeModule.replace(/\.tsx?$/, '.js');
  return normalized.startsWith('.') ? normalized : `./${normalized}`;
}

/** Qualify a type expression against a namespace import, including value-member `typeof` probes. */
function qualifyTypeExpression(namespace: string, expression: string): string {
  const trimmed = expression.trim();
  return trimmed.startsWith('typeof ')
    ? `typeof ${namespace}.${trimmed.slice('typeof '.length)}`
    : `${namespace}.${trimmed}`;
}

interface ProbeLines {
  readonly admission: SpineTypeAdmission;
  readonly spineDeclLine: number; // 0-based line of `declare const s_i`
  readonly runtimeDeclLine: number; // 0-based line of `declare const r_i`
  readonly spineAnyLine: number; // 0-based line of the spine-side is-any guard
  readonly runtimeAnyLine: number; // 0-based line of the runtime-side is-any guard
  readonly s2rLine: number; // 0-based line of `const _s2r_i`
  readonly r2sLine: number; // 0-based line of `const _r2s_i`
  readonly moduleImportLine: number; // 0-based line of the runtime module's import
}

/** Generate the synthetic probe source + the per-admission line map. */
function generateProbe(
  admissions: readonly SpineTypeAdmission[],
  spinePackageSpecifier: string,
): {
  readonly source: string;
  readonly probes: readonly ProbeLines[];
} {
  const lines: string[] = [];
  lines.push(`import type * as Spine from '${spinePackageSpecifier}';`);
  // The IS-ANY guard: `0 extends (1 & T)` is true ONLY when T is `any`. A per-admission
  // guard line `const _sAny_i: IsAny<Spine.X> = false;` therefore ERRORS iff the type
  // resolved to `any` — the exact silent hole an unaliased cross-package import or a
  // missing module opens (an `any` type makes BOTH assignability probes trivially pass →
  // a false `exact`). A diagnostic on the guard line downgrades the observation to
  // unresolved, so a collapse-to-`any` reds instead of laundering green.
  lines.push(`type IsAny<T> = 0 extends 1 & T ? true : false;`);
  // Runtime-owned declarations may carry a module-private unique-symbol witness
  // solely to make their constructor unforgeable (typed ECS Parts/Systems are the
  // canonical example). A separately-authored declaration mirror cannot name that
  // private symbol, so comparing the raw nominal shell makes an otherwise identical
  // public contract permanently `opaque`. Compare the externally nameable contract:
  // string/number keys plus the two public well-known lifecycle symbols. Primitive
  // intersections are preserved verbatim so nested public brands such as Millis and
  // ContentAddress retain their identity; only object-member witnesses are projected.
  // Callable/constructable shapes are rebuilt recursively so private Part witnesses in
  // method parameters cannot make the containing ECS contract permanently opaque.
  // Spine-authority admissions remain raw below as an additional brand-owner guard.
  lines.push(
    `type PublicContract<T> = T extends string | number | boolean | bigint | symbol | null | undefined ? T : T extends (...args: any[]) => any ? (...args: PublicContractTuple<Parameters<T>>) => PublicContract<ReturnType<T>> : T extends abstract new (...args: any[]) => infer R ? abstract new (...args: PublicContractTuple<ConstructorParameters<T>>) => PublicContract<R> : T extends readonly unknown[] ? number extends T['length'] ? ReadonlyArray<PublicContract<T[number]>> : { readonly [K in keyof T]: PublicContract<T[K]> } : T extends object ? { [K in keyof T as K extends string | number | typeof Symbol.dispose | typeof Symbol.asyncDispose ? K : never]: PublicContract<T[K]> } : T;`,
  );
  lines.push(`type PublicContractTuple<T extends readonly unknown[]> = { [K in keyof T]: PublicContract<T[K]> };`);
  // One import per distinct runtime module (stable alias by first-seen order).
  const moduleAlias = new Map<string, string>();
  const moduleImportLine = new Map<string, number>();
  for (const admission of admissions) {
    if (moduleAlias.has(admission.runtimeModule)) continue;
    const alias = `Rt${moduleAlias.size}`;
    moduleAlias.set(admission.runtimeModule, alias);
    moduleImportLine.set(admission.runtimeModule, lines.length);
    lines.push(`import type * as ${alias} from '${moduleSpecifier(admission.runtimeModule)}';`);
  }
  const probes: ProbeLines[] = [];
  admissions.forEach((admission, i) => {
    const alias = moduleAlias.get(admission.runtimeModule)!;
    const rawSpineType = qualifyTypeExpression('Spine', admission.spineExpr);
    const rawRuntimeType = qualifyTypeExpression(alias, admission.runtimeExpr);
    const spineType = admission.authority === 'runtime' ? `PublicContract<${rawSpineType}>` : rawSpineType;
    const runtimeType = admission.authority === 'runtime' ? `PublicContract<${rawRuntimeType}>` : rawRuntimeType;
    const spineDeclLine = lines.length;
    lines.push(`declare const s_${i}: ${spineType};`);
    const runtimeDeclLine = lines.length;
    lines.push(`declare const r_${i}: ${runtimeType};`);
    const spineAnyLine = lines.length;
    lines.push(`const _sAny_${i}: IsAny<${spineType}> = false;`);
    const runtimeAnyLine = lines.length;
    lines.push(`const _rAny_${i}: IsAny<${runtimeType}> = false;`);
    const s2rLine = lines.length;
    lines.push(`const _s2r_${i}: ${runtimeType} = s_${i};`);
    const r2sLine = lines.length;
    lines.push(`const _r2s_${i}: ${spineType} = r_${i};`);
    probes.push({
      admission,
      spineDeclLine,
      runtimeDeclLine,
      spineAnyLine,
      runtimeAnyLine,
      s2rLine,
      r2sLine,
      moduleImportLine: moduleImportLine.get(admission.runtimeModule)!,
    });
  });
  lines.push('');
  return { source: lines.join('\n'), probes };
}

/** A `CompilerHost` that serves the synthetic probe file + any overlay overrides. */
function overlayHost(
  options: ts.CompilerOptions,
  virt: string,
  virtSource: string,
  overlay: Readonly<Record<string, string>>,
): ts.CompilerHost {
  const host = ts.createCompilerHost(options);
  const overrideOf = (fileName: string): string | undefined => {
    const abs = resolve(fileName);
    if (abs === virt) return virtSource;
    return overlay[abs];
  };
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) => {
    const override = overrideOf(fileName);
    if (override !== undefined) {
      return ts.createSourceFile(fileName, override, languageVersion, true, ts.ScriptKind.TS);
    }
    return getSourceFile(fileName, languageVersion, onError, shouldCreate);
  };
  const fileExists = host.fileExists.bind(host);
  host.fileExists = (fileName) => (resolve(fileName) === virt ? true : fileExists(fileName));
  const readFile = host.readFile.bind(host);
  host.readFile = (fileName) => overrideOf(fileName) ?? readFile(fileName);
  return host;
}

/**
 * Probe every admitted mirror type's bidirectional assignability against its runtime
 * source and classify the observed two-axis relation. Returns flat, already-observed
 * `SpineRelationFacts` for the lean gate to fold. Observations are returned in
 * the admission order supplied.
 */
export function buildSpineRelationFacts(
  admissions: readonly SpineTypeAdmission[],
  repoRoot: string,
  options: SpineRelationBuildOptions,
): SpineRelationFacts {
  const virt = syntheticPath(repoRoot);
  const { source, probes } = generateProbe(admissions, options.spinePackageSpecifier);
  const compilerOptions = {
    ...typeDirectedCompilerOptions(repoRoot, options.typeScriptPathAliases),
    noEmit: true,
  };
  const host = overlayHost(compilerOptions, virt, source, options.overlay ?? {});
  const program = ts.createProgram({ rootNames: [virt], options: compilerOptions, host });
  const checker = program.getTypeChecker();
  const syntheticFile = program.getSourceFile(virt);
  const spineImport = syntheticFile?.statements.find(ts.isImportDeclaration);
  const spineModuleSymbol =
    spineImport !== undefined && ts.isStringLiteral(spineImport.moduleSpecifier)
      ? checker.getSymbolAtLocation(spineImport.moduleSpecifier)
      : undefined;
  const spineExports = new Map(
    (spineModuleSymbol === undefined ? [] : checker.getExportsOfModule(spineModuleSymbol)).map((symbol) => [
      symbol.name,
      symbol,
    ]),
  );
  const unresolvedSpineRoots = new Set<string>();
  for (const admission of admissions) {
    const root = /^[A-Za-z_$][\w$]*/u.exec(admission.spineExpr.trim().replace(/^typeof\s+/u, ''))?.[0];
    if (root === undefined) continue;
    const exported = spineExports.get(root);
    if (exported === undefined) {
      unresolvedSpineRoots.add(root);
      continue;
    }
    const target = (exported.flags & ts.SymbolFlags.Alias) === 0 ? exported : checker.getAliasedSymbol(exported);
    if (target.name === 'unknown' || target.declarations === undefined || target.declarations.length === 0) {
      unresolvedSpineRoots.add(root);
    }
  }

  // Diagnostics ON the synthetic file, bucketed by their 0-based line.
  const linesWithDiag = new Map<number, string>();
  for (const diag of ts.getPreEmitDiagnostics(program)) {
    if (diag.file === undefined || resolve(diag.file.fileName) !== virt) continue;
    const line = diag.file.getLineAndCharacterOfPosition(diag.start ?? 0).line;
    if (!linesWithDiag.has(line)) {
      linesWithDiag.set(line, ts.flattenDiagnosticMessageText(diag.messageText, ' '));
    }
  }

  const observations: SpineRelationObservation[] = probes.map((probe): SpineRelationObservation => {
    const { admission } = probe;
    const base = {
      typeName: admission.typeName,
      authority: admission.authority,
      admittedRelation: admission.admittedRelation,
    };
    const surfaceName = /^[A-Za-z_$][\w$]*/u.exec(admission.typeName)?.[0] ?? admission.typeName;
    const moduleFailed = linesWithDiag.has(probe.moduleImportLine);
    const spineUnresolved = linesWithDiag.has(probe.spineDeclLine) || unresolvedSpineRoots.has(surfaceName);
    const runtimeUnresolved = moduleFailed || linesWithDiag.has(probe.runtimeDeclLine);
    // A fired is-any guard means the type silently resolved to `any` (an unaliased
    // cross-package import / a broken type) — an `any` makes both assignability probes
    // trivially pass, so it MUST be treated as unresolved, never a false `exact`.
    const spineIsAny = linesWithDiag.has(probe.spineAnyLine);
    const runtimeIsAny = linesWithDiag.has(probe.runtimeAnyLine);
    if (spineUnresolved || runtimeUnresolved || spineIsAny || runtimeIsAny) {
      const detail = moduleFailed
        ? `runtime module ${admission.runtimeModule} did not resolve: ${linesWithDiag.get(probe.moduleImportLine)}`
        : spineUnresolved
          ? `spine type Spine.${admission.spineExpr} did not resolve: ${linesWithDiag.get(probe.spineDeclLine) ?? `root export ${surfaceName} has no declaration target`}`
          : runtimeUnresolved
            ? `runtime type ${admission.runtimeExpr} (${admission.runtimeModule}) did not resolve: ${linesWithDiag.get(probe.runtimeDeclLine)}`
            : spineIsAny
              ? `spine type Spine.${admission.spineExpr} resolved to \`any\` (an unaliased cross-package import or a broken type) — the assignability probe would falsely pass`
              : `runtime type ${admission.runtimeExpr} (${admission.runtimeModule}) resolved to \`any\` — the assignability probe would falsely pass`;
      return {
        ...base,
        observedRelation: 'opaque',
        assignableSpineToRuntime: false,
        assignableRuntimeToSpine: false,
        resolved: false,
        detail,
      };
    }
    const assignableSpineToRuntime = !linesWithDiag.has(probe.s2rLine);
    const assignableRuntimeToSpine = !linesWithDiag.has(probe.r2sLine);
    return {
      ...base,
      observedRelation: classifyStructuralRelation(assignableSpineToRuntime, assignableRuntimeToSpine),
      assignableSpineToRuntime,
      assignableRuntimeToSpine,
      resolved: true,
    };
  });

  return { observations };
}
