/**
 * Complete LiteShip spine-relation policy.
 *
 * Authored exceptions live in a generation-independent seed module so a clean
 * checkout can recreate the generated same-name mirror census from nothing.
 * This module is the runtime composition point used by the CLI and relation gate.
 *
 * @module
 */

import type { SpineTypeAdmission } from '@liteship/audit';
import { LITESHIP_SPINE_AUTHORED_ADMISSIONS } from './spine-relation-admissions.js';
import { GENERATED_LITESHIP_SPINE_ADMISSIONS } from './spine-provenance.generated.js';

export {
  LITESHIP_SPINE_AUTHORED_ADMISSIONS,
  LITESHIP_SPINE_EXACT_RELATION_CATALOG,
} from './spine-relation-admissions.js';
export { LITESHIP_SPINE_PROTOCOL_DECLARATIONS } from './spine-provenance.generated.js';

/** Reviewed exceptions plus the generated exact same-name mirror census. */
export const LITESHIP_SPINE_ADMISSIONS: readonly SpineTypeAdmission[] = [
  ...LITESHIP_SPINE_AUTHORED_ADMISSIONS,
  ...GENERATED_LITESHIP_SPINE_ADMISSIONS,
];
