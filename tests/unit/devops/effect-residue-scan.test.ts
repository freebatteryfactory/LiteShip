/**
 * Effect residue — the FULL-SCOPE self-proving scan (issue #180).
 *
 * The Effect shed's exit criterion. The two older guards stay (Invariant 14 pins
 * static imports under non-underscore package src; the docs sweep pins shipped
 * prose); THIS scan owns everything they miss: `_`-prefixed packages, scaffolder
 * templates, examples, scripts, tests, dynamic import / require spellings,
 * vendored `Effect.<method>(` call sites, and every manifest's dependency keys
 * (including pnpm overrides — the resolution-forcing side door).
 *
 * The allowlist is pinned EXACTLY and names only files that carry the residue
 * patterns as regex/fixture literals — the scanners themselves. Adding an entry
 * edits this pin deliberately.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  classifyEffectResidueLine,
  classifyEffectResidueManifest,
  classifyEffectResidueWorkspaceYaml,
  scanEffectResidue,
} from '../../../scripts/lib/effect-residue.js';

const ROOT = resolve(import.meta.dirname, '../../..');

/**
 * Files sanctioned to CONTAIN the residue patterns: each is a scanner or a
 * fixture-carrying mirror of one, never a consumer of the library.
 */
const ALLOWLIST: ReadonlySet<string> = new Set([
  'scripts/lib/effect-residue.ts', // this engine (pattern literals)
  'tests/unit/devops/effect-residue-scan.test.ts', // this test (negative-control fixtures)
  'tests/unit/core/invariants.test.ts', // Invariant 14 (static-import regex literal)
  'tests/unit/devops/docs-effect-residue.test.ts', // shipped-docs sweep (pattern literals)
  'tests/unit/core/harness/receipted-mutation.test.ts', // import-guard assertion mirrors
  'tests/unit/core/harness/policy-gate.test.ts', // import-guard assertion mirrors
]);

