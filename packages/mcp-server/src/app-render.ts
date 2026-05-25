/**
 * Live MCP Apps VIEW renderer (CUT D5) — the interactive widget HTML for the
 * `capsule.inspect` tool. Unlike the D4 static cards, this resource embeds a
 * minimal VIEW-side bridge script that speaks the `ui/*` postMessage dialect
 * (ext-apps 2026-01-26): it performs the `ui/initialize` handshake and renders
 * the host-injected `ui/notifications/tool-result` payload.
 *
 * Anti-theater constraints (the D5 line):
 *   - LiteShip ships ONLY the view side; the HOST owns the iframe + channel and
 *     injects the result. The server never pushes (it rejects `ui/*` with -32601).
 *   - the script does the ONLY thing the bridge needs: postMessage to the parent
 *     + same-origin DOM writes. NO network/fetch, NO eval, NO `on*=` handlers,
 *     NO remote `src`/`href`, NO persistent state.
 *   - renders via `textContent` (never innerHTML) so an injected payload cannot
 *     inject markup. Shows a waiting state before the result and a safe fallback
 *     for a malformed payload.
 *   - deterministic: the HTML is a fixed template (the data arrives at runtime).
 *
 * @module
 */

/** The view-side bridge IIFE. ES2015+ (every MCP Apps host is a modern browser iframe). */
const BRIDGE_SCRIPT = `(function () {
  const PROTOCOL = '2026-01-26';
  function post(msg) { window.parent.postMessage(msg, '*'); }
  function setStatus(text) { const el = document.getElementById('status'); if (el) { el.textContent = text; } }
  function render(toolResult) {
    const sc = toolResult && toolResult.structuredContent;
    const capsule = sc && sc.capsule;
    if (!capsule || typeof capsule.name !== 'string') { setStatus('Unable to render result.'); return; }
    const nameEl = document.getElementById('capsule-name');
    const kindEl = document.getElementById('capsule-kind');
    if (nameEl) { nameEl.textContent = capsule.name; }
    if (kindEl) { kindEl.textContent = typeof capsule.kind === 'string' ? capsule.kind : ''; }
    const detail = document.getElementById('detail');
    if (detail) { detail.hidden = false; }
    setStatus('');
  }
  window.addEventListener('message', function (event) {
    if (event.source && event.source !== window.parent) { return; }
    const data = event.data;
    if (!data || data.jsonrpc !== '2.0') { return; }
    if (data.result && data.result.protocolVersion) {
      post({ jsonrpc: '2.0', method: 'ui/notifications/initialized', params: {} });
      return;
    }
    if (data.method === 'ui/notifications/tool-result') { render(data.params); }
  });
  post({ jsonrpc: '2.0', id: 1, method: 'ui/initialize', params: { appInfo: { name: 'liteship.capsule-inspect', version: '1' }, appCapabilities: {}, protocolVersion: PROTOCOL } });
})();`;

/** The fixed interactive widget document for `ui://liteship/app/capsule-inspect`. */
export function renderCapsuleInspectWidget(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Capsule Inspect</title></head>
<body>
<h1>Capsule</h1>
<p id="status">Waiting for capsule result…</p>
<dl id="detail" hidden>
<dt>Name</dt><dd id="capsule-name"></dd>
<dt>Kind</dt><dd id="capsule-kind"></dd>
</dl>
<script>${BRIDGE_SCRIPT}</script>
</body>
</html>
`;
}
