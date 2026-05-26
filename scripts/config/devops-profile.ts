/**
 * DevopsProfile re-export shim (CUT D9b-1). The profile type/default/helper were
 * relocated into `@czap/audit` (the packageable engine). This shim keeps the
 * historical `scripts/config/devops-profile.js` import path working for existing
 * scripts and tests. See [[liteship-lens-d-design]].
 *
 * @module
 */
export { liteshipDevopsProfile, withRepoRoot } from '@czap/audit';
export type { DevopsProfile, SurfacePolicyShape } from '@czap/audit';
