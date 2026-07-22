/**
 * Streamable-HTTP docs MCP route helper (#113).
 *
 * @module
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Diagnostics } from '@liteship/core';
import { ValidationError } from '@liteship/error';
import { computeBundleId } from './docs-bundle-id.js';

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
  const raw = JSON.parse(readFileSync(join(bundleDir, 'manifest.json'), 'utf8')) as DocsBundleManifest;
  const computedId = computeBundleId(raw.entries);
  if (computedId !== raw.bundleId) {
    throw ValidationError(
      'loadDocsMcpBundle',
      `docs-bundle-id-mismatch: manifest bundleId does not match recomputed hash from entries (expected ${computedId}, got ${raw.bundleId})`,
    );
  }
  const manifest: DocsBundleManifest = { ...raw, bundleId: computedId };
  const filesDir = join(bundleDir, 'files');
  return {
    manifest,
    readDoc: (path: string) => {
      const entry = manifest.entries.find((e) => e.path === path);
      if (!entry) return null;
      // Entry present in the sealed manifest but missing on disk is corruption —
      // throw loudly. Mapping I/O failure to null would launder integrity loss
      // into "unknown doc" at the route.
      const bytes = readFileSync(join(filesDir, path.replace(/[\\/]/g, '__')));
      // The bundle is content-addressed: bytes that no longer hash to the sealed
      // manifest entry are the same corruption as a missing file — throw, don't
      // serve content that silently drifted from the bundleId.
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      if (sha256 !== entry.sha256) {
        throw ValidationError(
          'loadDocsMcpBundle',
          `doc "${path}" on disk does not match its sealed manifest hash (expected sha256 ${entry.sha256}, got ${sha256}) — the bundle drifted after docs:bundle`,
        );
      }
      return bytes.toString('utf8');
    },
  };
}

function jsonRpc(id: unknown, result: unknown): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id, result }), {
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * JSON-RPC 2.0 error response. The failure lives in the TOP-LEVEL `error`
 * member — never nested under `result` — so spec-conformant MCP clients read
 * it as a failure instead of laundering it into a success envelope (Law 1: no
 * silent drift). Every response is `error` XOR `result`, never both. HTTP 200
 * is correct for JSON-RPC-over-HTTP: the transport succeeded; the RPC did not.
 */
function jsonRpcError(id: unknown, code: number, message: string, data?: unknown): Response {
  return new Response(
    JSON.stringify({ jsonrpc: '2.0', id, error: { code, message, ...(data !== undefined ? { data } : {}) } }),
    { headers: { 'content-type': 'application/json' } },
  );
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
      // Per JSON-RPC 2.0, a parse error uses id: null (the id could not be read).
      return jsonRpcError(null, -32700, 'Parse error');
    }

    const { id, method, params } = body;
    if (method === 'docs/list') {
      const paths = bundle.manifest.entries.map((e) => e.path);
      return jsonRpc(id, { paths, bundleId: bundle.manifest.bundleId });
    }
    if (method === 'docs/get') {
      const path = String(params?.path ?? '');
      let text: string | null;
      try {
        text = bundle.readDoc(path);
      } catch (error) {
        // Bundle corruption (manifest-listed file missing or hash-drifted) stays
        // LOUD — a diagnostic names the real failure — but the route boundary
        // answers with a structured JSON-RPC internal error instead of letting
        // the raw throw escape as a framework 500 (with a stack) to the client.
        Diagnostics.warnRegistered({
          source: 'liteship/astro.docs-mcp-route',
          code: 'astro/docs-mcp-route/docs-bundle-corruption',
          message:
            `docs/get "${path}" failed reading the sealed bundle: ` +
            `${error instanceof Error ? error.message : String(error)}. ` +
            'Rebuild the bundle with `pnpm run docs:bundle` and redeploy.',
        });
        return jsonRpcError(id, -32603, `Internal error: docs bundle integrity failure for ${path}`);
      }
      if (text === null) return jsonRpcError(id, -32602, `Unknown doc: ${path}`);
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
    return jsonRpcError(id, -32601, `Method not found: ${method}`);
  };
}
