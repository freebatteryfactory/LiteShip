/**
 * Browser-side application of canonical LiteShip boundary HMR payloads.
 *
 * Targets are selected by the content address inside the JSON
 * `data-liteship-boundary` contract. A boundary export name is diagnostic only;
 * it is never interpolated into a selector or treated as runtime identity.
 *
 * @module
 */

import type { ContentAddress } from '@liteship/core';
import type { BoundaryManifestEntry, CompiledOutputs, TierKey } from '@liteship/edge';
import { dispatchLiteshipEvent } from '@liteship/web';

/** JSON-safe boundary identity emitted by Core and consumed by Astro. */
export interface HMRBoundaryIdentity {
  readonly id: ContentAddress;
  readonly input: string;
  readonly thresholds: readonly number[];
  readonly states: readonly [string, ...string[]];
  readonly hysteresis?: number;
  readonly spec?: {
    readonly timeRange?: { readonly from?: number; readonly until?: number };
    readonly experimentId?: string;
  };
}

/**
 * Canonical Vite HMR payload. `previousBoundaryId` finds the currently rendered
 * hosts; `boundary` and `manifest` are the newly compiled definition/projection.
 */
export interface HMRPayload {
  readonly type: 'liteship:update';
  readonly boundaryName: string;
  readonly previousBoundaryId: ContentAddress;
  readonly boundary: HMRBoundaryIdentity;
  readonly manifest: Pick<BoundaryManifestEntry, 'id' | 'outputs' | 'outputsByTier'>;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBoundaryIdentity(value: unknown): value is HMRBoundaryIdentity {
  if (!isRecord(value)) return false;
  return (
    typeof value['id'] === 'string' &&
    value['id'].startsWith('fnv1a:') &&
    typeof value['input'] === 'string' &&
    Array.isArray(value['thresholds']) &&
    value['thresholds'].length > 0 &&
    value['thresholds'].every((entry) => typeof entry === 'number' && Number.isFinite(entry)) &&
    Array.isArray(value['states']) &&
    value['states'].length > 0 &&
    value['states'].every((entry) => typeof entry === 'string')
  );
}

function isCompiledOutput(value: unknown): value is CompiledOutputs {
  if (!isRecord(value)) return false;
  if (
    typeof value['css'] !== 'string' ||
    typeof value['propertyRegistrations'] !== 'string' ||
    typeof value['containerQueries'] !== 'string'
  ) {
    return false;
  }
  const glsl = value['glsl'];
  const wgsl = value['wgsl'];
  return (
    (glsl === undefined ||
      (isRecord(glsl) && typeof glsl['declarations'] === 'string' && isRecord(glsl['uniformValues']))) &&
    (wgsl === undefined ||
      (isRecord(wgsl) && typeof wgsl['declarations'] === 'string' && isRecord(wgsl['bindingValues'])))
  );
}

/** Runtime admission for the custom Vite channel. Foreign payloads stay inert. */
export function isHMRPayload(value: unknown): value is HMRPayload {
  if (!isRecord(value) || value['type'] !== 'liteship:update') return false;
  if (typeof value['boundaryName'] !== 'string' || typeof value['previousBoundaryId'] !== 'string') return false;
  if (!isBoundaryIdentity(value['boundary']) || !isRecord(value['manifest'])) return false;
  const manifest = value['manifest'];
  if (
    manifest['id'] !== value['boundary'].id ||
    !Array.isArray(manifest['outputs']) ||
    !manifest['outputs'].every(isCompiledOutput) ||
    !isRecord(manifest['outputsByTier'])
  ) {
    return false;
  }
  const outputs = manifest['outputs'] as readonly CompiledOutputs[];
  return Object.values(manifest['outputsByTier']).every(
    (index) => typeof index === 'number' && Number.isInteger(index) && index >= 0 && index < outputs.length,
  );
}

function parseBoundaryAttribute(value: string | null): Readonly<Record<string, unknown>> | null {
  if (value === null) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) && typeof parsed['id'] === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

function selectedOutput(payload: HMRPayload, documentRoot: HTMLElement): CompiledOutputs | undefined {
  const motion = documentRoot.getAttribute('data-liteship-motion');
  const design = documentRoot.getAttribute('data-liteship-design');
  if (motion === null || design === null) return undefined;
  const key = `${motion}:${design}` as TierKey;
  const index = payload.manifest.outputsByTier[key];
  return typeof index === 'number' && Number.isInteger(index) && index >= 0
    ? payload.manifest.outputs[index]
    : undefined;
}

function hmrStyle(documentRef: Document, previousId: string, nextId: string): HTMLStyleElement {
  const styles = documentRef.querySelectorAll<HTMLStyleElement>('style[data-liteship-hmr-boundary]');
  let element = [...styles].find((candidate) => {
    const id = candidate.getAttribute('data-liteship-hmr-boundary');
    return id === previousId || id === nextId;
  });
  if (element === undefined) {
    element = documentRef.createElement('style');
    documentRef.head.appendChild(element);
  }
  element.setAttribute('data-liteship-hmr-boundary', nextId);
  return element;
}

/**
 * Apply one admitted HMR payload. Returns the number of canonical boundary
 * hosts updated; zero means malformed/foreign/stale and leaves the DOM intact.
 */
export function handleHMR(input: unknown): number {
  if (typeof document === 'undefined' || !isHMRPayload(input)) return 0;
  const payload = input;
  const targets = [...document.querySelectorAll<HTMLElement>('[data-liteship-boundary]')].filter(
    (element) =>
      parseBoundaryAttribute(element.getAttribute('data-liteship-boundary'))?.['id'] === payload.previousBoundaryId,
  );
  if (targets.length === 0) return 0;

  const output = selectedOutput(payload, document.documentElement);
  if (payload.manifest.outputs.length > 0 && output === undefined) return 0;
  if (output !== undefined)
    hmrStyle(document, payload.previousBoundaryId, payload.boundary.id).textContent = output.css;

  for (const target of targets) {
    const current = parseBoundaryAttribute(target.getAttribute('data-liteship-boundary'))!;
    target.setAttribute('data-liteship-boundary', JSON.stringify({ ...current, ...payload.boundary }));
    if (output?.glsl !== undefined || output?.wgsl !== undefined) {
      dispatchLiteshipEvent(target, 'liteship:uniform-update', {
        ...(output.glsl !== undefined ? { glsl: output.glsl.uniformValues } : {}),
        ...(output.wgsl !== undefined ? { wgsl: output.wgsl.bindingValues } : {}),
      });
    }
    dispatchLiteshipEvent(target, 'liteship:reinit');
  }
  return targets.length;
}
