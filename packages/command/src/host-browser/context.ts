/**
 * Browser host execution for the command registry.
 *
 * Mirrors the Node host boundary (`@czap/command/host`) with browser APIs.
 * Heavy tools delegate to an optional MCP HTTP server when configured.
 *
 * @module
 */
import type { CommandContext } from '../registry.js';

const BROWSER_SAFE_COMMANDS = new Set(['capsule.inspect', 'capsule.list', 'glossary']);

async function mcpToolCall(
  serverUrl: string,
  name: string,
  args: Record<string, unknown>,
): Promise<{ payload: unknown; failed: boolean }> {
  const response = await fetch(serverUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name, arguments: args },
    }),
  });
  const body = (await response.json()) as {
    result?: { structuredContent?: unknown; isError?: boolean };
    error?: unknown;
  };
  if (body.error) return { payload: body.error, failed: true };
  return { payload: body.result?.structuredContent ?? null, failed: !!body.result?.isError };
}

/**
 * Build a browser {@link CommandContext}. Manifest is supplied in-memory;
 * vitest/ffmpeg/fs paths are unavailable; heavy commands delegate to `mcpServerUrl`.
 */
export function createBrowserCommandContext(
  opts: {
    readonly manifestSource?: () => string | null;
    readonly mcpServerUrl?: string;
  } = {},
): CommandContext {
  return {
    manifestSource: opts.manifestSource,
    fileExists: () => false,
    readFileBytes: () => null,
    loadAssetBytes: () => null,
    loadSceneModule: async () => null,
    runVitest: async () => ({ exitCode: 1, stderrTail: 'vitest unavailable in browser host' }),
    runSceneCompile: async () => undefined,
    renderScene: opts.mcpServerUrl
      ? async (params) => {
          const remote = await mcpToolCall(
            opts.mcpServerUrl!,
            'scene.render',
            params as unknown as Record<string, unknown>,
          );
          if (remote.failed) {
            throw new Error(
              `scene.render delegation to ${opts.mcpServerUrl} failed: ${JSON.stringify(remote.payload)} — is the MCP HTTP server running (\`czap mcp --http=PORT\`)?`,
            );
          }
          const payload = remote.payload as { frameCount?: number; elapsedMs?: number } | null;
          return { frameCount: payload?.frameCount ?? 0, elapsedMs: payload?.elapsedMs ?? 0 };
        }
      : undefined,
    runAudioProjection: async () => 0,
    hostVersion: () => 'browser',
    spawnCapture: async () => ({ exitCode: 1, stdout: '' }),
  };
}

/** Commands safe to register directly in a browser WebMCP surface without delegation. */
export function browserSafeCommandNames(): readonly string[] {
  return [...BROWSER_SAFE_COMMANDS];
}
