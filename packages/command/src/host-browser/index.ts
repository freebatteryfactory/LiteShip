/**
 * `@liteship/command/host-browser` — browser host execution + WebMCP projection.
 *
 * @module
 */
export { createBrowserCommandContext, browserSafeCommandNames } from './context.js';
export { registerWebMcpTools } from './webmcp.js';
export type { ModelContextHost, ModelContextTool, WebMcpProjectionOptions } from './webmcp.js';
