/** W1.11 context-correct typecheck coverage, parity, and fail-closed laws. @module */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import fg from 'fast-glob';
import { beforeAll, describe, expect, it } from 'vitest';
import { CHECK_REGISTRY } from '../../../packages/command/src/checks/registry.js';
import { readCliFragmentProjectionAuthority } from '../../../scripts/gen-cli-fragments.js';
import {
  buildShippedSourceTypecheckPlan,
  collectShippedFragmentProjectionViolations,
  collectShippedSourceTypecheckPlanViolations,
  collectShippedTypecheckConfigViolations,
  readRepoBytes,
  W111_TYPECHECK_FLOORS,
} from '../../../scripts/lib/shipped-source-typecheck.js';

const REPO_ROOT = resolve(import.meta.dirname, '..', '..', '..');
let liveAuthority: Awaited<ReturnType<typeof readCliFragmentProjectionAuthority>>;

beforeAll(async () => {
  liveAuthority = await readCliFragmentProjectionAuthority(REPO_ROOT);
});

describe('W1.11 shipped source typecheck', () => {
  it('derives complete non-vacuous contexts for all fragment sources and manifest-resolved bins', () => {
    const authority = liveAuthority;
    const plan = buildShippedSourceTypecheckPlan(authority, readRepoBytes(REPO_ROOT));
    const projectionSources = new Set(authority.projections.map((projection) => projection.source));
    const independentlyDerivedProjects = [
      ...new Set(
        authority.projections.flatMap((projection) => {
          const match = /^examples\/([^/]+)\/.*\.(?:[cm]?js|jsx|[cm]?ts|tsx)$/u.exec(projection.source);
          return match !== null && projectionSources.has(`examples/${match[1]!}/tsconfig.json`) ? [match[1]!] : [];
        }),
      ),
    ].sort();

    expect(plan.fragmentSources.map((subject) => subject.subject)).toEqual(authority.subjects.fragmentSources);
    expect(plan.shippedBins.map((subject) => subject.subject)).toEqual(authority.subjects.shippedBins);
    expect(plan.canonicalExampleProjects).toEqual(independentlyDerivedProjects);
    expect(plan.canonicalExampleProjects.length).toBeGreaterThanOrEqual(W111_TYPECHECK_FLOORS.canonicalExampleProjects);
    expect(plan.defaultTemplateParity).toHaveLength(3);
    expect(plan.contexts.every((context) => context.subjects.length > 0)).toBe(true);
    expect(collectShippedTypecheckConfigViolations(plan, REPO_ROOT)).toEqual([]);
  });

  it('the root typecheck executes the shipped-source authority without creating a second check identity', () => {
    const manifest = JSON.parse(readFileSync(resolve(REPO_ROOT, 'package.json'), 'utf8')) as {
      readonly scripts: Readonly<Record<string, string>>;
    };
    expect(manifest.scripts['typecheck']).toContain('pnpm exec tsx scripts/typecheck-shipped-sources.ts');
    expect(manifest.scripts['typecheck:shipped']).toBeUndefined();
  });

  it('the registered typecheck cache addresses every derived shipped-source input', () => {
    const authority = liveAuthority;
    const plan = buildShippedSourceTypecheckPlan(authority, readRepoBytes(REPO_ROOT));
    const definition = CHECK_REGISTRY.find((candidate) => candidate.id === 'check/typecheck');
    expect(definition).toBeDefined();
    const shippedPatterns = definition!.inputs.filter(
      (pattern) =>
        pattern.startsWith('examples/') ||
        pattern.startsWith('packages/create-liteship/templates/') ||
        pattern.startsWith('packages/cli/fragments/') ||
        pattern.startsWith('packages/*/bin/') ||
        pattern.startsWith('tsconfig'),
    );

    const addressed = new Set(
      fg
        .sync(shippedPatterns, {
          cwd: REPO_ROOT,
          onlyFiles: true,
          unique: true,
          dot: true,
          followSymbolicLinks: false,
          ignore: ['**/node_modules/**', '**/dist/**'],
        })
        .map((path) => path.replaceAll('\\', '/')),
    );
    const required = new Set([
      ...plan.fragmentSources.flatMap((subject) => [subject.subject, subject.canonicalSource]),
      ...plan.shippedBins.map((subject) => subject.canonicalSource),
      ...plan.contexts.map((context) => context.configPath),
    ]);

    expect(required.size).toBeGreaterThanOrEqual(54);
    expect([...required].filter((path) => !addressed.has(path))).toEqual([]);
  });

  it('fails closed when a new fragment, bin, or template parity source falls outside its context', () => {
    const authority = liveAuthority;
    const extraFragment = 'packages/cli/fragments/example/unconfigured/new.ts';
    const extraSource = 'examples/unconfigured/new.ts';
    const expandedFragments = {
      subjects: {
        ...authority.subjects,
        fragmentSources: [...authority.subjects.fragmentSources, extraFragment].sort(),
      },
      projections: [...authority.projections, { source: extraSource, destination: extraFragment }],
    };
    expect(collectShippedSourceTypecheckPlanViolations(expandedFragments, readRepoBytes(REPO_ROOT))).toContain(
      `${extraFragment} from ${extraSource} has no context-correct typecheck owner`,
    );

    const extraBin = 'packages/future/bin/future.mjs';
    const expandedBins = {
      subjects: { ...authority.subjects, shippedBins: [...authority.subjects.shippedBins, extraBin].sort() },
      projections: authority.projections,
    };
    const binPlan = buildShippedSourceTypecheckPlan(expandedBins, readRepoBytes(REPO_ROOT));
    expect(collectShippedTypecheckConfigViolations(binPlan, REPO_ROOT)).toContain(
      `${extraBin} is absent from tsconfig.shipped-bins.json via ${extraBin}`,
    );

    const extraSceneFragment = 'packages/cli/fragments/example/scenes/future.ts';
    const extraSceneSource = 'examples/scenes/future.ts';
    const expandedScene = {
      subjects: {
        ...authority.subjects,
        fragmentSources: [...authority.subjects.fragmentSources, extraSceneFragment].sort(),
      },
      projections: [...authority.projections, { source: extraSceneSource, destination: extraSceneFragment }],
    };
    const scenePlan = buildShippedSourceTypecheckPlan(expandedScene, readRepoBytes(REPO_ROOT));
    expect(collectShippedTypecheckConfigViolations(scenePlan, REPO_ROOT)).toContain(
      `${extraSceneFragment} is absent from tsconfig.fragment-scenes.json via ${extraSceneSource}`,
    );

    const templateSource = 'packages/create-liteship/templates/default/src/adaptive.ts';
    const parityViolations = collectShippedSourceTypecheckPlanViolations(authority, (path) =>
      path === templateSource ? new TextEncoder().encode('drift') : readFileSync(resolve(REPO_ROOT, path)),
    );
    expect(parityViolations).toContain(`${templateSource} is not byte-identical to examples/default/src/adaptive.ts`);
  });

  it('refuses a counterfeit shipped destination even when its canonical source still typechecks', () => {
    const authority = liveAuthority;
    const destination = authority.subjects.fragmentSources[0]!;
    const violations = collectShippedFragmentProjectionViolations(authority, (path) =>
      path === destination
        ? new TextEncoder().encode('const broken: number = "not a number";')
        : readFileSync(resolve(REPO_ROOT, path)),
    );

    expect(violations).toContainEqual(
      `${destination}: stale generated fragment from ${
        authority.projections.find((projection) => projection.destination === destination)!.source
      }`,
    );
  });
});
