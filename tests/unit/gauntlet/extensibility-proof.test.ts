/**
 * THE EXTENSIBILITY PROOF — `@czap/gauntlet` is genuinely extendable, downstream-
 * installable, zero-rebuild, no-fork (ADR-0012's whole point).
 *
 * The plan's verification item, verbatim: "a throwaway downstream fixture repo
 * `npm i`s @czap/gauntlet, registers one custom fitness function, runs green
 * WITHOUT touching the engine (zero-rebuild; human + agent usable)."
 *
 * The fixture lives in `tests/fixtures/gauntlet-downstream/`: a self-contained
 * "downstream project" with its OWN `package.json` (declaring `@czap/gauntlet:
 * workspace:*` — the same engine, not a copy), a custom gate authored ONLY against
 * the public `@czap/gauntlet` barrel (`no-console-log.gate.ts`), a green sample
 * source tree (`src/`), a red sample tree the gate must bite (`red/`), and a runner
 * (`run.ts`) that composes LiteShip's built-ins with the custom gate.
 *
 * This suite drives that fixture end to end and asserts six things:
 *  1. SELF-PROOF — the custom gate earns blocking authority through the SAME
 *     `verifyGate` ratchet the built-ins use (red caught, green clean, mutant killed).
 *  2. COMPOSITION GREEN — LiteShip's gates + the custom gate, run together over the
 *     green sample tree, block nothing.
 *  3. THE GATE BITES — the same composed run over the red sample tree fails, and the
 *     finding is the custom gate's (not a built-in's) — proof it is a real gate.
 *  4. ZERO ENGINE EDIT — the fixture imports ONLY the `@czap/gauntlet` barrel (no
 *     relative reach into `packages/gauntlet/src/*`, no monkey-patch), proven by
 *     reading the fixture's own source and asserting every gauntlet import is the
 *     package specifier.
 *  5. DUAL-ERGONOMIC — the custom gate's finding has the self-explaining shape an
 *     agent acts on (ruleId, level, the WHY in `detail`, a `location`, a structured
 *     `remediation`).
 *  6. LEAN INSTALL — `@czap/gauntlet`'s declared runtime deps are ONLY `@czap/error`
 *     + `fast-glob` (no typescript, no monorepo) — "downstream-installable" concretely.
 *
 * The engine path is the same one LiteShip's own gates take: there is no
 * branch in `@czap/gauntlet` that knows this gate is "downstream". That is the proof.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import {
  verifyGate,
  earnedAuthority,
  runGauntletOnRepo,
  LITESHIP_GATES,
  isFinding,
  type Finding,
} from '@czap/gauntlet';
import { noConsoleLogGate } from '../../fixtures/gauntlet-downstream/no-console-log.gate.js';
import { DOWNSTREAM_GATES, runDownstreamGauntlet } from '../../fixtures/gauntlet-downstream/run.js';

const HERE = dirname(fileURLToPath(import.meta.url));
// The downstream fixture project root (tests/fixtures/gauntlet-downstream).
const FIXTURE_ROOT = resolve(HERE, '..', '..', 'fixtures', 'gauntlet-downstream');

describe('extensibility proof — a downstream project extends @czap/gauntlet with zero engine edit', () => {
  it('SELF-PROOF: the custom gate earns blocking authority through the same ratchet as the built-ins', () => {
    // The downstream gate is qualified by `verifyGate` — the exact path the engine
    // runs every built-in through. No special-casing: it earns blocking, it is not
    // granted it.
    const proof = verifyGate(noConsoleLogGate);
    expect(proof.redCaught, 'red fixture must produce >=1 finding').toBe(true);
    expect(proof.greenClean, 'green fixture must produce 0 findings').toBe(true);
    expect(proof.mutationKilled, 'the mutant must be killed by the fixtures').toBe(true);
    expect(proof.selfProven).toBe(true);
    expect(earnedAuthority(proof)).toBe('blocking');
  });

  it('COMPOSITION: the composed set is LiteShip built-ins PLUS the one custom gate (a peer union)', () => {
    expect(DOWNSTREAM_GATES.length).toBe(LITESHIP_GATES.length + 1);
    // Every built-in is present unchanged, and the custom gate sits alongside them.
    for (const builtin of LITESHIP_GATES) {
      expect(DOWNSTREAM_GATES).toContain(builtin);
    }
    expect(DOWNSTREAM_GATES).toContain(noConsoleLogGate);
    // The custom gate's id is NOT one of LiteShip's — it is a genuinely new rule.
    const builtinIds = new Set(LITESHIP_GATES.map((g) => g.id));
    expect(builtinIds.has(noConsoleLogGate.id)).toBe(false);
  });

  it('GREEN: the composed run over the green sample tree blocks nothing', () => {
    const result = runDownstreamGauntlet(FIXTURE_ROOT);

    // Every gate qualified (each self-proved → blocking authority).
    for (const outcome of result.outcomes) {
      expect(outcome.authority, `${outcome.gateId} must earn blocking`).toBe('blocking');
    }
    // The custom gate ran and was clean on the green source.
    const custom = result.outcomes.find((o) => o.gateId === noConsoleLogGate.id);
    expect(custom, 'the custom gate must be in the run').toBeDefined();
    expect(custom!.findings, 'the custom gate must be clean on the green sample').toEqual([]);
    // The whole composed run is green — nothing blocks.
    expect(result.blocked, 'the composed run over the green tree must not block').toBe(false);
    expect(result.findings).toEqual([]);
  });

  it('BITE: the same composed run over the red sample tree fails, and the finding is the custom gate’s', () => {
    // Point the SAME runner at the red/ tree (a known-bad downstream file). The
    // custom gate must catch the console.log on a real filesystem context — not
    // just its in-memory fixture — proving it is a real gate, not a no-op.
    const result = runGauntletOnRepo(DOWNSTREAM_GATES, {
      repoRoot: FIXTURE_ROOT,
      globs: ['red/**/*.ts'],
    });

    expect(result.blocked, 'the composed run over the red tree must block').toBe(true);

    const customFindings = result.findings.filter((f) => f.ruleId === noConsoleLogGate.id);
    expect(customFindings.length, 'the custom gate must bite the red sample').toBeGreaterThanOrEqual(1);

    // The bite points at the real red file + the console.log line.
    const bite = customFindings[0]!;
    expect(bite.location?.file).toBe('red/leaky.ts');
    expect(bite.location?.line).toBeGreaterThan(0);
    expect(bite.severity).toBe('error');

    // And NO built-in misfired on the red tree — the block is the custom gate's,
    // proving the bite is attributable to the downstream rule specifically.
    const builtinIds = new Set(LITESHIP_GATES.map((g) => g.id));
    const builtinFindings = result.findings.filter((f) => builtinIds.has(f.ruleId));
    expect(builtinFindings, 'no built-in should fire on the red tree').toEqual([]);
  });

  it('DUAL-ERGONOMIC: the custom gate’s finding carries the self-explaining shape an agent acts on', () => {
    const result = runGauntletOnRepo(DOWNSTREAM_GATES, {
      repoRoot: FIXTURE_ROOT,
      globs: ['red/**/*.ts'],
    });
    const bite = result.findings.find((f) => f.ruleId === noConsoleLogGate.id);
    expect(bite).toBeDefined();
    const f = bite as Finding;

    // The structured surface: a stable ruleId (traceability), an assurance level,
    // the WHY (detail), a precise location, and an actionable remediation.
    expect(isFinding(f)).toBe(true);
    expect(f.ruleId).toBe('downstream/no-console-log');
    expect(f.level).toBe('L2');
    expect(f.title.length).toBeGreaterThan(0);
    expect(f.detail).toMatch(/console\.log/);
    expect(f.location).toBeDefined();
    expect(f.remediation, 'the finding must carry an actionable remediation').toBeDefined();
    expect(f.remediation!.kind).toBe('instruction');
    if (f.remediation!.kind === 'instruction') {
      expect(f.remediation!.steps.length).toBeGreaterThan(0);
    }
  });
});

