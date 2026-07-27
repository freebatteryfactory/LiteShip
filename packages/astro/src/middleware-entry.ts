/**
 * Auto-wired middleware entrypoint registered by the integration via Astro's
 * `addMiddleware`. Provides zero-config capability detection: it inherits the
 * integration's `detect`/`workers` toggles through the published-toggles
 * channel and populates `Astro.locals.liteship` from Client Hints — so a consumer
 * needs no `src/middleware.ts` for the common case.
 *
 * The edge boundary cache config (`theme`/`compile`) carries FUNCTIONS, which
 * cannot ride a static integration option, so a consumer using the edge cache
 * still adds their own `src/middleware.ts` calling `liteshipMiddleware({ edge })`.
 * That one runs AFTER this `order: 'pre'` entry and refines the same locals.
 *
 * @module
 */
import type { MiddlewareHandler } from 'astro';
import { liteshipMiddleware } from './middleware.js';

/**
 * Astro middleware that runs zero-config capability detection, populating
 * `Astro.locals.liteship`. Auto-wired by the integration via `addMiddleware` when
 * `liteship({ middleware: true })`. Annotated as Astro's `MiddlewareHandler` so the
 * declaration emit doesn't leak the package-internal `MiddlewareContext` (TS4023).
 */
export const onRequest = liteshipMiddleware() as unknown as MiddlewareHandler;
