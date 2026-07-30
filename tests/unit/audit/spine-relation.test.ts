// PROVES-CHECK: check/spine-relation-gate
/**
 * The two-axis spine-relation gate — acceptance (Wave 8.5, issue #156). This is the
 * NO-AUTHORITY-GAP proof: the gate must reproduce every frozen spine-conformance pin's
 * catch mechanically before those pins are absorbed (the S-conflict discipline — never
 * delete a pin ahead of a green gate that subsumes it).
 *
 * It drives the real @liteship/audit builder (a ts.Program probe over the spine mirror +
 * the runtime surface) and folds the observed facts through the real @liteship/gauntlet
 * gate. GREEN on the reconciled spine; RED on each of the three historical drift
 * fixtures (CapSet Set→array, Millis brand loss, WGSL omission), injected in-memory via
 * the builder's overlay seam; deterministic; and self-proving through the authority
 * ratchet.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSpineRelationFacts, type SpineTypeAdmission } from '../../../packages/audit/src/spine-relation-build.js';
import { spineRelationGate } from '../../../packages/gauntlet/src/gates/spine-relation.js';
import { memoryContext } from '../../../packages/gauntlet/src/engine.js';
import { verifyGate } from '../../../packages/gauntlet/src/authority.js';
import type { Finding } from '../../../packages/gauntlet/src/finding.js';
import type { SpineRelationFacts } from '../../../packages/gauntlet/src/facts/spine-relation-facts.js';
import {
  LITESHIP_SPINE_ADMISSIONS,
  LITESHIP_SPINE_EXACT_RELATION_CATALOG,
} from '../../../packages/cli/src/internal/spine-relation-policy.js';
import { LITESHIP_TYPESCRIPT_PATH_ALIASES } from '../../../packages/cli/src/internal/liteship-typescript-aliases.js';
import { scaledTimeout } from '../../../vitest.shared.js';

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '../../../..');
const CORE_DTS = resolve(REPO_ROOT, 'packages/_spine/core.d.ts');
const COMMAND_DTS = resolve(REPO_ROOT, 'packages/_spine/command.d.ts');
const WORKER_DTS = resolve(REPO_ROOT, 'packages/_spine/worker.d.ts');
const REAL_CORE = readFileSync(CORE_DTS, 'utf8');

// The source-owned admission table is already `SpineTypeAdmission[]` — no remap needed.
const ADMISSIONS: readonly SpineTypeAdmission[] = LITESHIP_SPINE_ADMISSIONS;
const SPINE_OPTIONS = Object.freeze({
  spinePackageSpecifier: '@liteship/_spine',
  typeScriptPathAliases: LITESHIP_TYPESCRIPT_PATH_ALIASES,
});

/** Fold facts through the real gate (a minimal context carrying only the facts). */
function gateFindings(facts: SpineRelationFacts): readonly Finding[] {
  return spineRelationGate.run({ ...memoryContext({}), spineRelation: facts });
}

/** Build facts with `core.d.ts` drifted in-memory (never touching disk). */
function driftedFacts(mutate: (core: string) => string): { facts: SpineRelationFacts; drifted: string } {
  const drifted = mutate(REAL_CORE);
  expect(drifted, 'the drift edit must actually change core.d.ts').not.toBe(REAL_CORE);
  return {
    facts: buildSpineRelationFacts(ADMISSIONS, REPO_ROOT, {
      ...SPINE_OPTIONS,
      overlay: { [CORE_DTS]: drifted },
    }),
    drifted,
  };
}

/** Build facts with any one spine declaration file drifted in-memory. */
function driftedFileFacts(file: string, mutate: (source: string) => string): SpineRelationFacts {
  const real = readFileSync(file, 'utf8');
  const drifted = mutate(real);
  expect(drifted, `the drift edit must actually change ${file}`).not.toBe(real);
  return buildSpineRelationFacts(ADMISSIONS, REPO_ROOT, {
    ...SPINE_OPTIONS,
    overlay: { [file]: drifted },
  });
}

/** Build a small named admission slice against one in-memory core mirror mutation. */
function focusedCoreFacts(typeNames: readonly string[], mutate: (core: string) => string): SpineRelationFacts {
  const drifted = mutate(REAL_CORE);
  expect(drifted, 'the focused drift edit must actually change core.d.ts').not.toBe(REAL_CORE);
  const admissions = typeNames.map((typeName) => {
    const admission = ADMISSIONS.find((entry) => entry.typeName === typeName);
    expect(admission, `${typeName} must remain admitted`).toBeDefined();
    return admission!;
  });
  return buildSpineRelationFacts(admissions, REPO_ROOT, {
    ...SPINE_OPTIONS,
    overlay: { [CORE_DTS]: drifted },
  });
}

