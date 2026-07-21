/**
 * journey-add-feature — the author adds an adaptive feature and rebuilds; the
 * emitted markup is proven to match EXACTLY what the P15 `defineAdaptive` facade
 * predicts.
 *
 * A `defineAdaptive`-shaped hero (a distinctive boundary: `compact/cozy/roomy` at
 * `0/900/1440`) is planted into the scaffolded app as `adaptiveAttrs({ boundary })`,
 * rebuilt, and the built HTML's `data-liteship-boundary` / `data-liteship-state` are
 * asserted BYTE-EQUAL to `defineAdaptive(spec).plan().attrs` — the same serialized
 * boundary identity both the astro helper and the headless facade project from the
 * ONE core serializer. `explain(0).boundary.state` predicts the SSR'd initial state,
 * and `plan().css` (the injected `@liteship/compiler` lowering seam) is proven live.
 * The tie is real, not coincidental: the hero boundary's content address differs
 * from the starter's default boundary, so a drift in the serializer would red here.
 *
 * @module
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
// Side-effect import FIRST: registers `@liteship/compiler`'s StyleCSSCompiler as the
// adaptive style-layer lowering seam on the SAME core instance `defineAdaptive` binds
// (both realpath to `packages/core`), so `plan().css` lowers through the REAL compiler
// (the P15 referential-lowering thesis) rather than throwing. Imported from the built
// dist by relative path (a journey module is not a package, so bare `@liteship/*`
// specifiers do not resolve from here).
import '../../packages/compiler/dist/index.js';
import { defineAdaptive } from '../../packages/core/dist/index.js';
import {
  astroBuild,
  findFiles,
  htmlUnescape,
  installConsumer,
  isOfflineOrNetworkError,
  journeyAssert,
  rewriteConsumerToTarballs,
  removeDir,
  scaffoldConsumer,
  type JourneyResult,
  type PackedWorkspace,
} from './harness.js';

/** The single source of truth for the hero's boundary — shared by the app file and the prediction. */
const HERO_AT = [
  [0, 'compact'],
  [900, 'cozy'],
  [1440, 'roomy'],
] as const;

/** The `defineAdaptive` spec the harness predicts against (boundary + a per-state style). */
const HERO_SPEC = {
  boundary: { input: 'viewport.width', at: HERO_AT },
  style: {
    base: { properties: { 'font-size': '14px' } },
    states: { roomy: { properties: { 'font-size': '20px' } } },
  },
} as const;

/** The `hero.boundaries.ts` source planted into the app — the SAME literal spec the harness lowers. */
const HERO_BOUNDARY_SOURCE = `import { defineBoundary } from 'liteship';

// A distinctive boundary (compact/cozy/roomy) so its content address differs from
// the starter's default boundary — the add-feature journey ties the built markup to
// defineAdaptive(spec).plan() against THIS identity.
export const hero = defineBoundary({
  input: 'viewport.width',
  at: [
    [0, 'compact'],
    [900, 'cozy'],
    [1440, 'roomy'],
  ] as const,
});
`;

/** The `hero.astro` page source — applies the boundary via `adaptiveAttrs`. */
const HERO_PAGE_SOURCE = `---
import Base from '../layouts/Base.astro';
import { adaptiveAttrs } from 'liteship/astro';
import { hero } from '../boundaries/hero.boundaries.js';
---

<Base>
  <section {...adaptiveAttrs({ boundary: hero, class: 'hero' })}>
    <h1>adaptive hero</h1>
  </section>
</Base>
`;

export async function journeyAddFeature(packed: PackedWorkspace): Promise<JourneyResult> {
  const name = 'journey-add-feature';
  let appDir: string | undefined;
  try {
    appDir = scaffoldConsumer();
    rewriteConsumerToTarballs(appDir, packed);

    const install = await installConsumer(appDir);
    if (install.code !== 0) {
      const blob = install.stdout + install.stderr;
      if (isOfflineOrNetworkError(blob)) {
        return {
          name,
          status: 'gated',
          detail: 'scaffold succeeded; install could not reach a registry for store-missing deps',
          notes: ['pnpm install --prefer-offline hit a store miss with no reachable registry (offline sandbox)'],
        };
      }
      throw new Error(`pnpm install failed (exit ${install.code}):\n${blob.slice(-1200)}`);
    }

    // Plant the defineAdaptive-shaped hero (a new boundary + a page that applies it).
    writeFileSync(join(appDir, 'src', 'boundaries', 'hero.boundaries.ts'), HERO_BOUNDARY_SOURCE);
    writeFileSync(join(appDir, 'src', 'pages', 'hero.astro'), HERO_PAGE_SOURCE);

    const build = await astroBuild(appDir);
    journeyAssert(
      build.code === 0,
      `astro build failed (exit ${build.code}):\n${(build.stderr || build.stdout).slice(-1200)}`,
    );

    // The P15 prediction: lower the SAME spec through defineAdaptive and project it.
    const adaptive = defineAdaptive(HERO_SPEC);
    const plan = adaptive.plan();
    const expectedBoundaryAttr = plan.attrs['data-liteship-boundary'];
    const expectedState = adaptive.explain(0).boundary.state;
    journeyAssert(
      typeof expectedBoundaryAttr === 'string' && expectedBoundaryAttr.includes(adaptive.boundary.id),
      'defineAdaptive.plan() produced no data-liteship-boundary carrying the boundary id',
    );
    journeyAssert(
      plan.css.length > 0,
      'defineAdaptive.plan().css is empty — the @liteship/compiler lowering seam is not live',
    );

    // Locate the built hero page by its (distinctive) boundary content address.
    const heroHtml = findFiles(join(appDir, 'dist'), '.html')
      .map((f) => readFileSync(f, 'utf8'))
      .find((html) => html.includes(adaptive.boundary.id));
    journeyAssert(heroHtml !== undefined, `no built HTML carries the hero boundary id ${adaptive.boundary.id}`);

    const boundaryMatch = /data-liteship-boundary="([^"]*)"/.exec(heroHtml!);
    journeyAssert(boundaryMatch !== null, 'hero page emitted no data-liteship-boundary attribute');
    const emittedBoundary = htmlUnescape(boundaryMatch![1]!);
    journeyAssert(
      emittedBoundary === expectedBoundaryAttr,
      `emitted data-liteship-boundary != defineAdaptive.plan() prediction\n  emitted:   ${emittedBoundary}\n  predicted: ${expectedBoundaryAttr}`,
    );

    const stateMatch = /data-liteship-state="([^"]*)"/.exec(heroHtml!);
    journeyAssert(stateMatch !== null, 'hero page emitted no data-liteship-state attribute');
    journeyAssert(
      htmlUnescape(stateMatch![1]!) === expectedState,
      `emitted data-liteship-state (${stateMatch![1]}) != explain(0).boundary.state (${expectedState})`,
    );

    return {
      name,
      status: 'pass',
      detail: `hero rebuilt; emitted data-liteship-boundary + data-liteship-state BYTE-MATCH defineAdaptive(spec).plan()/explain() (boundary ${adaptive.boundary.id}, state "${expectedState}", css ${plan.css.length}B)`,
      notes: [],
    };
  } catch (error) {
    return { name, status: 'fail', detail: error instanceof Error ? error.message : String(error), notes: [] };
  } finally {
    removeDir(appDir === undefined ? undefined : join(appDir, '..'));
  }
}
