/**
 * Streamable-HTTP docs MCP route helper (#113).
 *
 * @module
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** One hashed file entry inside a docs-bundle manifest. */
export interface DocsBundleManifestEntry {
  readonly path: string;
  readonly sha256: string;
  readonly bytes: number;
}

/** Content-addressed docs-bundle manifest produced by `pnpm run docs:bundle`. */
export interface DocsBundleManifest {
  readonly version: string;
  readonly generatedAt: string;
  readonly entries: readonly DocsBundleManifestEntry[];
  readonly bundleId: string;
}

/** Loaded docs bundle: sealed manifest plus a path→body reader. */
export interface DocsMcpBundle {
  readonly manifest: DocsBundleManifest;
  readonly readDoc: (path: string) => string | null;
}

/** MCP tool response shape returned by {@link docsMcpRoute}. */
export interface DocsMcpToolResult {
  readonly content: readonly { readonly type: 'text'; readonly text: string }[];
}

/** Load a bundle directory produced by `pnpm run docs:bundle`. */
export function loadDocsMcpBundle(bundleDir: string): DocsMcpBundle {
  const manifest = JSON.parse(readFileSync(join(bundleDir, 'manifest.json'), 'utf8')) as DocsBundleManifest;
  const filesDir = join(bundleDir, 'files');
  return {
    manifest,
    readDoc: (path: string) => {
      const entry = manifest.entries.find((e) => e.path === path);
      if (!entry) return null;
      // Entry present in the sealed manifest but missing on disk is corruption —
      // throw loudly. Mapping I/O failure to null would launder integrity loss
      // into "unknown doc" at the route.
      return readFileSync(join(filesDir, path.replace(/[\\/]/g, '__')), 'utf8');
    },
  };
}

function jsonRpc(id: unknown, result: unknown): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id, result }), {
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * Minimal MCP-over-HTTP handler for docs tools: `docs/list`, `docs/search`, `docs/get`.
 * Accepts POST with JSON-RPC body; returns structured JSON (not stdio NDJSON).
 */
export function docsMcpRoute(bundle: DocsMcpBundle): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }
    let body: { id?: unknown; method?: string; params?: Record<string, unknown> };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return jsonRpc(null, { error: { code: -32700, message: 'Parse error' } });
    }

    const { id, method, params } = body;
    if (method === 'docs/list') {
      const paths = bundle.manifest.entries.map((e) => e.path);
      return jsonRpc(id, { paths, bundleId: bundle.manifest.bundleId });
    }
    if (method === 'docs/get') {
      const path = String(params?.path ?? '');
      const text = bundle.readDoc(path);
      if (text === null) return jsonRpc(id, { error: { code: -32602, message: `Unknown doc: ${path}` } });
      return jsonRpc(id, { path, text });
    }
    if (method === 'docs/search') {
      const query = String(params?.query ?? '').toLowerCase();
      const hits = bundle.manifest.entries
        .map((e) => e.path)
        .filter((p) => p.toLowerCase().includes(query))
        .slice(0, 50);
      return jsonRpc(id, { hits });
    }
    return jsonRpc(id, { error: { code: -32601, message: `Method not found: ${method}` } });
  };
}
