/** Workstation resource admission for heavyweight local authorities. @module */

import { availableParallelism, cpus, freemem, totalmem } from 'node:os';

const MIB = 1024 * 1024;
const GIB = 1024 * MIB;

export const LOCAL_RESOURCE_POLICY = Object.freeze({
  cpuSampleMs: 500,
  retryMs: 5_000,
  maxWaitMs: 30_000,
  localDocsHeapMiB: 4_096,
  ciDocsHeapMiB: 8_192,
  reservedMemoryMiB: 2_048,
  swapBackedReservedMemoryMiB: 768,
  maximumBusyPercent: 90,
  openFreeMemoryGiB: 12,
  openMaximumBusyPercent: 35,
  balancedFreeMemoryGiB: 6,
  balancedMaximumBusyPercent: 85,
}) as const;

export interface CpuTimesSnapshot {
  readonly idle: number;
  readonly total: number;
}

export interface LocalResourceObservation {
  readonly platform: NodeJS.Platform;
  readonly logicalCpus: number;
  readonly availableParallelism: number;
  readonly cpuBusyPercent: number;
  readonly totalMemoryBytes: number;
  readonly freeMemoryBytes: number;
}

export interface LocalResourcePlan {
  readonly schema: 'liteship/local-resource-plan@1';
  readonly profile: 'constrained' | 'balanced' | 'open';
  readonly observation: LocalResourceObservation;
  readonly nativeTypeScriptWorkers: number;
  readonly docs: {
    readonly admitted: boolean;
    readonly heapMiB: number;
    readonly reservedMemoryMiB: number;
    readonly swapBacked: boolean;
    readonly reason: 'admitted' | 'admitted-swap' | 'cpu-contended' | 'memory-headroom';
  };
}

interface CpuTimesLike {
  readonly times: {
    readonly user: number;
    readonly nice: number;
    readonly sys: number;
    readonly idle: number;
    readonly irq: number;
  };
}

/** Fold per-core counters into one cross-platform cumulative snapshot. */
export function snapshotCpuTimes(items: readonly CpuTimesLike[]): CpuTimesSnapshot {
  return items.reduce<CpuTimesSnapshot>(
    (sum, item) => ({
      idle: sum.idle + item.times.idle,
      total: sum.total + item.times.user + item.times.nice + item.times.sys + item.times.idle + item.times.irq,
    }),
    { idle: 0, total: 0 },
  );
}

/** CPU busy percentage over two cumulative samples; invalid deltas fail conservative. */
export function cpuBusyPercent(before: CpuTimesSnapshot, after: CpuTimesSnapshot): number {
  const totalDelta = after.total - before.total;
  const idleDelta = after.idle - before.idle;
  if (!Number.isFinite(totalDelta) || !Number.isFinite(idleDelta) || totalDelta <= 0 || idleDelta < 0) return 100;
  return Math.max(0, Math.min(100, ((totalDelta - idleDelta) / totalDelta) * 100));
}

/** Pure resource policy: load may change scheduling, never which proof is required. */
export function selectLocalResourcePlan(
  observation: LocalResourceObservation,
  options: { readonly ci?: boolean; readonly allowSwap?: boolean } = {},
): LocalResourcePlan {
  const ci = options.ci === true;
  const swapBacked = !ci && options.allowSwap === true;
  const heapMiB = ci ? LOCAL_RESOURCE_POLICY.ciDocsHeapMiB : LOCAL_RESOURCE_POLICY.localDocsHeapMiB;
  const reservedMemoryMiB = swapBacked
    ? LOCAL_RESOURCE_POLICY.swapBackedReservedMemoryMiB
    : LOCAL_RESOURCE_POLICY.reservedMemoryMiB;
  const freeMiB = observation.freeMemoryBytes / MIB;
  const enoughMemory = ci || freeMiB >= heapMiB + reservedMemoryMiB;
  const cpuAdmitted = ci || observation.cpuBusyPercent <= LOCAL_RESOURCE_POLICY.maximumBusyPercent;
  const admitted = enoughMemory && cpuAdmitted;
  const profile =
    !swapBacked &&
    admitted &&
    observation.availableParallelism >= 8 &&
    observation.freeMemoryBytes >= LOCAL_RESOURCE_POLICY.openFreeMemoryGiB * GIB &&
    observation.cpuBusyPercent <= LOCAL_RESOURCE_POLICY.openMaximumBusyPercent
      ? 'open'
      : admitted &&
          observation.freeMemoryBytes >= LOCAL_RESOURCE_POLICY.balancedFreeMemoryGiB * GIB &&
          observation.cpuBusyPercent <= LOCAL_RESOURCE_POLICY.balancedMaximumBusyPercent
        ? 'balanced'
        : 'constrained';
  return Object.freeze({
    schema: 'liteship/local-resource-plan@1',
    profile,
    observation: Object.freeze({ ...observation }),
    nativeTypeScriptWorkers: Math.max(1, Math.min(profile === 'constrained' ? 1 : 2, observation.availableParallelism)),
    docs: Object.freeze({
      admitted,
      heapMiB,
      reservedMemoryMiB,
      swapBacked,
      reason: enoughMemory
        ? cpuAdmitted
          ? swapBacked
            ? 'admitted-swap'
            : 'admitted'
          : 'cpu-contended'
        : 'memory-headroom',
    }),
  });
}

