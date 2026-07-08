/**
 * doctor — live deployed-site header probes (`--deployed <url>`).
 *
 * Fetches the production response and verifies CSP / COOP / COEP plus the
 * Accept-CH / Critical-CH pair (#116).
 *
 * @module
 */

import type { DoctorCheck } from './types.js';

const REQUIRED_ISOLATION = ['Cross-Origin-Opener-Policy', 'Cross-Origin-Embedder-Policy'] as const;

function headerSummary(headers: Headers, name: string): string | null {
  const value = headers.get(name);
  return value && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Probe a deployed URL's response headers. Returns one check per concern.
 */
export async function probeDeployedSite(url: string): Promise<readonly DoctorCheck[]> {
  let response: Response;
  try {
    response = await fetch(url, { redirect: 'follow' });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return [
      {
        id: 'deployed.fetch',
        label: 'Deployed site fetch',
        status: 'fail',
        detail: `Could not fetch ${url}: ${detail}`,
        hint: 'Pass a reachable HTTPS URL to `czap doctor --deployed <url>`',
      },
    ];
  }

  const headers = response.headers;
  const checks: DoctorCheck[] = [
    {
      id: 'deployed.fetch',
      label: 'Deployed site fetch',
      status: response.ok ? 'ok' : 'warn',
      detail: response.ok ? `${response.status} ${response.statusText}` : `HTTP ${response.status} from ${url}`,
    },
  ];

  const csp = headerSummary(headers, 'content-security-policy');
  checks.push({
    id: 'deployed.csp',
    label: 'Content-Security-Policy',
    status: csp ? 'ok' : 'warn',
    detail: csp ?? 'missing — worker-src/connect-src may be required for client:worker / SSE',
    hint: "Add a CSP with worker-src 'self' blob: and connect-src for your runtime endpoints",
  });

  for (const name of REQUIRED_ISOLATION) {
    const value = headerSummary(headers, name);
    checks.push({
      id: `deployed.${name.toLowerCase()}`,
      label: name,
      status: value ? 'ok' : 'warn',
      detail: value ?? `missing — required for SharedArrayBuffer / client:worker`,
      hint: 'Enable workers in czap integration or set COOP/COEP on your host middleware',
    });
  }

  const acceptCH = headerSummary(headers, 'Accept-CH');
  const criticalCH = headerSummary(headers, 'Critical-CH');
  checks.push({
    id: 'deployed.accept-ch',
    label: 'Accept-CH',
    status: acceptCH ? 'ok' : 'warn',
    detail: acceptCH ?? 'missing — tier detection may degrade on first navigation',
  });
  checks.push({
    id: 'deployed.critical-ch',
    label: 'Critical-CH',
    status: criticalCH ? 'ok' : 'warn',
    detail: criticalCH ?? 'missing — Sec-CH-Viewport-Width may be absent before first render',
    hint: 'Use czapMiddleware or cloudflareMiddleware so Client Hints are requested',
  });

  const vary = headerSummary(headers, 'Vary');
  checks.push({
    id: 'deployed.vary',
    label: 'Vary',
    status: vary && vary.includes('Sec-CH') ? 'ok' : 'warn',
    detail: vary ?? 'missing — CDN may serve wrong-tier HTML (#122)',
    hint: 'czap detect middleware emits Vary on Client Hint inputs',
  });

  return checks;
}
