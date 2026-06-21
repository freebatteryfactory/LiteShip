/**
 * doctor — preflight rig-check. Casts environment signals (Node, pnpm,
 * workspace state, build artifacts, git hooks, Playwright browsers) into
 * three named bearings — `ok` / `warn` / `fail` — and resolves to one
 * verdict — `ready` / `caution` / `blocked`.
 *
 * Barrel: doctor is split across `commands/doctor/` (types, manifest readers,
 * the two probe families, profiles, summary, fix, and the entrypoint). This
 * file re-exports the public surface so `dispatch.ts` and tests are unaffected
 * by the internal layout. The five jobs are isolated; all world-mutation lives
 * in `commands/doctor/fix.ts` alone.
 *
 * @module
 */

export { doctor } from './doctor/doctor.js';
export { findWorkspaceRoot } from './doctor/manifest.js';
export type {
  DoctorBearing,
  DoctorCheck,
  DoctorFix,
  DoctorReceipt,
  DoctorTarget,
  DoctorVerdict,
} from './doctor/types.js';
