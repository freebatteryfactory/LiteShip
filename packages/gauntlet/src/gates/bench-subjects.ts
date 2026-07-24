/**
 * Benchmark-subject qualification.
 *
 * A registered benchmark name and a declared input distribution prove only that
 * a task exists. They do not prove that the measured task reaches the SUT it
 * claims to measure. This lean module owns only the flat fact contract and
 * schema parser. The TypeScript-AST producer lives in `@liteship/audit`; hosts
 * inject its decided facts through GateContext.
 *
 * @module
 */

export type BenchSubjectRole = 'sut' | 'baseline';

export type BenchSubjectOrigin =
  | { readonly kind: 'module'; readonly specifier: string }
  | { readonly kind: 'file'; readonly path: string }
  | { readonly kind: 'intrinsic'; readonly name: string }
  | { readonly kind: 'wasm'; readonly crate: string };

export interface BenchSubject {
  readonly role: BenchSubjectRole;
  readonly origin: BenchSubjectOrigin;
  readonly symbol: string;
  /** Exact callee text reachable from the measured execution body. */
  readonly binding: string;
}

export type BenchExecution =
  | { readonly kind: 'callback' }
  | {
      readonly kind: 'collector';
      readonly file: string;
      readonly export: string;
      readonly resultKey: string;
    };

export interface QualifiedBenchDistribution {
  readonly name: string;
  readonly file: string;
  readonly inputSize: number;
  readonly shape: string;
  readonly replicates: number;
  readonly subjects: readonly BenchSubject[];
  readonly execution?: BenchExecution;
}

export type BenchSubjectIssueKind =
  | 'missing-subject'
  | 'missing-execution-source'
  | 'missing-registration'
  | 'ambiguous-registration'
  | 'missing-callback'
  | 'missing-collector'
  | 'missing-result-key'
  | 'wrong-origin'
  | 'uninvoked-subject';

export interface BenchSubjectIssue {
  readonly kind: BenchSubjectIssueKind;
  readonly name: string;
  readonly file: string;
  readonly subject?: BenchSubject;
  readonly detail: string;
}

export interface BenchSubjectQualification {
  readonly issues: readonly BenchSubjectIssue[];
  readonly reachableSubjects: readonly BenchSubject[];
  /** Reachable module/file/WASM SUTs qualify; baselines and intrinsics never do. */
  readonly qualifyingSutSubjects: readonly BenchSubject[];
}

export interface BenchmarkSubjectFact {
  readonly name: string;
  readonly file: string;
  readonly qualification: BenchSubjectQualification;
}

/** Parser-backed benchmark reachability facts produced by a repository host. */
export interface BenchmarkSubjectFacts {
  readonly schemaVersion: 1;
  readonly distributions: readonly BenchmarkSubjectFact[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseOrigin(value: unknown): BenchSubjectOrigin | null {
  if (!isRecord(value) || typeof value.kind !== 'string') return null;
  if (value.kind === 'module' && typeof value.specifier === 'string') {
    return { kind: 'module', specifier: value.specifier };
  }
  if (value.kind === 'file' && typeof value.path === 'string') {
    return { kind: 'file', path: value.path };
  }
  if (value.kind === 'intrinsic' && typeof value.name === 'string') {
    return { kind: 'intrinsic', name: value.name };
  }
  if (value.kind === 'wasm' && typeof value.crate === 'string') {
    return { kind: 'wasm', crate: value.crate };
  }
  return null;
}

function parseSubject(value: unknown): BenchSubject | null {
  if (!isRecord(value)) return null;
  const origin = parseOrigin(value.origin);
  if (
    origin === null ||
    (value.role !== 'sut' && value.role !== 'baseline') ||
    typeof value.symbol !== 'string' ||
    typeof value.binding !== 'string' ||
    value.symbol.length === 0 ||
    value.binding.length === 0
  ) {
    return null;
  }
  return { role: value.role, origin, symbol: value.symbol, binding: value.binding };
}

function parseExecution(value: unknown): BenchExecution | null {
  if (!isRecord(value) || typeof value.kind !== 'string') return null;
  if (value.kind === 'callback') return { kind: 'callback' };
  if (
    value.kind === 'collector' &&
    typeof value.file === 'string' &&
    typeof value.export === 'string' &&
    typeof value.resultKey === 'string'
  ) {
    return { kind: 'collector', file: value.file, export: value.export, resultKey: value.resultKey };
  }
  return null;
}

/** Parse one schema-v2 distribution without silently dropping malformed fields. */
export function parseQualifiedBenchDistribution(value: unknown): QualifiedBenchDistribution | null {
  if (
    !isRecord(value) ||
    typeof value.name !== 'string' ||
    typeof value.file !== 'string' ||
    typeof value.inputSize !== 'number' ||
    !Number.isFinite(value.inputSize) ||
    typeof value.shape !== 'string' ||
    typeof value.replicates !== 'number' ||
    !Number.isFinite(value.replicates) ||
    !Array.isArray(value.subjects)
  ) {
    return null;
  }
  const subjects = value.subjects.map(parseSubject);
  if (subjects.some((subject) => subject === null)) return null;
  const execution = value.execution === undefined ? undefined : parseExecution(value.execution);
  if (value.execution !== undefined && execution === null) return null;
  return {
    name: value.name,
    file: value.file,
    inputSize: value.inputSize,
    shape: value.shape,
    replicates: value.replicates,
    subjects: subjects as readonly BenchSubject[],
    ...(execution === undefined || execution === null ? {} : { execution }),
  };
}

/** Resolve the exact host-produced fact for one declared distribution. */
export function benchmarkSubjectFactFor(
  facts: BenchmarkSubjectFacts | undefined,
  distribution: Pick<QualifiedBenchDistribution, 'name' | 'file'>,
): BenchmarkSubjectFact | undefined {
  return facts?.distributions.find((fact) => fact.name === distribution.name && fact.file === distribution.file);
}