describe('spine-relation exact census — generated from one public-owner catalog', () => {
  it('projects every catalog relation exactly once as an exact admission', () => {
    const catalogNames = LITESHIP_SPINE_EXACT_RELATION_CATALOG.flatMap((entry) =>
      entry.relations.map((relation) => (typeof relation === 'string' ? relation : relation.typeName)),
    );
    expect(catalogNames.length).toBeGreaterThan(90);
    expect(new Set(catalogNames).size).toBe(catalogNames.length);

    for (const typeName of catalogNames) {
      const matches = ADMISSIONS.filter((admission) => admission.typeName === typeName);
      expect(matches, `${typeName} must have one catalog-derived admission`).toHaveLength(1);
      expect(matches[0]!.admittedRelation).toBe('exact');
    }
    expect(catalogNames).toContain('SceneCompilation');
    expect(catalogNames).toContain('WorkerLike');
    expect(catalogNames).toContain('VirtualModuleId');
  });
});

describe('spine-relation gate — GREEN on the reconciled spine (no drift, no gap)', () => {
  it(
    'every admitted mirror resolves and conforms — the gate emits zero findings',
    { timeout: scaledTimeout(60_000) },
    () => {
      const facts = buildSpineRelationFacts(ADMISSIONS, REPO_ROOT, SPINE_OPTIONS);
      expect(facts.observations).toHaveLength(ADMISSIONS.length);
      // No authority gap: EVERY admitted pin resolves (a dangling mirror would red).
      const unresolved = facts.observations.filter((o) => !o.resolved);
      expect(
        unresolved,
        `unresolved admissions:\n${unresolved.map((o) => `${o.typeName}: ${o.detail}`).join('\n')}`,
      ).toEqual([]);
      expect(gateFindings(facts)).toEqual([]);
    },
  );

  it('is byte-deterministic (build twice → identical facts)', { timeout: scaledTimeout(60_000) }, () => {
    const a = buildSpineRelationFacts(ADMISSIONS, REPO_ROOT, SPINE_OPTIONS);
    const b = buildSpineRelationFacts(ADMISSIONS, REPO_ROOT, SPINE_OPTIONS);
    expect(a).toEqual(b);
  });
});

