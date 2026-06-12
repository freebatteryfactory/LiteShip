/**
 * Shared detect/workers/coep toggle resolution for integration + middleware.
 *
 * {@link integration} publishes the toggles it computed from
 * {@link IntegrationConfig}; {@link czapMiddleware} consumes them when
 * middleware config omits explicit overrides.
 *
 * @module
 */

import type { CrossOriginEmbedderPolicy } from './headers.js';
import type { IntegrationConfig } from './integration.js';

/** Resolved runtime header toggles shared between integration and middleware. */
export interface CzapRuntimeToggles {
  readonly detectEnabled: boolean;
  readonly workersEnabled: boolean;
  readonly coep: CrossOriginEmbedderPolicy | undefined;
}

let publishedToggles: CzapRuntimeToggles | null = null;

/** Compute toggles from integration config (single source of truth). */
export function resolveIntegrationToggles(config?: IntegrationConfig): CzapRuntimeToggles {
  return {
    detectEnabled: config?.detect !== false,
    workersEnabled: config?.workers?.enabled === true,
    coep: config?.workers?.coep,
  };
}

/** Called once per integration factory — middleware reads via {@link consumeIntegrationToggles}. */
export function publishIntegrationToggles(toggles: CzapRuntimeToggles): void {
  publishedToggles = toggles;
}

/** Test hook — reset published toggles between unit tests. */
export function resetIntegrationTogglesForTesting(): void {
  publishedToggles = null;
}

/**
 * Middleware consumes integration-published toggles unless explicit
 * middleware config overrides a field.
 */
export function consumeIntegrationToggles(middleware?: {
  readonly detect?: boolean;
  readonly workers?: { readonly enabled?: boolean; readonly coep?: CrossOriginEmbedderPolicy };
}): CzapRuntimeToggles {
  const base = publishedToggles ?? resolveIntegrationToggles(undefined);
  return {
    detectEnabled: middleware?.detect ?? base.detectEnabled,
    workersEnabled: middleware?.workers?.enabled ?? base.workersEnabled,
    coep: middleware?.workers?.coep ?? base.coep,
  };
}
