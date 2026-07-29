/**
 * Resolve one page-authored reference under the Cloudflare dev harness's
 * fetch authority. Only same-origin HTTP(S) resources are admissible; every
 * executable or opaque scheme is refused by construction.
 */
export function resolveSameOriginHttpReference(base: URL, source: string): URL | null {
  if (source.length === 0) return null;
  let resolved: URL;
  try {
    resolved = new URL(source, base);
  } catch {
    return null;
  }
  if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return null;
  return resolved.origin === base.origin ? resolved : null;
}