describe('spine-relation gate — REDS on the three historical drift fixtures (the relocated pins)', () => {
  it('CapSet Set→array (the levels member changed shape)', { timeout: scaledTimeout(60_000) }, () => {
    const { facts } = driftedFacts((c) =>
      c.replace('readonly levels: readonly CapTier[];', 'readonly levels: ReadonlySet<CapTier>;'),
    );
    const capSet = facts.observations.find((o) => o.typeName === 'CapSet')!;
    expect(capSet.observedRelation).toBe('opaque'); // incompatible both directions
    const findings = gateFindings(facts);
    expect(findings.some((f) => f.title.includes('CapSet'))).toBe(true);
  });

  it('Millis brand loss (VideoConfig.durationMs demoted to number)', { timeout: scaledTimeout(60_000) }, () => {
    const { facts } = driftedFacts((c) => c.replace('readonly durationMs: Millis;', 'readonly durationMs: number;'));
    const videoConfig = facts.observations.find((o) => o.typeName === 'VideoConfig')!;
    expect(videoConfig.observedRelation).toBe('public-wider'); // spine widened past the brand
    const findings = gateFindings(facts);
    expect(findings.some((f) => f.title.includes('VideoConfig'))).toBe(true);
  });

  it('WGSL output omission (CompositeState.outputs dropped a channel)', { timeout: scaledTimeout(60_000) }, () => {
    const { facts } = driftedFacts((c) => c.replace('readonly wgsl: Record<string, number>;', ''));
    const composite = facts.observations.find((o) => o.typeName === 'CompositeState')!;
    expect(composite.observedRelation).toBe('public-wider'); // spine missing a runtime member
    const findings = gateFindings(facts);
    expect(findings.some((f) => f.title.includes('CompositeState'))).toBe(true);
  });

  it(
    'Codec transport widening — encode gains a Promise arm (adversarial QA Finding 1)',
    { timeout: scaledTimeout(60_000) },
    () => {
      // The gap the whole-shape `public-wider` pin missed: a SECOND field widening in the
      // same direction as the deliberately-wider `schema`. Decomposing Codec into field
      // admissions closes it — encode is pinned `exact`, so a transport widening reds.
      const { facts } = driftedFacts((c) =>
        c.replace(
          'encode(value: A): Codec.Result<I, Codec.ParseError>;',
          'encode(value: A): Codec.Result<I, Codec.ParseError> | Promise<I>;',
        ),
      );
      const encode = facts.observations.find((o) => o.typeName === "Codec['encode']")!;
      expect(encode.observedRelation).toBe('public-wider'); // widened past exact
      const decode = facts.observations.find((o) => o.typeName === "Codec['decode']")!;
      expect(decode.observedRelation).toBe('exact'); // decode untouched — the drift is localized
      const findings = gateFindings(facts);
      expect(findings.some((f) => f.title.includes("Codec['encode']"))).toBe(true);
    },
  );

  it('Plan.topoSort result-object drift is admitted and detected', { timeout: scaledTimeout(60_000) }, () => {
    const { facts } = driftedFacts((c) =>
      c.replace(
        'export function topoSort(planIR: PlanIR): TopoSortResult;',
        'export function topoSort(planIR: PlanIR): readonly string[];',
      ),
    );
    const method = facts.observations.find((o) => o.typeName === 'Plan.topoSort')!;
    expect(method.observedRelation).not.toBe('exact');
    expect(gateFindings(facts).some((finding) => finding.title.includes('Plan.topoSort'))).toBe(true);
  });

  it('Signal.audio disappearance is admitted and detected', { timeout: scaledTimeout(60_000) }, () => {
    const { facts } = driftedFacts((c) => c.replace('export function audio(', 'export function audioRemoved('));
    const method = facts.observations.find((o) => o.typeName === 'Signal.audio')!;
    expect(method.resolved).toBe(false);
    expect(gateFindings(facts).some((finding) => finding.title.includes('Signal.audio'))).toBe(true);
  });

  it(
    'a mirror that collapses to `any` reds as unresolved, never a false exact (review-point #2)',
    { timeout: scaledTimeout(60_000) },
    () => {
      // The silent hole an unaliased cross-package import opens: a type resolving to `any`
      // makes BOTH assignability probes trivially pass → a false `exact`. The is-any guard
      // must catch it. Force CapSet to `any` on the spine side.
      const { facts } = driftedFacts((c) =>
        c.replace('export interface CapSet {', 'export type CapSet = any;\ntype _IgnoredCapSetBody = {'),
      );
      const capSet = facts.observations.find((o) => o.typeName === 'CapSet')!;
      expect(capSet.resolved).toBe(false); // NOT a silent exact
      expect(capSet.detail).toContain('any');
      const findings = gateFindings(facts);
      expect(findings.some((f) => f.title.includes('CapSet') && f.title.includes('no longer resolves'))).toBe(true);
    },
  );

  it('an unresolved mirror (a removed type) reds as a broken contract', { timeout: scaledTimeout(60_000) }, () => {
    // Rename CapSet on the spine side → the admission's spine type no longer resolves.
    const { facts } = driftedFacts((c) => c.replace('export interface CapSet {', 'export interface CapSetRenamed {'));
    const capSet = facts.observations.find((o) => o.typeName === 'CapSet')!;
    expect(capSet.resolved).toBe(false);
    const findings = gateFindings(facts);
    expect(findings.some((f) => f.title.includes('CapSet') && f.title.includes('no longer resolves'))).toBe(true);
  });
});

