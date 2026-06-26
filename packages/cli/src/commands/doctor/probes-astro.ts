/**
 * doctor — Astro dev-server probes.
 *
 * Astro 7 ships a background dev server (`astro dev --background`) and a
 * `/_astro/status` liveness endpoint. This probe folds that endpoint into
 * `czap doctor` so an agent (or CI) can verify a running dev server through the
 * same evidence loop as every other environment check — `czap doctor --target
 * astro`.
 *
 * A refused connection is a `warn`, not a `fail`: "no dev server running" is the
 * expected state most of the time, not a broken environment.
 *
 * @module
 */

import { DOCTOR_PROBE_TIMEOUT_MS, type DoctorCheck } from './types.js';

/** Default base URL of the Astro dev server (its conventional port), overridable via env. */
const DEFAULT_ASTRO_DEV_URL = process.env['CZAP_ASTRO_DEV_URL'] ?? 'http://127.0.0.1:4321';

const PROBE_ID = 'astro.dev-status';
const PROBE_LABEL = 'Astro dev server';

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Probe the Astro 7 `/_astro/status` endpoint. `ok` when it returns
 * `{ ok: true }`; `warn` when the server is unreachable (not running) or
 * answered without the healthy shape; `fail` on a non-2xx HTTP status.
 */
export async function probeAstroDevStatus(baseUrl: string = DEFAULT_ASTRO_DEV_URL): Promise<DoctorCheck> {
  const url = `${baseUrl.replace(/\/$/, '')}/_astro/status`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOCTOR_PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      return {
        id: PROBE_ID,
        label: PROBE_LABEL,
        status: 'fail',
        detail: `/_astro/status returned HTTP ${res.status} at ${baseUrl}`,
        hint: 'The dev server is up but unhealthy — check its logs: astro dev logs',
      };
    }
    const body = (await res.json().catch(() => null)) as { ok?: boolean } | null;
    if (body?.ok === true) {
      return { id: PROBE_ID, label: PROBE_LABEL, status: 'ok', detail: `healthy at ${baseUrl}` };
    }
    return {
      id: PROBE_ID,
      label: PROBE_LABEL,
      status: 'warn',
      detail: `/_astro/status at ${baseUrl} responded without { ok: true }`,
      hint: 'Confirm the server is an Astro 7 dev server (astro dev status)',
    };
  } catch (error) {
    return {
      id: PROBE_ID,
      label: PROBE_LABEL,
      status: 'warn',
      detail: `no dev server reachable at ${baseUrl} (${describeError(error)})`,
      hint: 'Start one in the background: astro dev --background',
    };
  } finally {
    clearTimeout(timer);
  }
}
