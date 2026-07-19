/**
 * Cloudflare edge pipeline integration: build-derived manifest in, edge
 * resolution out.
 *
 * Drives the full derivation path the docs teach: a project's boundary
 * module + @quantize CSS are collected into the boundary manifest
 * (`collectBoundaryManifest`, the source of `virtual:liteship/boundaries`),
 * the manifest configures `cloudflareMiddleware`, and a request resolves
 * precompiled outputs keyed by the boundary's minted content address --
 * no hand-typed ids, no compiler in the worker path.
 */

import { afterEach, describe, expect, test } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Boundary } from '@liteship/core';
import { collectBoundaryManifest } from '@liteship/vite';
import { cloudflareMiddleware } from '@liteship/cloudflare';
import { setWorkersEnvForTesting, resetWorkersEnvForTesting } from '@liteship/cloudflare/testing';

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'liteship-cf-pipeline-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  resetWorkersEnvForTesting();
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

/** Same definition the fixture module exports -- the identity oracle. */
const referenceBoundary = Boundary.make({
  input: 'viewport.width',
  at: [
    [0, 'compact'],
    [768, 'wide'],
  ],
});

function writeFixtureProject(): string {
  const root = makeTempDir();
  const srcDir = join(root, 'src');
  mkdirSync(srcDir, { recursive: true });
  writeFileSync(
    join(srcDir, 'boundaries.ts'),
    `
export const viewport = {
  _tag: 'BoundaryDef',
  _version: 1,
  id: ${JSON.stringify(referenceBoundary.id)},
  input: 'viewport.width',
  thresholds: [0, 768],
  states: ['compact', 'wide'],
};
`,
  );
  writeFileSync(
    join(srcDir, 'styles.css'),
    `
@quantize viewport {
  compact {
    --gap: 8px;
  }
  wide {
    --gap: 24px;
  }
}
`,
  );
  return root;
}

describe('Cloudflare edge host pipeline integration', () => {
  test('build-derived manifest drives cloudflareMiddleware end to end (no hand-typed ids, no KV traffic)', async () => {
    const root = writeFixtureProject();
    const manifest = await collectBoundaryManifest(root);

    // Identity law: the manifest id IS the minted content address.
    expect(manifest['viewport']!.id).toBe(referenceBoundary.id);
    expect(manifest['viewport']!.id).toMatch(/^fnv1a:[0-9a-f]{8}$/);

    const cacheStore = new Map<string, string>();
    const middleware = cloudflareMiddleware({
      binding: 'LITESHIP_BOUNDARY_CACHE',
      manifest,
      boundary: 'viewport',
      env: () => ({
        LITESHIP_BOUNDARY_CACHE: {
          async get(key: string) {
            return cacheStore.get(key) ?? null;
          },
          async put(key: string, value: string) {
            cacheStore.set(key, value);
          },
        },
      }),
    });

    const context = {
      request: new Request('http://localhost/', {
        headers: new Headers({
          'sec-ch-viewport-width': '1280',
          'sec-ch-device-memory': '8',
          'sec-ch-prefers-reduced-motion': 'no-preference',
        }),
      }),
      locals: {} as Record<string, unknown>,
    };

    const response = await middleware(context, async () => {
      const liteship = context.locals.liteship as Record<string, unknown>;
      return new Response(JSON.stringify({ edge: (liteship as { edge?: unknown }).edge }), { status: 200 });
    });

    const body = JSON.parse(await response.text()) as {
      readonly edge: { readonly compiledOutputs: { readonly css: string }; readonly cacheStatus: string };
    };

    expect(body.edge.cacheStatus).toBe('precompiled');
    expect(body.edge.compiledOutputs.css).toContain('@container');
    expect(body.edge.compiledOutputs.css).toContain('--gap');
    // Precompiled tiers never touch KV.
    expect(cacheStore.size).toBe(0);
  });

  test('compile escape hatch still wires KV through the env binding with a real minted id', async () => {
    const cacheStore = new Map<string, string>();
    setWorkersEnvForTesting({
      LITESHIP_BOUNDARY_CACHE: {
        async get(key: string) {
          return cacheStore.get(key) ?? null;
        },
        async put(key: string, value: string) {
          cacheStore.set(key, value);
        },
      },
    });

    const middleware = cloudflareMiddleware({
      binding: 'LITESHIP_BOUNDARY_CACHE',
      boundaryId: referenceBoundary.id,
      compile: ({ tier }) => ({
        css: `[data-tier="${tier.designTier}"]{display:block;}`,
        propertyRegistrations: '',
        containerQueries: '',
      }),
      env: () => ({
        LITESHIP_BOUNDARY_CACHE: {
          async get(key: string) {
            return cacheStore.get(key) ?? null;
          },
          async put(key: string, value: string) {
            cacheStore.set(key, value);
          },
        },
      }),
    });

    const context = {
      request: new Request('http://localhost/', {
        headers: new Headers({
          'sec-ch-viewport-width': '1280',
          'sec-ch-device-memory': '8',
          'sec-ch-prefers-reduced-motion': 'no-preference',
        }),
      }),
      locals: {} as Record<string, unknown>,
    };

    const response = await middleware(context, async () => {
      const liteship = context.locals.liteship as Record<string, unknown>;
      return new Response(JSON.stringify({ edge: (liteship as { edge?: unknown }).edge }), { status: 200 });
    });

    const body = JSON.parse(await response.text()) as {
      readonly edge: { readonly compiledOutputs: { readonly css: string }; readonly cacheStatus: string };
    };

    expect(body.edge.compiledOutputs.css).toContain('[data-tier=');
    expect(['hit', 'miss']).toContain(body.edge.cacheStatus);
    expect(cacheStore.size).toBe(1);
    // KV keys are content-addressed with the minted id.
    expect([...cacheStore.keys()][0]).toContain(referenceBoundary.id);
  });
});
