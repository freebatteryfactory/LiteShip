/**
 * Tier 0.4 guard — every manifest capsule with a classified-real generated bench
 * exercises its declared hot path once (fast meta lane; no `vitest run *.bench.ts`
 * inside the mutating capsule:verify gate).
 *
 * Catalog-driven from the manifest + capsule modules — NOT regex mirrors of the
 * generated `.bench.ts` text (those drift from the harness templates).
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import * as fc from 'fast-check';
import { CanonicalCbor } from '@czap/core';
import { decode } from '@czap/canonical';
import { classifyBenchSource, schemaToArbitrary } from '@czap/core/harness';
import { getCapsuleManifestPath } from '@czap/command/host';
import { repoRoot, scaledTimeout } from '../../../vitest.shared.ts';

const BENCH_SAMPLE_OPTS = { numRuns: 64, seed: 0x5eed } as const;
const INTRO_BED_FIXTURE = resolve(repoRoot, 'examples/scenes/intro-bed.wav');

interface ManifestEntry {
  readonly name: string;
  readonly kind: string;
  readonly source: string;
  readonly generated: { readonly benchFile: string };
  readonly benchExemption?: { readonly reason: string };
}

interface CapsuleManifest {
  readonly capsules: readonly ManifestEntry[];
}

type CapsuleRecord = Record<string, unknown> & {
  readonly name?: string;
  readonly _kind?: string;
  readonly input?: unknown;
  readonly output?: unknown;
  readonly initialState?: unknown;
};

function isRealBenchSource(src: string): boolean {
  return classifyBenchSource(src) === 'real' && !src.includes('BENCH-NOT-APPLICABLE');
}

function loadManifest(): CapsuleManifest | null {
  const path = getCapsuleManifestPath(repoRoot);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')) as CapsuleManifest;
}

function catalogRealBenchEntries(): ManifestEntry[] {
  const manifest = loadManifest();
  if (manifest !== null) {
    return manifest.capsules.filter((entry) => {
      if (entry.benchExemption !== undefined) return false;
      const benchPath = resolve(repoRoot, entry.generated.benchFile);
      if (!existsSync(benchPath)) return false;
      return isRealBenchSource(readFileSync(benchPath, 'utf8'));
    });
  }

  const generatedDir = resolve(repoRoot, 'tests/generated');
  if (!existsSync(generatedDir)) return [];

  return readdirSync(generatedDir)
    .filter((name) => name.endsWith('.bench.ts'))
    .map((name) => join('tests/generated', name))
    .filter((rel) => isRealBenchSource(readFileSync(resolve(repoRoot, rel), 'utf8')))
    .map((benchFile) => ({
      name: basename(benchFile, '.bench.ts'),
      kind: 'unknown',
      source: '',
      generated: { benchFile },
    }));
}

async function loadCapsule(entry: ManifestEntry): Promise<CapsuleRecord> {
  if (entry.source.length === 0) {
    throw new Error(`${entry.generated.benchFile}: manifest-less fallback requires a source path`);
  }
  const mod = (await import(resolve(repoRoot, entry.source.replace(/\.ts$/, '.js')))) as Record<string, unknown>;
  for (const value of Object.values(mod)) {
    if (value !== null && typeof value === 'object' && (value as CapsuleRecord).name === entry.name) {
      return value as CapsuleRecord;
    }
  }
  throw new Error(`capsule export for ${entry.name} not found in ${entry.source}`);
}

async function exerciseSceneTick(entry: ManifestEntry): Promise<void> {
  const { compileIntro } = await import('../../../examples/scenes/intro.js');
  const { SceneRuntime } = await import('../../../packages/scene/src/runtime.js');
  const compiled = compileIntro();
  const dtMs = 1000 / (compiled as { fps: number }).fps;
  const handle = await SceneRuntime.build(
    compiled,
    entry.name === 'examples.intro' ? { sampleRate: 48000 } : undefined,
  );
  try {
    await handle.tick(dtMs);
  } finally {
    await handle.release();
  }
}

async function exerciseCachedProjection(cap: CapsuleRecord, entry: ManifestEntry): Promise<void> {
  expect(typeof cap.derive, `${entry.name}: derive handler`).toBe('function');
  if (!existsSync(INTRO_BED_FIXTURE)) {
    throw new Error(
      `${entry.name}: fixture missing at ${INTRO_BED_FIXTURE} — restore intro-bed.wav or run capsule:compile after assets land`,
    );
  }
  const bytes = readFileSync(INTRO_BED_FIXTURE);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const result = (cap.derive as (input: unknown) => unknown)(buffer);
  if (result instanceof Promise) await result;
}

async function exerciseSiteAdapter(cap: CapsuleRecord, entry: ManifestEntry): Promise<void> {
  const arb = schemaToArbitrary(cap.output as never) as fc.Arbitrary<unknown>;
  const natives = fc.sample(arb, BENCH_SAMPLE_OPTS);
  expect(natives.length, `${entry.name}: presampled natives`).toBeGreaterThan(0);
  decode(CanonicalCbor.encode(natives[0]));
}

async function exerciseHandler(
  cap: CapsuleRecord,
  entry: ManifestEntry,
  handlerKey: 'run' | 'derive' | 'mutate' | 'decide',
  schema: unknown,
): Promise<void> {
  const handler = cap[handlerKey];
  expect(typeof handler, `${entry.name}: cap.${handlerKey}`).toBe('function');
  const arb = schemaToArbitrary(schema as never) as fc.Arbitrary<unknown>;
  const samples = fc.sample(arb, BENCH_SAMPLE_OPTS);
  expect(samples.length, `${entry.name}: presampled inputs`).toBeGreaterThan(0);
  const result = (handler as (input: unknown) => unknown)(samples[0]);
  if (result instanceof Promise) await result;
}

async function exerciseStep(cap: CapsuleRecord, entry: ManifestEntry): Promise<void> {
  expect(typeof cap.step, `${entry.name}: cap.step`).toBe('function');
  const arb = schemaToArbitrary(cap.input as never) as fc.Arbitrary<unknown>;
  const events = fc.sample(arb, BENCH_SAMPLE_OPTS);
  expect(events.length, `${entry.name}: presampled events`).toBeGreaterThan(0);
  const state = structuredClone(cap.initialState);
  (cap.step as (s: unknown, e: unknown) => unknown)(state, events[0]);
}

async function exerciseCapsuleBench(entry: ManifestEntry): Promise<void> {
  const kind = entry.kind === 'unknown' ? undefined : entry.kind;

  if (entry.name === 'scene.runtime' || entry.name === 'examples.intro') {
    await exerciseSceneTick(entry);
    return;
  }

  const cap = await loadCapsule(entry);
  const resolvedKind = kind ?? (cap._kind as string | undefined);
  expect(resolvedKind, `${entry.name}: capsule kind`).toBeDefined();

  switch (resolvedKind) {
    case 'siteAdapter':
      await exerciseSiteAdapter(cap, entry);
      return;
    case 'cachedProjection':
      await exerciseCachedProjection(cap, entry);
      return;
    case 'stateMachine':
      if (typeof cap.step === 'function') {
        await exerciseStep(cap, entry);
        return;
      }
      break;
    case 'policyGate':
      await exerciseHandler(cap, entry, 'decide', cap.input);
      return;
    case 'receiptedMutation':
      await exerciseHandler(cap, entry, 'mutate', cap.input);
      return;
    case 'pureTransform':
      await exerciseHandler(cap, entry, 'run', cap.input);
      return;
    default:
      break;
  }

  if (typeof cap.run === 'function') {
    await exerciseHandler(cap, entry, 'run', cap.input);
    return;
  }
  if (typeof cap.derive === 'function') {
    await exerciseHandler(cap, entry, 'derive', cap.input);
    return;
  }
  if (typeof cap.mutate === 'function') {
    await exerciseHandler(cap, entry, 'mutate', cap.input);
    return;
  }
  if (typeof cap.decide === 'function') {
    await exerciseHandler(cap, entry, 'decide', cap.input);
    return;
  }
  if (typeof cap.step === 'function') {
    await exerciseStep(cap, entry);
    return;
  }

  throw new Error(`no exercise path for ${entry.name} (kind=${resolvedKind})`);
}

describe('generated bench execution — catalog-driven smoke', () => {
  const entries = catalogRealBenchEntries();

  it('catalog is non-empty (at least one real generated bench exists)', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it.each(entries.map((entry) => [entry.name, entry.generated.benchFile, entry] as const))(
    '%s (%s) exercises its declared hot path once',
    async (_name, benchFile, entry) => {
      await exerciseCapsuleBench(entry);
    },
    scaledTimeout(60_000),
  );
});