describe('spine-relation exact census — planted declaration mutations', () => {
  it(
    'reds on a fake runtime twin instead of admitting a declaration-only name',
    { timeout: scaledTimeout(60_000) },
    () => {
      const fake: SpineTypeAdmission = {
        typeName: 'CapSet.fakeRuntimeTwin',
        authority: 'runtime',
        admittedRelation: 'exact',
        spineExpr: 'CapSet',
        runtimeModule: 'packages/core/src/index.ts',
        runtimeExpr: 'CapSetThatDoesNotExist',
      };
      const facts = buildSpineRelationFacts([fake], REPO_ROOT, SPINE_OPTIONS);
      expect(facts.observations[0]).toMatchObject({ resolved: false, observedRelation: 'opaque' });
      expect(gateFindings(facts).some((finding) => finding.title.includes('fakeRuntimeTwin'))).toBe(true);
    },
  );

  it('reds on a missing required mirror', { timeout: scaledTimeout(60_000) }, () => {
    const facts = driftedFileFacts(COMMAND_DTS, (source) =>
      source.replace('export interface SceneCompilation {', 'export interface SceneCompilationRemoved {'),
    );
    const observation = facts.observations.find((entry) => entry.typeName === 'SceneCompilation')!;
    expect(observation.resolved).toBe(false);
    expect(gateFindings(facts).some((finding) => finding.title.includes('SceneCompilation'))).toBe(true);
  });

  it('reds on a required field made optional', { timeout: scaledTimeout(60_000) }, () => {
    const facts = driftedFileFacts(WORKER_DTS, (source) =>
      source.replace('  terminate(): void;', '  terminate?(): void;'),
    );
    const observation = facts.observations.find((entry) => entry.typeName === 'WorkerLike')!;
    expect(observation.observedRelation).not.toBe('exact');
    expect(gateFindings(facts).some((finding) => finding.title.includes('WorkerLike'))).toBe(true);
  });

  it('reds on an exact key-set expansion', { timeout: scaledTimeout(60_000) }, () => {
    const facts = driftedFileFacts(WORKER_DTS, (source) =>
      source.replace('export interface WorkerLike {', 'export interface WorkerLike {\n  readonly inventedKey: true;'),
    );
    const observation = facts.observations.find((entry) => entry.typeName === 'WorkerLike')!;
    expect(observation.observedRelation).toBe('public-narrower');
    expect(gateFindings(facts).some((finding) => finding.title.includes('WorkerLike'))).toBe(true);
  });

  it('reds on a required field type change', { timeout: scaledTimeout(60_000) }, () => {
    const facts = driftedFileFacts(COMMAND_DTS, (source) =>
      source.replace('  readonly fps: number;', '  readonly fps: string;'),
    );
    const observation = facts.observations.find((entry) => entry.typeName === 'SceneCompilation')!;
    expect(observation.observedRelation).toBe('opaque');
    expect(gateFindings(facts).some((finding) => finding.title.includes('SceneCompilation'))).toBe(true);
  });

  it('reds when an admitted directional relation is reversed', { timeout: scaledTimeout(60_000) }, () => {
    const facts = buildSpineRelationFacts(ADMISSIONS, REPO_ROOT, SPINE_OPTIONS);
    const reversed: SpineRelationFacts = {
      observations: facts.observations.map((observation) =>
        observation.typeName === 'Signal.audio'
          ? { ...observation, admittedRelation: 'public-wider' as const }
          : observation,
      ),
    };
    const observation = reversed.observations.find((entry) => entry.typeName === 'Signal.audio')!;
    expect(observation.observedRelation).toBe('public-narrower');
    expect(gateFindings(reversed).some((finding) => finding.title.includes('Signal.audio'))).toBe(true);
  });
});

describe('spine-relation public-contract projection — private witnesses stay private without hiding public drift', () => {
  it('reds on visible Part, System, and generic SystemContext drift', { timeout: scaledTimeout(60_000) }, () => {
    const facts = focusedCoreFacts(['Part', 'System', 'SystemContext'], (source) =>
      source
        .replace('readonly retention: PartRetentionPolicy;', 'readonly retention?: PartRetentionPolicy;')
        .replace(
          'execute(entities: readonly SystemEntity[], context: SystemContext<Q, R, W>): void;',
          'execute(entities: readonly SystemEntity[], context: unknown): void;',
        )
        .replace(
          'write<P extends TuplePart<W>>(entity: SystemEntity, part: P, value: PartValue<P>): void;',
          'write<P extends TuplePart<W>>(entity: SystemEntity, part: P, value: unknown): void;',
        ),
    );

    for (const typeName of ['Part', 'System', 'SystemContext'] as const) {
      const observation = facts.observations.find((entry) => entry.typeName === typeName)!;
      expect(observation.observedRelation, `${typeName} public drift must not be erased`).not.toBe('exact');
      expect(gateFindings(facts).some((finding) => finding.title.includes(typeName))).toBe(true);
    }
  });

  it('keeps the public async-disposal symbol in the compared contract', { timeout: scaledTimeout(60_000) }, () => {
    const facts = focusedCoreFacts(['AsyncOwnedResource'], (source) =>
      source.replace('  [Symbol.asyncDispose](): Promise<void>;\n', ''),
    );
    const resource = facts.observations[0]!;
    expect(resource.observedRelation).not.toBe('exact');
    expect(gateFindings(facts).some((finding) => finding.title.includes('AsyncOwnedResource'))).toBe(true);
  });

  it('ignores only a module-private unique-symbol witness name', { timeout: scaledTimeout(60_000) }, () => {
    const facts = focusedCoreFacts(['Part'], (source) =>
      source.replaceAll('SpinePartWitness', 'AlternatePrivatePartWitness'),
    );
    expect(facts.observations[0]).toMatchObject({ resolved: true, observedRelation: 'exact' });
    expect(gateFindings(facts)).toEqual([]);
  });
});

describe('spine-relation gate — authority ratchet (Axiom 5)', () => {
  it('self-proves: redCaught ∧ greenClean ∧ mutationKilled', () => {
    const proof = verifyGate(spineRelationGate);
    expect(proof.redCaught).toBe(true);
    expect(proof.greenClean).toBe(true);
    expect(proof.mutationKilled).toBe(true);
    expect(proof.selfProven).toBe(true);
  });
});