describe('effect residue — full-scope scan', () => {
  const scan = scanEffectResidue(ROOT, ALLOWLIST);

  it('the ecosystem carries ZERO effect residue across the full scope', () => {
    expect(scan.findings).toEqual([]);
  });

  it('the sweep is not vacuous (every scope root contributed files)', () => {
    expect(scan.swept.length).toBeGreaterThan(2000);
    for (const requiredPrefix of [
      'packages/_spine/', // underscore packages, excluded from Invariant 14
      'packages/create-liteship/templates/', // scaffolder templates
      'packages/cli/fragments/', // CLI-shipped fragments, copied verbatim into user projects
      'examples/', // example apps
      'scripts/', // repo scripts
      'tests/', // the test tree itself
    ]) {
      expect(
        scan.swept.some((file) => file.startsWith(requiredPrefix)),
        `sweep must reach ${requiredPrefix}`,
      ).toBe(true);
    }
    expect(scan.swept).toContain('package.json');
    expect(scan.swept).toContain('packages/create-liteship/templates/default/package.json');
    // The recursive manifest walk must reach EVERY workspace member and shipped
    // fragment manifest — the shallow list this replaced missed both of these.
    expect(scan.swept).toContain('tests/integration/vite/package.json');
    expect(scan.swept).toContain('packages/cli/fragments/example/default/package.json');
  });

  it('the allowlist names only files that still exist (anti-rot)', () => {
    for (const file of ALLOWLIST) {
      expect(existsSync(join(ROOT, file)), `${file} left the tree — drop its allowlist entry`).toBe(true);
    }
  });

  it('negative controls — every residue kind fires on its planted line', () => {
    expect(classifyEffectResidueLine("import { Effect } from 'effect';")).toContain('static-import');
    expect(classifyEffectResidueLine('import { pipe } from "effect/Function";')).toContain('static-import');
    // Side-effect imports execute without any `from` (PR #186 review, confirmed
    // false green): the bare spelling must classify too.
    expect(classifyEffectResidueLine("import 'effect';")).toContain('static-import');
    expect(classifyEffectResidueLine('import "effect/Runtime";')).toContain('static-import');
    expect(classifyEffectResidueLine("const effect = await import('effect');")).toContain('dynamic-import');
    expect(classifyEffectResidueLine("const effect = require('effect');")).toContain('require');
    expect(classifyEffectResidueLine('return Effect.runSync(program);')).toContain('call-site');
    expect(classifyEffectResidueLine('Effect.gen(function* () {')).toContain('call-site');
    // ANY namespace method is residue — the shed removed the library, so an
    // unlisted method name must not be a false green (PR #186 review, confirmed).
    expect(classifyEffectResidueLine('return Effect.catchAll(handler);')).toContain('call-site');
    expect(classifyEffectResidueLine('Effect.anythingAtAll(x);')).toContain('call-site');
    // Unrelated identifiers must NOT classify: the widened pattern is namespace-
    // anchored, not substring-hungry.
    expect(classifyEffectResidueLine('sideEffect.run(x);')).toEqual([]);
    expect(classifyEffectResidueLine("import { x } from 'redux-effects';")).toEqual([]);
  });

  it('negative controls — comment lines are history, not residue', () => {
    expect(classifyEffectResidueLine("// import { Effect } from 'effect';")).toEqual([]);
    expect(classifyEffectResidueLine(' * was Effect.runSync(compute()) before the shed')).toEqual([]);
  });

  it('the scanner reds planted residue in a fragment tree, across line boundaries, and in a nested manifest (executed mutants)', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'liteship-effect-residue-'));
    try {
      const fragments = join(fixture, 'packages', 'cli', 'fragments', 'example', 'app');
      mkdirSync(fragments, { recursive: true });
      // Multiline dynamic import: no single physical line matches, so only the
      // collapsed second pass can see it.
      writeFileSync(join(fragments, 'main.ts'), "const mod = await import(\n  // lazy\n  'effect',\n);\n");
      writeFileSync(join(fragments, 'package.json'), JSON.stringify({ dependencies: { effect: '^3.0.0' } }));
      const planted = scanEffectResidue(fixture, new Set());
      expect(planted.findings).toEqual([
        {
          file: 'packages/cli/fragments/example/app/main.ts',
          line: 0,
          kind: 'dynamic-import',
          detail: 'construct spans line boundaries (collapsed-source match)',
        },
        {
          file: 'packages/cli/fragments/example/app/package.json',
          line: 0,
          kind: 'manifest-dependency',
          detail: 'dependencies.effect',
        },
      ]);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it('negative controls — every manifest field flags an effect dependency', () => {
    expect(classifyEffectResidueManifest({ dependencies: { effect: '^3.0.0' } })).toEqual(['dependencies.effect']);
    expect(classifyEffectResidueManifest({ devDependencies: { '@effect/schema': '^0.1.0' } })).toEqual([
      'devDependencies.@effect/schema',
    ]);
    expect(classifyEffectResidueManifest({ peerDependencies: { effect: '*' } })).toEqual(['peerDependencies.effect']);
    expect(classifyEffectResidueManifest({ optionalDependencies: { effect: '*' } })).toEqual([
      'optionalDependencies.effect',
    ]);
    expect(classifyEffectResidueManifest({ pnpm: { overrides: { effect: '3.0.0' } } })).toEqual([
      'pnpm.overrides.effect',
    ]);
    expect(classifyEffectResidueManifest({ dependencies: { 'effect-free-utils': '1.0.0' } })).toEqual([]);
  });

  it('negative controls — pnpm WORKSPACE catalog/override entries are residue by key and by alias value (PR #191 review, round 3)', () => {
    // The side door: a catalog entry in pnpm-workspace.yaml consumed as
    // '"fx": "catalog:"' names effect NOWHERE the manifest walk can see.
    const yaml = [
      'packages:',
      "  - 'packages/*'",
      'catalog:',
      '  effect: ^3.0.0',
      '  fx: npm:effect@^3.0.0 # aliased reintroduction',
      'catalogs:',
      '  legacy:',
      "    '@effect/schema': 0.1.0",
      '    s: "npm:@effect/schema@0.1.0"',
      'overrides:',
      '  clean-package: 1.0.0',
    ].join('\n');
    expect(classifyEffectResidueWorkspaceYaml(yaml)).toEqual([
      'catalog.effect',
      'catalog.fx -> npm:effect@^3.0.0',
      'catalogs.@effect/schema',
      'catalogs.s -> npm:@effect/schema@0.1.0',
    ]);
    // The packages globs and unrelated entries never classify.
    expect(classifyEffectResidueWorkspaceYaml("packages:\n  - 'packages/*'\n")).toEqual([]);
    // The real workspace file is swept and clean.
    expect(scan.swept).toContain('pnpm-workspace.yaml');
  });

  it('negative controls — YAML anchor metadata cannot dress an effect alias, and alias references fail closed (PR #191 review, round 4)', () => {
    // `fx: &effectAlias npm:effect@^3` is valid YAML — pnpm resolves the scalar
    // to the effect npm alias, but the raw text starts with `&effectAlias`, not
    // `npm:`, so a prefix-anchored match sees nothing. Same for `!!str` tags.
    const anchored = [
      'catalog:',
      '  fx: &effectAlias npm:effect@^3.0.0',
      '  tagged: !!str npm:@effect/schema@0.1.0',
    ].join('\n');
    expect(classifyEffectResidueWorkspaceYaml(anchored)).toEqual([
      'catalog.fx -> npm:effect@^3.0.0',
      'catalog.tagged -> npm:@effect/schema@0.1.0',
    ]);
    // A `*ref` alias value is an indirection a line-based parse CANNOT resolve —
    // fail closed: flag it, never assume it is clean.
    expect(classifyEffectResidueWorkspaceYaml('overrides:\n  fx: *effectAlias\n')).toEqual([
      'overrides.fx -> *effectAlias (unresolved YAML alias — fail-closed)',
    ]);
    // A benign anchored value stays clean once the metadata is stripped.
    expect(classifyEffectResidueWorkspaceYaml('catalog:\n  pinned: &pin npm:lodash@^4.0.0\n')).toEqual([]);
  });

  it('negative controls — an npm ALIAS installing effect is residue by VALUE (PR #191 review)', () => {
    // The side door: `"fx": "npm:effect@^3"` installs the library under a name
    // no import/call scanner can match — the dependency VALUE is the evidence.
    expect(classifyEffectResidueManifest({ dependencies: { fx: 'npm:effect@^3.0.0' } })).toEqual([
      'dependencies.fx -> npm:effect@^3.0.0',
    ]);
    expect(classifyEffectResidueManifest({ devDependencies: { s: 'npm:@effect/schema@0.1.0' } })).toEqual([
      'devDependencies.s -> npm:@effect/schema@0.1.0',
    ]);
    expect(classifyEffectResidueManifest({ pnpm: { overrides: { fx: 'npm:effect@3.0.0' } } })).toEqual([
      'pnpm.overrides.fx -> npm:effect@3.0.0',
    ]);
    // Aliases to UNRELATED packages whose names merely start with "effect" are clean.
    expect(classifyEffectResidueManifest({ dependencies: { fx: 'npm:effect-free-utils@1.0.0' } })).toEqual([]);
  });
});
