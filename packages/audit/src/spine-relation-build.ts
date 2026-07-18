/**
 * Spine-relation FACTS builder — the heavy `ts.Program` host that computes the
 * two-axis `SpineRelationFacts` the lean `spineRelationGate` folds (Wave 8.5,
 * ADR-0023: the host produces the facts, the lean gate folds them; @czap/gauntlet
 * carries no `typescript` dependency, so this work lives here).
 *
 * HOW IT OBSERVES THE RELATION (the compiler is the oracle, never a hand-rolled
 * structural comparison — no cheerful holes in the floor). For each admitted mirror
 * type it generates ONE synthetic module carrying a bidirectional assignability probe:
 *
 *   import type * as Spine from '@czap/_spine';
 *   import type * as Rt0 from './packages/core/src/compositor.js';
 *   declare const s_0: Spine.CompositeState;   // resolution probe (spine side)
 *   declare const r_0: Rt0.CompositeState;     // resolution probe (runtime side)
 *   const _s2r_0: Rt0.CompositeState = s_0;    // spine → runtime assignable?
 *   const _r2s_0: Spine.CompositeState = r_0;  // runtime → spine assignable?
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

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import type { SpineAuthority, SpineRelationFacts, SpineRelationObservation, SurfaceRelation } from '@czap/gauntlet';
import { classifyStructuralRelation } from '@czap/gauntlet';
import { typeDirectedCompilerOptions } from './ts-program.js';

/**
 * One admitted mirror type — the host-supplied seed row (frozen from the current
 * spine-conformance pins). `spineExpr` is the type expression under the `@czap/_spine`
 * namespace (e.g. `CompositeState`, `Codec.Shape<{ readonly a: 1 }, { readonly a: 1 }>`,
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
  return resolve(repoRoot, '__czap_spine_relation_probe__.ts');
}

/** The import specifier for a runtime module: repo-relative `.ts` → `./…/x.js`. */
function moduleSpecifier(runtimeModule: string): string {
  const normalized = runtimeModule.replace(/\.tsx?$/, '.js');
  return normalized.startsWith('.') ? normalized : `./${normalized}`;
}

interface ProbeLines {
  readonly admission: SpineTypeAdmission;
  readonly spineDeclLine: number; // 0-based line of `declare const s_i`
  readonly runtimeDeclLine: number; // 0-based line of `declare const r_i`
  readonly s2rLine: number; // 0-based line of `const _s2r_i`
  readonly r2sLine: number; // 0-based line of `const _r2s_i`
  readonly moduleImportLine: number; // 0-based line of the runtime module's import
}

/** Generate the synthetic probe source + the per-admission line map. */
function generateProbe(admissions: readonly SpineTypeAdmission[]): {
  readonly source: string;
  readonly probes: readonly ProbeLines[];
} {
  const lines: string[] = [];
  lines.push(`import type * as Spine from '@czap/_spine';`);
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
    const spineType = `Spine.${admission.spineExpr}`;
    const runtimeType = `${alias}.${admission.runtimeExpr}`;
    const spineDeclLine = lines.length;
    lines.push(`declare const s_${i}: ${spineType};`);
    const runtimeDeclLine = lines.length;
    lines.push(`declare const r_${i}: ${runtimeType};`);
    const s2rLine = lines.length;
    lines.push(`const _s2r_${i}: ${runtimeType} = s_${i};`);
    const r2sLine = lines.length;
    lines.push(`const _r2s_${i}: ${spineType} = r_${i};`);
    probes.push({
      admission,
      spineDeclLine,
      runtimeDeclLine,
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
  options: SpineRelationBuildOptions = {},
): SpineRelationFacts {
  const virt = syntheticPath(repoRoot);
  const { source, probes } = generateProbe(admissions);
  const compilerOptions = { ...typeDirectedCompilerOptions(repoRoot), noEmit: true };
  const host = overlayHost(compilerOptions, virt, source, options.overlay ?? {});
  const program = ts.createProgram({ rootNames: [virt], options: compilerOptions, host });

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
    const moduleFailed = linesWithDiag.has(probe.moduleImportLine);
    const spineUnresolved = linesWithDiag.has(probe.spineDeclLine);
    const runtimeUnresolved = moduleFailed || linesWithDiag.has(probe.runtimeDeclLine);
    if (spineUnresolved || runtimeUnresolved) {
      const detail = moduleFailed
        ? `runtime module ${admission.runtimeModule} did not resolve: ${linesWithDiag.get(probe.moduleImportLine)}`
        : spineUnresolved
          ? `spine type Spine.${admission.spineExpr} did not resolve: ${linesWithDiag.get(probe.spineDeclLine)}`
          : `runtime type ${admission.runtimeExpr} (${admission.runtimeModule}) did not resolve: ${linesWithDiag.get(probe.runtimeDeclLine)}`;
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

/** Read a repo file, honoring an overlay override (the same seam the build host uses). */
export function readAdmissionSource(absolutePath: string, overlay: Readonly<Record<string, string>> = {}): string {
  const abs = resolve(absolutePath);
  if (abs in overlay) return overlay[abs]!;
  if (!existsSync(abs)) throw new Error(`spine-relation: file not found: ${abs}`);
  return readFileSync(abs, 'utf8');
}
