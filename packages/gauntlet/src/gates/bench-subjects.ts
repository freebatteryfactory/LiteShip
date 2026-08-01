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

/** Whether one benchmark binding is the claimed system or a comparison baseline. */
export type BenchSubjectRole = 'sut' | 'baseline';

/** Stable origin of a benchmark subject. */
export type BenchSubjectOrigin =
  | { readonly kind: 'module'; readonly specifier: string }
  | { readonly kind: 'file'; readonly path: string }
  | { readonly kind: 'intrinsic'; readonly name: string }
  | { readonly kind: 'wasm'; readonly crate: string };

/** One symbol the benchmark body must actually reach. */
export interface BenchSubject {
  readonly role: BenchSubjectRole;
  readonly origin: BenchSubjectOrigin;
  readonly symbol: string;
  /** Exact callee text reachable from the measured execution body. */
  readonly binding: string;
}

/** How a benchmark distribution executes its measured subject. */
export type BenchExecution =
  | { readonly kind: 'callback' }
  | {
      readonly kind: 'collector';
      readonly file: string;
      readonly export: string;
      readonly resultKey: string;
    };

/** Claim-bearing benchmark distribution with explicit subject ownership. */
export interface QualifiedBenchDistribution {
  readonly name: string;
  readonly file: string;
  readonly inputSize: number;
  readonly shape: string;
  readonly replicates: number;
  readonly subjects: readonly BenchSubject[];
  readonly execution?: BenchExecution;
}

/** Closed refusal vocabulary for benchmark-subject admission. */
export type BenchSubjectIssueKind =
  | 'missing-subject'
  | 'missing-execution-source'
  | 'missing-registration'
  | 'ambiguous-registration'
  | 'missing-callback'
  | 'missing-collector'
  | 'missing-result-key'
  | 'wrong-origin'
  | 'uninvoked-subject'
  | 'subject-construction-in-measured-body';

/** One failed benchmark-subject reachability obligation. */
export interface BenchSubjectIssue {
  readonly kind: BenchSubjectIssueKind;
  readonly name: string;
  readonly file: string;
  readonly subject?: BenchSubject;
  readonly detail: string;
}

/** Reachability proof and issues for one benchmark distribution. */
export interface BenchSubjectQualification {
  readonly issues: readonly BenchSubjectIssue[];
  readonly reachableSubjects: readonly BenchSubject[];
  /** Reachable module/file/WASM SUTs qualify; baselines and intrinsics never do. */
  readonly qualifyingSutSubjects: readonly BenchSubject[];
}

/** Host-produced benchmark-subject evidence keyed by name and file. */
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
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): boolean {
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => Object.hasOwn(value, key)) && Object.keys(value).every((key) => allowed.has(key));
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseOrigin(value: unknown): BenchSubjectOrigin | null {
  if (!isRecord(value) || typeof value.kind !== 'string') return null;
  if (value.kind === 'module' && hasExactKeys(value, ['kind', 'specifier']) && isNonEmpty(value.specifier)) {
    return { kind: 'module', specifier: value.specifier };
  }
  if (value.kind === 'file' && hasExactKeys(value, ['kind', 'path']) && isNonEmpty(value.path)) {
    return { kind: 'file', path: value.path };
  }
  if (value.kind === 'intrinsic' && hasExactKeys(value, ['kind', 'name']) && isNonEmpty(value.name)) {
    return { kind: 'intrinsic', name: value.name };
  }
  if (value.kind === 'wasm' && hasExactKeys(value, ['kind', 'crate']) && isNonEmpty(value.crate)) {
    return { kind: 'wasm', crate: value.crate };
  }
  return null;
}

function parseSubject(value: unknown): BenchSubject | null {
  if (!isRecord(value) || !hasExactKeys(value, ['role', 'origin', 'symbol', 'binding'])) return null;
  const origin = parseOrigin(value.origin);
  if (
    origin === null ||
    (value.role !== 'sut' && value.role !== 'baseline') ||
    !isNonEmpty(value.symbol) ||
    !isNonEmpty(value.binding)
  ) {
    return null;
  }
  return { role: value.role, origin, symbol: value.symbol, binding: value.binding };
}

function parseExecution(value: unknown): BenchExecution | null {
  if (!isRecord(value) || typeof value.kind !== 'string') return null;
  if (value.kind === 'callback' && hasExactKeys(value, ['kind'])) return { kind: 'callback' };
  if (
    value.kind === 'collector' &&
    hasExactKeys(value, ['kind', 'file', 'export', 'resultKey']) &&
    isNonEmpty(value.file) &&
    isNonEmpty(value.export) &&
    isNonEmpty(value.resultKey)
  ) {
    return { kind: 'collector', file: value.file, export: value.export, resultKey: value.resultKey };
  }
  return null;
}

/** Parse one schema-v2 distribution without silently dropping malformed fields. */
export function parseQualifiedBenchDistribution(value: unknown): QualifiedBenchDistribution | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ['name', 'file', 'inputSize', 'shape', 'replicates', 'subjects'], ['execution']) ||
    !isNonEmpty(value.name) ||
    !isNonEmpty(value.file) ||
    typeof value.inputSize !== 'number' ||
    !Number.isFinite(value.inputSize) ||
    value.inputSize <= 0 ||
    !isNonEmpty(value.shape) ||
    typeof value.replicates !== 'number' ||
    !Number.isInteger(value.replicates) ||
    value.replicates <= 0 ||
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
