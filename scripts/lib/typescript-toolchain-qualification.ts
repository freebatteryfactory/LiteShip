/**
 * Pure TypeScript dual-toolchain qualification law.
 *
 * The host runner measures and observes compiler processes. This module only
 * normalizes those observations and decides whether the native TypeScript 7
 * repository compiler remains compatible with the TypeScript 6 API authority.
 * Keeping the fold pure makes every failure class cheap to falsify in unit and
 * property tests without launching either compiler.
 *
 * @module
 */

import { createHash } from 'node:crypto';
import { availableParallelism } from 'node:os';

/** Exact side-by-side toolchain contract admitted by Wave 8.7. */
export const TYPESCRIPT_TOOLCHAIN_CONTRACT = Object.freeze({
  compatibility: Object.freeze({
    dependency: 'typescript',
    packageName: '@typescript/typescript6',
    version: '6.0.2',
    implementationVersion: '6.0.3',
    bin: 'tsc6',
  }),
  native: Object.freeze({
    dependency: 'typescript-native',
    packageName: 'typescript',
    version: '7.0.2',
    implementationVersion: '7.0.2',
    bin: 'tsc',
  }),
  fixture: 'tests/fixtures/typescript-dual-toolchain',
  admittedDiagnosticCodes: Object.freeze([2322]),
  localWorkerCap: 2,
  ciWorkerCeiling: 8,
}) as const;

/** Which compiler produced one observation. */
export type TypeScriptToolchainRole = 'compatibility' | 'native';

/** Stable diagnostic identity; localized message prose is deliberately excluded. */
export interface TypeScriptDiagnosticIdentity {
  readonly code: number;
  readonly file: string;
  readonly line: number;
  readonly column: number;
}

/** One declaration node and its import/export edges. */
export interface DeclarationGraphNode {
  readonly path: string;
  readonly digest: `sha256:${string}`;
  readonly dependencies: readonly string[];
}

/** One emitted public declaration entry. */
export interface EmittedPackageSurface {
  readonly specifier: string;
  readonly declaration: string;
  readonly digest: `sha256:${string}`;
}

/** Non-authoritative performance evidence for one compiler execution. */
export interface TypeScriptExecutionMetrics {
  readonly wallMs: number;
  readonly peakRssBytes: number;
}

/** One cold or warm compiler run. */
export interface TypeScriptQualificationRun {
  readonly exitCode: number;
  readonly diagnostics: readonly TypeScriptDiagnosticIdentity[];
  readonly declarationGraph: readonly DeclarationGraphNode[];
  readonly emittedPackageSurfaces: readonly EmittedPackageSurface[];
  readonly metrics: TypeScriptExecutionMetrics;
}

/** Complete observation for one admitted compiler package. */
export interface TypeScriptToolchainObservation {
  readonly role: TypeScriptToolchainRole;
  readonly dependency: string;
  readonly packageName: string;
  readonly version: string;
  readonly implementationVersion: string;
  readonly bin: string;
  readonly fixtureDigest: `sha256:${string}`;
  readonly requestedWorkers: number;
  readonly cold: TypeScriptQualificationRun;
  readonly warm: TypeScriptQualificationRun;
}

/** Stable incompatibility classes emitted by the qualification fold. */
export type TypeScriptQualificationFindingCode =
  | 'stale-toolchain'
  | 'fixture-mismatch'
  | 'worker-cap-exceeded'
  | 'unexpected-exit'
  | 'invalid-metric'
  | 'missing-output'
  | 'admitted-diagnostic-missing'
  | 'cold-warm-drift'
  | 'diagnostic-mismatch'
  | 'declaration-graph-mismatch'
  | 'emitted-surface-mismatch';

/** One deterministic, actionable qualification failure. */
export interface TypeScriptQualificationFinding {
  readonly code: TypeScriptQualificationFindingCode;
  readonly owner: TypeScriptToolchainRole | 'comparison';
  readonly message: string;
}

/** Addressed report written by the host runner and admitted by the check. */
export interface TypeScriptQualificationReport {
  readonly schema: 'liteship/typescript-toolchain-qualification@1';
  readonly ok: boolean;
  readonly reportId: `sha256:${string}`;
  readonly workerPolicy: {
    readonly nativeRequested: number;
    readonly nativeCeiling: number;
  };
  readonly observations: readonly [TypeScriptToolchainObservation, TypeScriptToolchainObservation];
  readonly findings: readonly TypeScriptQualificationFinding[];
}

