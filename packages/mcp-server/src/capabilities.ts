/**
 * The ONE shared server-capability source (CUT D3). Both the `initialize`
 * handshake and the `liteship://server/info` resource read this, so the
 * advertised capabilities and the resource-reported capabilities cannot drift.
 *
 * Capability law (D1 honesty discipline): a capability is declared only because
 * its methods are implemented, with the minimal honest sub-flags —
 *   - no `subscribe` (would obligate `resources/subscribe` + a server→client
 *     `notifications/resources/updated` push channel — that is D5, and it does
 *     not exist);
 *   - `listChanged: false` (the catalog is static at process start — no
 *     change-push machinery to back a `true`).
 *
 * @module
 */

/** MCP protocol revision this server speaks (lifecycle floor from D1). */
export const PROTOCOL_VERSION = '2025-11-25';

/**
 * Declared server capabilities. `resources` and `prompts` are present as of D3
 * because `resources/list`+`resources/read` and `prompts/list`+`prompts/get` are
 * implemented; sub-flags stay minimal/honest (see module note).
 */
export const SERVER_CAPABILITIES = {
  tools: { listChanged: false },
  resources: { listChanged: false },
  prompts: { listChanged: false },
  /** D10: interactive MCP Apps views may call back into tools via ui/call-tool. */
  ui: { callServerTool: true },
} as const;
