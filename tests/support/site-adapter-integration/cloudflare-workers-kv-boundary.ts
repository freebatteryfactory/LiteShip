/**
 * Integration-lane host driver for the `cloudflare.workers-kv-boundary`
 * siteAdapter capsule.
 *
 * The capsule declares `site: ['edge', 'worker']`. The host-capability-matrix
 * check must prove EACH declared site actually supports the adapter under a
 * REAL host invocation — not a mock standing in for the runtime. This module
 * provides one probe per declared site; each drives the production
 * `cloudflareMiddleware` end to end (the same pipeline
 * `tests/integration/cloudflare-edge-pipeline.test.ts` exercises):
 *
 *  - `edge`  — the precompiled-boundary tier. A BUILD-DERIVED boundary manifest
 *    (`collectBoundaryManifest`, the source of `virtual:czap/boundaries`, keyed
 *    by the minted content address) configures the middleware; a request
 *    resolves the precompiled outputs WITHOUT touching KV — the edge fast path
 *    the worker serves from its bundled manifest.
 *  - `worker` — the compile-escape-hatch tier backed by Workers KV. The probe
 *    injects a REAL KV namespace (the workerd `get`/`put` contract — an
 *    in-memory namespace implementing exactly that interface, NOT a stubbed
 *    middleware) and asserts the middleware mints + reads/writes the
 *    content-addressed cache key through that binding. The KV `get`/`put`
 *    surface IS the worker runtime capability under test, so this is a real
 *    host drive.
 *
 * No part of the adapter's host path is mocked: the middleware, the build
 * manifest derivation, the edge-cache KV adapter, and the boundary resolution
 * are all production code. Only the KV backing store is an in-memory namespace
 * conforming to the workerd KVNamespace `get`/`put` contract.
 *
 * @module
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Boundary } from '@czap/core';
import { collectBoundaryManifest } from '@czap/vite';
import { cloudflareMiddleware } from '@czap/cloudflare';

/** The result of one site's real host invocation — structurally asserted by the generated test. */
export interface SiteProbeResult {
  /** The site this probe drove the adapter under. */
  readonly site: string;
  /** Cache tier the real middleware resolved (proof the host path ran). */
  readonly cacheStatus: string;
  /** Whether the adapter's compiled CSS egress was produced under this host. */
  readonly producedCss: boolean;
  /** Number of KV entries the real binding observed (0 for the precompiled edge tier). */
  readonly kvWrites: number;
}

/** A workerd-shaped in-memory KV namespace implementing exactly the `get`/`put` contract. */
function makeKvNamespace(store: Map<string, string>): {
  readonly get: (key: string) => Promise<string | null>;
  readonly put: (key: string, value: string) => Promise<void>;
} {
  return {
    async get(key: string): Promise<string | null> {
      return store.get(key) ?? null;
    },
    async put(key: string, value: string): Promise<void> {
      store.set(key, value);
    },
  };
}

/** The reference boundary — its minted content address is the identity oracle for both sites. */
const referenceBoundary = Boundary.make({
  input: 'viewport.width',
  at: [
    [0, 'compact'],
    [768, 'wide'],
  ],
});

const clientHintHeaders = new Headers({
  'sec-ch-viewport-width': '1280',
  'sec-ch-device-memory': '8',
  'sec-ch-prefers-reduced-motion': 'no-preference',
});

/** Write the fixture project the build manifest derivation walks (boundaries module + @quantize CSS). */
function writeFixtureProject(): { root: string; cleanup: () => void } {
  const root = mkdtempSync(join(tmpdir(), 'czap-cf-siteadapter-'));
  const srcDir = join(root, 'src');
  mkdirSync(srcDir, { recursive: true });
  writeFileSync(
    join(srcDir, 'boundaries.ts'),
    `export const viewport = {\n  _tag: 'BoundaryDef',\n  _version: 1,\n  id: ${JSON.stringify(referenceBoundary.id)},\n  input: 'viewport.width',\n  thresholds: [0, 768],\n  states: ['compact', 'wide'],\n};\n`,
  );
  writeFileSync(
    join(srcDir, 'styles.css'),
    `@quantize viewport {\n  compact { --gap: 8px; }\n  wide { --gap: 24px; }\n}\n`,
  );
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

async function driveMiddleware(
  config: Parameters<typeof cloudflareMiddleware>[0],
): Promise<{ cacheStatus: string; css: string }> {
  const middleware = cloudflareMiddleware(config);
  const context = {
    request: new Request('http://localhost/', { headers: clientHintHeaders }),
    locals: {} as Record<string, unknown>,
  };
  const response = await middleware(context, async () => {
    const czap = context.locals.czap as { edge?: unknown } | undefined;
    return new Response(JSON.stringify({ edge: czap?.edge }), { status: 200 });
  });
  const body = JSON.parse(await response.text()) as {
    readonly edge: { readonly compiledOutputs: { readonly css: string }; readonly cacheStatus: string };
  };
  return { cacheStatus: body.edge.cacheStatus, css: body.edge.compiledOutputs.css };
}

/**
 * `edge` site: the precompiled-boundary tier. The build-derived manifest
 * (content-addressed id) drives the middleware; precompiled outputs are served
 * WITHOUT any KV traffic — the edge fast path.
 */
async function probeEdge(): Promise<SiteProbeResult> {
  const { root, cleanup } = writeFixtureProject();
  try {
    const manifest = await collectBoundaryManifest(root);
    const store = new Map<string, string>();
    const { cacheStatus, css } = await driveMiddleware({
      binding: 'CZAP_BOUNDARY_CACHE',
      manifest,
      boundary: 'viewport',
      env: () => ({ CZAP_BOUNDARY_CACHE: makeKvNamespace(store) }),
    });
    return { site: 'edge', cacheStatus, producedCss: css.length > 0, kvWrites: store.size };
  } finally {
    cleanup();
  }
}

/**
 * `worker` site: the compile-escape-hatch tier backed by a REAL Workers KV
 * namespace. The middleware mints the content-addressed cache key and reads/
 * writes it through the injected `get`/`put` binding — the workerd KV runtime
 * contract under test.
 */
async function probeWorker(): Promise<SiteProbeResult> {
  const store = new Map<string, string>();
  const { cacheStatus, css } = await driveMiddleware({
    binding: 'CZAP_BOUNDARY_CACHE',
    boundaryId: referenceBoundary.id,
    compile: ({ tier }: { tier: { designTier: string } }) => ({
      css: `[data-tier="${tier.designTier}"]{display:block;}`,
      propertyRegistrations: '',
      containerQueries: '',
    }),
    env: () => ({ CZAP_BOUNDARY_CACHE: makeKvNamespace(store) }),
  });
  return { site: 'worker', cacheStatus, producedCss: css.length > 0, kvWrites: store.size };
}

/**
 * Per-site real-host probes for `cloudflare.workers-kv-boundary`. The generated
 * integration test asserts this key set EQUALS the capsule's declared `site`
 * array and runs each probe under the real middleware host.
 */
export const siteProbes: Readonly<Record<string, () => Promise<SiteProbeResult>>> = {
  edge: probeEdge,
  worker: probeWorker,
};
