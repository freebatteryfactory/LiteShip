/**
 * Ambient types for the Cloudflare Workers runtime module.
 * Resolved at build/deploy time on workerd; absent in Node test runs.
 */
declare module 'cloudflare:workers' {
  export const env: Record<string, unknown>;
}
