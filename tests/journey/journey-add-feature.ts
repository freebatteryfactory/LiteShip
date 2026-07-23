/**
 * journey-add-feature — author a real `defineAdaptive` feature through the
 * packed public `liteship` root, build it with the installed host, and prove the
 * emitted page matches that same installed definition's `plan()` / `explain()`.
 *
 * No workspace core import and no compiler side-effect import exists here. Both
 * Astro and the assertion probe resolve `defineAdaptive` from the consumer's
 * physical packed install, which proves the P13/P15 composition root itself.
 *
 * @module
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  boundedJourneyOutput,
  findFiles,
  htmlUnescape,
  installConsumer,
  journeyAssert,
  rewriteConsumerToTarballs,
  removeDir,
  runInstalledLiteshipCli,
  runInstalledNode,
  scaffoldConsumer,
  type JourneyResult,
  type PackedWorkspace,
} from './harness.js';

const HERO_SOURCE = `import { defineAdaptive } from 'liteship';

export const hero = defineAdaptive({
  boundary: {
    input: 'viewport.width',
    at: [[0, 'compact'], [900, 'cozy'], [1440, 'roomy']],
  },
  style: {
    base: { properties: { display: 'grid', 'font-size': '14px' } },
    states: { roomy: { properties: { 'font-size': '20px' } } },
  },
  quantize: {
    outputs: { aria: { compact: 'compact hero', cozy: 'cozy hero', roomy: 'roomy hero' } },
  },
});
`;

const HERO_PAGE_SOURCE = `---
import Base from '../layouts/Base.astro';
import { hero } from '../adaptive/hero.mjs';

const plan = hero.plan();
---

<Base>
  <section {...hero.attrs()} data-adaptive-id={hero.id}>
    <h1>adaptive hero</h1>
  </section>
  <style is:inline set:html={plan.css}></style>
</Base>
`;

const PROBE_SOURCE = `
const { hero } = await import('./src/adaptive/hero.mjs');
process.stdout.write(JSON.stringify({
  id: hero.id,
  plan: hero.plan(),
  explanation: hero.explain(0),
}));
`;

export async function journeyAddFeature(packed: PackedWorkspace): Promise<JourneyResult> {
  const name = 'journey-add-feature';
  let appDir: string | undefined;
  try {
    appDir = scaffoldConsumer();
    rewriteConsumerToTarballs(appDir, packed);
    const install = await installConsumer(appDir);
    journeyAssert(
      install.code === 0,
      `pnpm install failed (exit ${install.code}):\n${boundedJourneyOutput(install.stdout, install.stderr)}`,
    );

    const adaptiveDir = join(appDir, 'src', 'adaptive');
    mkdirSync(adaptiveDir, { recursive: true });
    writeFileSync(join(adaptiveDir, 'hero.mjs'), HERO_SOURCE);
    writeFileSync(join(appDir, 'src', 'pages', 'hero.astro'), HERO_PAGE_SOURCE);

    const build = await runInstalledLiteshipCli(['build'], appDir);
    journeyAssert(
      build.code === 0,
      `installed liteship build failed (exit ${build.code}):\n${boundedJourneyOutput(build.stderr || build.stdout)}`,
    );

    const probe = await runInstalledNode(['--input-type=module', '--eval', PROBE_SOURCE], appDir);
    journeyAssert(
      probe.code === 0,
      `installed defineAdaptive probe failed (exit ${probe.code}):\n${boundedJourneyOutput(probe.stderr || probe.stdout)}`,
    );
    const predicted = JSON.parse(probe.stdout) as {
      id: string;
      plan: { attrs: Record<string, string>; css: string };
      explanation: { boundary: { state: string } };
    };
    journeyAssert(predicted.plan.css.length > 0, 'installed defineAdaptive().plan().css was empty');

    const heroHtml = findFiles(join(appDir, 'dist'), '.html')
      .map((file) => readFileSync(file, 'utf8'))
      .find((html) => html.includes('adaptive hero'));
    journeyAssert(heroHtml !== undefined, 'no built HTML carries the authored adaptive hero marker');
    journeyAssert(
      heroHtml!.includes(`data-adaptive-id="${predicted.id}"`),
      `built hero did not carry the aggregate adaptive id ${predicted.id}`,
    );

    const boundaryMatch = /data-liteship-boundary="([^"]*)"/.exec(heroHtml!);
    journeyAssert(boundaryMatch !== null, 'hero page emitted no data-liteship-boundary attribute');
    journeyAssert(
      htmlUnescape(boundaryMatch![1]!) === predicted.plan.attrs['data-liteship-boundary'],
      'built boundary attribute did not match installed defineAdaptive().plan().attrs',
    );

    journeyAssert(
      heroHtml!.includes(`data-liteship-directive="${predicted.plan.attrs['data-liteship-directive']}"`),
      'built directive marker did not match installed defineAdaptive().attrs()',
    );

    const stateMatch = /data-liteship-state="([^"]*)"/.exec(heroHtml!);
    journeyAssert(stateMatch !== null, 'hero page emitted no data-liteship-state attribute');
    journeyAssert(
      htmlUnescape(stateMatch![1]!) === predicted.explanation.boundary.state,
      'built state did not match installed defineAdaptive().explain(0)',
    );
    journeyAssert(
      heroHtml!.includes(predicted.plan.css),
      'built page did not contain the exact installed defineAdaptive().plan().css projection',
    );

    return {
      name,
      status: 'pass',
      detail:
        `packed root defineAdaptive authored + built the hero; attrs, state, and ${predicted.plan.css.length} CSS bytes ` +
        'match the installed plan()/explain() projections',
      notes: ['no workspace import and no ambient compiler registration'],
    };
  } catch (error) {
    return { name, status: 'fail', detail: error instanceof Error ? error.message : String(error), notes: [] };
  } finally {
    removeDir(appDir === undefined ? undefined : join(appDir, '..'));
  }
}
