import { Diagnostics } from '@liteship/core';
import type { DiagnosticCode } from '@liteship/error';
import type { RuntimeEndpointKind, RuntimeEndpointPolicy } from '@liteship/web';
import { resolveRuntimeUrl } from '@liteship/web';
import { readRuntimeEndpointPolicy } from './policy.js';

type AstroDiagnosticCode = Extract<DiagnosticCode, `astro/${string}`>;

interface RuntimeEndpointDiagnosticCodes {
  readonly malformedUrl: AstroDiagnosticCode;
  readonly crossOriginRejected: AstroDiagnosticCode;
  readonly originNotAllowed: AstroDiagnosticCode;
  readonly endpointKindNotPermitted: AstroDiagnosticCode;
  readonly privateIpRejected: AstroDiagnosticCode;
}

/**
 * Fast boolean check -- does `rawUrl` resolve under a `same-origin`
 * stream policy? Handy for runtime code that only needs a guard and
 * does not want to emit diagnostics.
 */
export function isSameOriginRuntimeUrl(rawUrl: string): boolean {
  return (
    resolveRuntimeUrl(rawUrl, {
      kind: 'stream',
      policy: { mode: 'same-origin' },
    }).type === 'allowed'
  );
}

/**
 * Convenience wrapper around {@link allowRuntimeEndpointUrl} that
 * collapses every diagnostic code into a single `code`. Used by
 * directives that only care whether a URL is same-origin-safe.
 */
export function allowSameOriginRuntimeUrl(
  rawUrl: string | null,
  source: string,
  code: AstroDiagnosticCode,
): string | null {
  return allowRuntimeEndpointUrl(rawUrl, 'stream', source, {
    malformedUrl: code,
    crossOriginRejected: code,
    originNotAllowed: code,
    endpointKindNotPermitted: code,
    privateIpRejected: code,
  });
}

const ENDPOINT_POLICY_FIX =
  "Fix: liteship({ security: { endpointPolicy: { mode: 'allowlist', allowOrigins: ['https://your-origin.example'] } } }).";

function defaultDiagnosticCodes(): RuntimeEndpointDiagnosticCodes {
  return {
    malformedUrl: 'astro/url-policy/malformed-url-rejected',
    crossOriginRejected: 'astro/url-policy/cross-origin-url-rejected',
    originNotAllowed: 'astro/url-policy/origin-not-allowed',
    endpointKindNotPermitted: 'astro/url-policy/endpoint-kind-not-permitted',
    privateIpRejected: 'astro/url-policy/private-ip-rejected',
  };
}

/**
 * Resolve `rawUrl` under the runtime endpoint policy and either
 * return the safe URL string or emit a structured `Diagnostics.warnRegistered`
 * describing the rejection reason. Returns `null` for both missing
 * and rejected URLs so callers can bail out uniformly.
 */
export function allowRuntimeEndpointUrl(
  rawUrl: string | null,
  kind: RuntimeEndpointKind,
  source: string,
  codes?: Partial<RuntimeEndpointDiagnosticCodes>,
  policy: RuntimeEndpointPolicy = readRuntimeEndpointPolicy(),
): string | null {
  const resolved = resolveRuntimeUrl(rawUrl, { kind, policy });
  const finalCodes = { ...defaultDiagnosticCodes(), ...codes };

  switch (resolved.type) {
    case 'missing':
      return null;
    case 'allowed':
      return resolved.url;
    case 'malformed':
      Diagnostics.warnRegistered({
        source,
        code: finalCodes.malformedUrl,
        message: `Runtime URL "${rawUrl}" was rejected because it is not a valid URL.`,
        detail: { kind },
      });
      return null;
    case 'cross-origin-rejected':
      Diagnostics.warnRegistered({
        source,
        code: finalCodes.crossOriginRejected,
        message: `Cross-origin runtime URL "${rawUrl}" was rejected. Runtime endpoints must be same-origin by default. ${ENDPOINT_POLICY_FIX}`,
        detail: { kind },
      });
      return null;
    case 'origin-not-allowed':
      Diagnostics.warnRegistered({
        source,
        code: finalCodes.originNotAllowed,
        message: `Runtime URL "${rawUrl}" was rejected because origin "${resolved.resolved.origin}" is not allowlisted. ${ENDPOINT_POLICY_FIX}`,
        detail: { kind },
      });
      return null;
    case 'kind-not-allowed':
      Diagnostics.warnRegistered({
        source,
        code: finalCodes.endpointKindNotPermitted,
        message: `Runtime URL "${rawUrl}" was rejected because endpoint kind "${kind}" is not permitted for cross-origin access. ${ENDPOINT_POLICY_FIX}`,
        detail: { kind },
      });
      return null;
    case 'private-ip-rejected':
      Diagnostics.warnRegistered({
        source,
        code: finalCodes.privateIpRejected,
        message: `Runtime URL "${rawUrl}" was rejected because it resolves to a private or reserved IP address.`,
        detail: { kind },
      });
      return null;
  }
}
