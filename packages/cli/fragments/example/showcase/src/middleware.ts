import { liteshipMiddleware } from '@liteship/astro';

/**
 * Astro middleware -- parses Client Hints, computes device tier,
 * and injects liteship locals for downstream components.
 */
export const onRequest = liteshipMiddleware();