export interface LocalResourceSampler {
  (): Promise<LocalResourceObservation>;
}

/** Sample CPU over a short interval plus live memory/parallelism observations. */
export async function sampleLocalResources(
  delayMs: number = LOCAL_RESOURCE_POLICY.cpuSampleMs,
): Promise<LocalResourceObservation> {
  const beforeItems = cpus();
  const before = snapshotCpuTimes(beforeItems);
  await new Promise<void>((resolvePromise) => setTimeout(resolvePromise, delayMs));
  const afterItems = cpus();
  return Object.freeze({
    platform: process.platform,
    logicalCpus: afterItems.length,
    availableParallelism: availableParallelism(),
    cpuBusyPercent: cpuBusyPercent(before, snapshotCpuTimes(afterItems)),
    totalMemoryBytes: totalmem(),
    freeMemoryBytes: freemem(),
  });
}

/** Replace any inherited V8 heap flag with the admitted bound. */
export function withAdmittedNodeHeap(existing: string | undefined, heapMiB: number): string {
  const stripped = (existing ?? '')
    .replace(/(?:^|\s)--max-old-space-size(?:=|\s+)\d+(?=\s|$)/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  return [`--max-old-space-size=${heapMiB}`, stripped].filter(Boolean).join(' ');
}

export function formatLocalResourcePlan(plan: LocalResourcePlan): string {
  const freeGiB = plan.observation.freeMemoryBytes / GIB;
  return (
    `[local-admission] ${plan.profile}: ${plan.observation.logicalCpus} CPUs, ` +
    `${plan.observation.cpuBusyPercent.toFixed(1)}% busy, ${freeGiB.toFixed(1)} GiB free; ` +
    `tsc=${plan.nativeTypeScriptWorkers}, typedoc=${plan.docs.heapMiB} MiB, ` +
    `${plan.docs.admitted ? plan.docs.reason : `refused:${plan.docs.reason}`}`
  );
}

/** Bounded wait for safe local TypeDoc headroom; never turns a refusal green. */
export async function awaitLocalDocsAdmission(
  input: {
    readonly ci?: boolean;
    readonly allowSwap?: boolean;
    readonly sampler?: LocalResourceSampler;
    readonly wait?: (ms: number) => Promise<void>;
    readonly maxWaitMs?: number;
    readonly retryMs?: number;
    readonly onObservation?: (plan: LocalResourcePlan) => void;
  } = {},
): Promise<LocalResourcePlan> {
  const sampler = input.sampler ?? sampleLocalResources;
  const wait = input.wait ?? ((ms: number) => new Promise<void>((resolvePromise) => setTimeout(resolvePromise, ms)));
  const maxWaitMs = input.maxWaitMs ?? LOCAL_RESOURCE_POLICY.maxWaitMs;
  const retryMs = input.retryMs ?? LOCAL_RESOURCE_POLICY.retryMs;
  let elapsed = 0;
  while (true) {
    const plan = selectLocalResourcePlan(await sampler(), {
      ci: input.ci,
      allowSwap: input.allowSwap ?? process.env.LITESHIP_DOCS_USE_SWAP === '1',
    });
    input.onObservation?.(plan);
    if (plan.docs.admitted) return plan;
    if (elapsed >= maxWaitMs) {
      const freeGiB = plan.observation.freeMemoryBytes / GIB;
      throw new Error(
        `local-resource-insufficient: TypeDoc needs ${plan.docs.heapMiB} MiB plus ${plan.docs.reservedMemoryMiB} MiB reserved; ` +
          `observed ${freeGiB.toFixed(1)} GiB free at ${plan.observation.cpuBusyPercent.toFixed(1)}% CPU busy. ` +
          'Close competing builds/browser tabs or retry later. After verifying OS swap headroom, ' +
          'LITESHIP_DOCS_USE_SWAP=1 enables the explicit swap-backed profile; the docs proof was not skipped.',
      );
    }
    await wait(retryMs);
    elapsed += retryMs;
  }
}
