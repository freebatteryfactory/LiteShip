/**
 * The plumb-completeness ledger (relocated from `scripts/plumb-registry.ts` when
 * the gate became the `plumb` command). Pure data — no Node coupling — so the
 * host scan capability (`runPlumb`, provisioned in `@liteship/command/host`) can
 * import it without pulling fs into the pure registry entry.
 *
 * `PACKAGE_PLUMB` classifies every published package as `runtime` (live in a
 * consumer site), `tooling` (CLI/build/types — not a live-runtime cast path), or
 * `deferred` (meant to be runtime-live but not yet plumbed; MUST carry an
 * `issue`). A published package missing here fails the gate, so a new test-only
 * subsystem (whole packages a consumer never runs) cannot ship unclassified.
 * This is the headline guard.
 *
 * The capsule-harness side has NO floor: the `plumb` command fails on ANY
 * `it.skip` placeholder in `tests/generated/`. There is no grandfather list — an
 * unwired capsule binding is blocking work, not a pinned exemption. (A floor here
 * would launder exactly the incompleteness this gate exists to surface.)
 *
 * @module
 */

import { GENERATED_PACKAGE_PLUMB } from './plumb-registry.generated.js';

export type PackagePlumbStatus = 'runtime' | 'tooling' | 'deferred';

export interface PackagePlumbEntry {
  readonly status: PackagePlumbStatus;
  readonly reason: string;
  /** Tracking issue/ADR — REQUIRED for `deferred` (enforced by the meta-test). */
  readonly issue?: string;
}

/** Every published package's live-runtime plumb status. */
export const PACKAGE_PLUMB: Readonly<Record<string, PackagePlumbEntry>> = GENERATED_PACKAGE_PLUMB;
