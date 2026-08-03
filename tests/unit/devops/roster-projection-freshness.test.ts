/**
 * The drift authority for the gen-roster projection family.
 *
 * `scripts/gen-roster.ts` writes fourteen committed products — package
 * catalogs, the smoke and plumb registries, the event-protocol trio, the focused
 * test-path tsconfig. Its `--check` mode independently re-derives all of them
 * and reports any that drifted, but that mode only ran in the RELEASE publish
 * job: a pull request could leave any of the fourteen stale and no gate said so.
 *
 * This suite makes `--check` a pre-push authority. It is the `enforcedBy` for
 * the `roster-projections` entry in the derived-artifact registry, so the
 * containment law schedules it in the fast lane automatically.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';
import { scaledTimeout } from '../../../vitest.shared.js';
import { DERIVED_ARTIFACTS } from '../../../scripts/lib/derived-artifacts.js';
import { main } from '../../../scripts/gen-roster.js';

describe('every gen-roster projection is current', () => {
  it(
    'the generator re-derives all fourteen products and finds no drift',
    async () => {
      // `--check` re-reads the manifests and export maps itself rather than
      // trusting the committed bytes, so a stale product is a non-zero exit.
      await expect(main(['--check'])).resolves.toBe(0);
    },
    scaledTimeout(120_000),
  );

  it('is registered as the drift authority for the family it proves', () => {
    const family = DERIVED_ARTIFACTS.find((artifact) => artifact.id === 'roster-projections');
    expect(family, 'the roster-projections family is not declared').toBeDefined();
    expect(family!.enforcedBy).toBe('tests/unit/devops/roster-projection-freshness.test.ts');
    // Non-vacuity: the family must actually claim the products, or this suite
    // would be an authority over nothing.
    expect(family!.paths.length).toBeGreaterThanOrEqual(14);
    expect(family!.paths).toContain('tsconfig.test-paths.generated.json');
    expect(family!.paths).toContain('packages/_spine/events.generated.d.ts');
  });
});
