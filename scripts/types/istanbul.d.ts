/**
 * THE CLASS RULE — minimal Istanbul surface for the script call sites.
 *
 * ANCHOR: the five repository scripts that consume Istanbul's untyped runtime
 * modules. ALLOWLIST: only members exercised by those call sites are declared;
 * adding a member requires a typed call site rather than vendoring a broad
 * ambient replacement for the upstream packages.
 */

declare module 'istanbul-lib-coverage' {
  export interface MetricSummary {
    readonly total: number;
    readonly covered: number;
    readonly skipped: number;
    readonly pct: number;
  }

  export interface CoverageSummary {
    readonly data: {
      readonly lines: MetricSummary;
      readonly statements: MetricSummary;
      readonly functions: MetricSummary;
      readonly branches: MetricSummary;
    };
  }

  export interface FileCoverage {
    toSummary(): CoverageSummary;
  }

  export interface CoverageMap {
    files(): string[];
    fileCoverageFor(file: string): FileCoverage;
    getCoverageSummary(): CoverageSummary;
    merge(data: CoverageMap | Record<string, unknown>): void;
    filter(predicate: (file: string) => boolean): void;
    toJSON(): Record<string, unknown>;
  }

  const api: {
    createCoverageMap(data: Record<string, unknown>): CoverageMap;
  };
  export default api;
}

declare module 'istanbul-lib-report' {
  import type { CoverageMap } from 'istanbul-lib-coverage';

  export interface ReportContext {
    readonly dir: string;
    readonly coverageMap: CoverageMap;
  }

  const api: {
    createContext(options: ReportContext): ReportContext;
  };
  export default api;
}

declare module 'istanbul-reports' {
  import type { ReportContext } from 'istanbul-lib-report';

  interface Report {
    execute(context: ReportContext): void;
  }

  const api: {
    create(kind: string, options?: Readonly<Record<string, unknown>>): Report;
  };
  export default api;
}