describe('extensibility proof — ZERO ENGINE EDIT (the fixture touches only the public surface)', () => {
  /** Read every `.ts` source file in the fixture tree (recursively). */
  function fixtureSources(dir: string): readonly { readonly path: string; readonly text: string }[] {
    const out: { path: string; text: string }[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        out.push(...fixtureSources(full));
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        out.push({ path: full, text: readFileSync(full, 'utf8') });
      }
    }
    return out;
  }

  // Match any ESM import/export specifier string. The guard below inspects the
  // module specifier of every static import/export the fixture uses.
  const SPECIFIER = /(?:import|export)\b[^'"]*?from\s*['"]([^'"]+)['"]/g;

  it('every gauntlet reference in the fixture is the package barrel — never a reach into packages/gauntlet/src', () => {
    const sources = fixtureSources(FIXTURE_ROOT);
    expect(sources.length, 'the fixture must have source files to inspect').toBeGreaterThan(0);

    const offenders: string[] = [];
    let referencedBarrel = false;
    for (const { path, text } of sources) {
      for (const match of text.matchAll(SPECIFIER)) {
        const spec = match[1] ?? '';
        if (spec === '@czap/gauntlet') {
          referencedBarrel = true;
          continue;
        }
        // A reach into the engine internals is the failure mode this proves absent:
        // any specifier that resolves into packages/gauntlet/src (by path or by a
        // gauntlet subpath) would mean the fixture is NOT using the public surface.
        const reachesEngine =
          spec.includes('packages/gauntlet') || spec.startsWith('@czap/gauntlet/');
        if (reachesEngine) offenders.push(`${path}: ${spec}`);
      }
    }

    expect(offenders, `fixture must not reach into the gauntlet engine internals:\n${offenders.join('\n')}`).toEqual(
      [],
    );
    // And it DOES use the public barrel — so this isn't vacuously true.
    expect(referencedBarrel, 'the fixture must import from the @czap/gauntlet barrel').toBe(true);
  });

  it('the fixture package.json declares @czap/gauntlet as a workspace dependency (the same engine, not a copy)', () => {
    const pkg = JSON.parse(readFileSync(join(FIXTURE_ROOT, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    expect(pkg.dependencies?.['@czap/gauntlet']).toBe('workspace:*');
  });
});

describe('extensibility proof — LEAN INSTALL (a downstream gets a tiny engine)', () => {
  it('@czap/gauntlet declares ONLY @czap/error + fast-glob as runtime deps (no typescript, no monorepo)', () => {
    // Read the engine's own package.json — the contract a downstream `npm i` honours.
    const gauntletPkgPath = resolve(HERE, '..', '..', '..', 'packages', 'gauntlet', 'package.json');
    const pkg = JSON.parse(readFileSync(gauntletPkgPath, 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    const deps = Object.keys(pkg.dependencies ?? {}).sort();
    expect(deps).toEqual(['@czap/error', 'fast-glob']);
    // The heavy `typescript` dep lives in the HOST (@czap/audit / the CLI), never
    // the engine — the IR is an injected capability, so a downstream's install stays lean.
    expect(deps).not.toContain('typescript');
  });
});