/** Cross-platform slash and root normalization for compiler-emitted paths. */
export function normalizeQualificationPath(path: string): string {
  return path.replaceAll('\\', '/').replace(/^.*?tests\/fixtures\/typescript-dual-toolchain\//u, '');
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

/** SHA-256 over deterministic JSON or exact bytes. */
export function qualificationDigest(value: unknown): `sha256:${string}` {
  const bytes = typeof value === 'string' ? value : stableJson(value);
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function compareByJson(left: unknown, right: unknown): boolean {
  return stableJson(left) === stableJson(right);
}

function normalizedDiagnostics(
  diagnostics: readonly TypeScriptDiagnosticIdentity[],
): readonly TypeScriptDiagnosticIdentity[] {
  return diagnostics
    .map((diagnostic) => ({ ...diagnostic, file: normalizeQualificationPath(diagnostic.file) }))
    .sort(
      (left, right) =>
        left.file.localeCompare(right.file) ||
        left.line - right.line ||
        left.column - right.column ||
        left.code - right.code,
    );
}

function normalizedGraph(graph: readonly DeclarationGraphNode[]): readonly DeclarationGraphNode[] {
  return graph
    .map((node) => ({
      ...node,
      path: normalizeQualificationPath(node.path),
      dependencies: [...node.dependencies].sort(),
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

function normalizedSurfaces(surfaces: readonly EmittedPackageSurface[]): readonly EmittedPackageSurface[] {
  return surfaces
    .map((surface) => ({ ...surface, declaration: normalizeQualificationPath(surface.declaration) }))
    .sort((left, right) => left.specifier.localeCompare(right.specifier));
}

function normalizedRun(run: TypeScriptQualificationRun): TypeScriptQualificationRun {
  return {
    ...run,
    diagnostics: normalizedDiagnostics(run.diagnostics),
    declarationGraph: normalizedGraph(run.declarationGraph),
    emittedPackageSurfaces: normalizedSurfaces(run.emittedPackageSurfaces),
  };
}

/**
 * Resolve the native checker worker request.
 *
 * Local runs are capped at two workers to avoid workstation thrash. CI uses
 * half of the actually available parallelism, bounded by a conservative ceiling,
 * instead of blindly consuming every reported CPU. An explicit positive integer
 * override is admitted only when it does not exceed the same environment ceiling.
 */
export function resolveNativeTypeScriptWorkers(input: {
  readonly ci: boolean;
  readonly available?: number;
  readonly requested?: string;
}): { readonly requested: number; readonly ceiling: number } {
  const available = Math.max(1, Math.floor(input.available ?? availableParallelism()));
  const ceiling = input.ci
    ? Math.max(1, Math.min(TYPESCRIPT_TOOLCHAIN_CONTRACT.ciWorkerCeiling, Math.ceil(available / 2)))
    : Math.min(TYPESCRIPT_TOOLCHAIN_CONTRACT.localWorkerCap, available);
  if (input.requested === undefined || input.requested === '') return { requested: ceiling, ceiling };
  if (!/^\d+$/u.test(input.requested)) return { requested: 0, ceiling };
  return { requested: Number(input.requested), ceiling };
}

function toolchainContract(role: TypeScriptToolchainRole) {
  return TYPESCRIPT_TOOLCHAIN_CONTRACT[role];
}

function addObservationFindings(
  observation: TypeScriptToolchainObservation,
  fixtureDigest: `sha256:${string}`,
  nativeWorkerCeiling: number,
  findings: TypeScriptQualificationFinding[],
): void {
  const contract = toolchainContract(observation.role);
  if (
    observation.dependency !== contract.dependency ||
    observation.packageName !== contract.packageName ||
    observation.version !== contract.version ||
    observation.implementationVersion !== contract.implementationVersion ||
    observation.bin !== contract.bin
  ) {
    findings.push({
      code: 'stale-toolchain',
      owner: observation.role,
      message: `${observation.role} toolchain is ${observation.packageName}@${observation.version} running ${observation.implementationVersion}/${observation.bin}; expected ${contract.packageName}@${contract.version} running ${contract.implementationVersion}/${contract.bin}.`,
    });
  }
  if (observation.fixtureDigest !== fixtureDigest) {
    findings.push({
      code: 'fixture-mismatch',
      owner: observation.role,
      message: `${observation.role} observation did not execute the admitted fixture bytes.`,
    });
  }
  if (
    observation.requestedWorkers < 1 ||
    (observation.role === 'native' && observation.requestedWorkers > nativeWorkerCeiling)
  ) {
    findings.push({
      code: 'worker-cap-exceeded',
      owner: observation.role,
      message: `${observation.role} requested ${observation.requestedWorkers} worker(s); native ceiling is ${nativeWorkerCeiling}.`,
    });
  }
  for (const [mode, run] of [
    ['cold', observation.cold],
    ['warm', observation.warm],
  ] as const) {
    if (run.exitCode !== 1) {
      findings.push({
        code: 'unexpected-exit',
        owner: observation.role,
        message: `${observation.role} ${mode} execution exited ${run.exitCode}; the admitted diagnostic fixture must exit 1.`,
      });
    }
    if (
      !Number.isFinite(run.metrics.wallMs) ||
      run.metrics.wallMs <= 0 ||
      !Number.isFinite(run.metrics.peakRssBytes) ||
      run.metrics.peakRssBytes <= 0
    ) {
      findings.push({
        code: 'invalid-metric',
        owner: observation.role,
        message: `${observation.role} ${mode} execution did not record positive finite wall and peak-memory evidence.`,
      });
    }
    if (run.declarationGraph.length === 0 || run.emittedPackageSurfaces.length === 0) {
      findings.push({
        code: 'missing-output',
        owner: observation.role,
        message: `${observation.role} ${mode} execution emitted no complete declaration graph/package surface.`,
      });
    }
    const observedCodes = new Set(run.diagnostics.map((diagnostic) => diagnostic.code));
    for (const expected of TYPESCRIPT_TOOLCHAIN_CONTRACT.admittedDiagnosticCodes) {
      if (!observedCodes.has(expected)) {
        findings.push({
          code: 'admitted-diagnostic-missing',
          owner: observation.role,
          message: `${observation.role} ${mode} execution did not produce admitted diagnostic TS${expected}.`,
        });
      }
    }
  }
  const cold = normalizedRun(observation.cold);
  const warm = normalizedRun(observation.warm);
  if (
    !compareByJson(cold.diagnostics, warm.diagnostics) ||
    !compareByJson(cold.declarationGraph, warm.declarationGraph) ||
    !compareByJson(cold.emittedPackageSurfaces, warm.emittedPackageSurfaces)
  ) {
    findings.push({
      code: 'cold-warm-drift',
      owner: observation.role,
      message: `${observation.role} cold and warm semantic outputs differ.`,
    });
  }
}

/** Fold two host observations into the deterministic compatibility verdict. */
export function qualifyTypeScriptToolchains(input: {
  readonly fixtureDigest: `sha256:${string}`;
  readonly nativeWorkerCeiling: number;
  readonly compatibility: TypeScriptToolchainObservation;
  readonly native: TypeScriptToolchainObservation;
}): TypeScriptQualificationReport {
  const findings: TypeScriptQualificationFinding[] = [];
  addObservationFindings(input.compatibility, input.fixtureDigest, input.nativeWorkerCeiling, findings);
  addObservationFindings(input.native, input.fixtureDigest, input.nativeWorkerCeiling, findings);

  const compatibility = normalizedRun(input.compatibility.warm);
  const native = normalizedRun(input.native.warm);
  if (!compareByJson(compatibility.diagnostics, native.diagnostics)) {
    findings.push({
      code: 'diagnostic-mismatch',
      owner: 'comparison',
      message: 'TypeScript 6 and TypeScript 7 admitted diagnostic identities differ.',
    });
  }
  if (!compareByJson(compatibility.declarationGraph, native.declarationGraph)) {
    findings.push({
      code: 'declaration-graph-mismatch',
      owner: 'comparison',
      message: 'TypeScript 6 and TypeScript 7 declaration graphs differ.',
    });
  }
  if (!compareByJson(compatibility.emittedPackageSurfaces, native.emittedPackageSurfaces)) {
    findings.push({
      code: 'emitted-surface-mismatch',
      owner: 'comparison',
      message: 'TypeScript 6 and TypeScript 7 emitted package surfaces differ.',
    });
  }

  const reportWithoutId = {
    schema: 'liteship/typescript-toolchain-qualification@1' as const,
    ok: findings.length === 0,
    workerPolicy: {
      nativeRequested: input.native.requestedWorkers,
      nativeCeiling: input.nativeWorkerCeiling,
    },
    observations: [
      {
        ...input.compatibility,
        cold: normalizedRun(input.compatibility.cold),
        warm: normalizedRun(input.compatibility.warm),
      },
      {
        ...input.native,
        cold: normalizedRun(input.native.cold),
        warm: normalizedRun(input.native.warm),
      },
    ] as const,
    findings,
  };
  return {
    ...reportWithoutId,
    reportId: qualificationDigest(reportWithoutId),
  };
}
