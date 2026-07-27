/**
 * The dev-inspector overlay's CSS — one shadow-scoped stylesheet string, kept
 * apart from the DOM machinery so the panel modules read as structure, not style.
 *
 * @module
 */

/** The shadow-scoped CSS for the inspector panel. Injected as a `<style>` on mount. */
export function styles(): string {
  return `
:host { all: initial; }
.panel {
  position: fixed;
  bottom: 16px;
  right: 16px;
  width: min(420px, calc(100vw - 32px));
  max-height: min(70vh, 640px);
  overflow: auto;
  background: #0f1117;
  color: #e8eaed;
  border: 1px solid #3c4048;
  border-radius: 10px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.45);
  font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  z-index: 2147483646;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #3c4048;
  user-select: none;
}
.header h2 { margin: 0; font-size: 13px; font-weight: 600; }
.close { background: transparent; border: 0; color: #9aa0a6; cursor: pointer; font-size: 16px; }
.body { padding: 10px 12px 14px; display: grid; gap: 12px; }
.boundary {
  border: 1px solid #2a2f3a;
  border-radius: 8px;
  padding: 10px;
  background: #151922;
}
.boundary-head { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
.boundary-title { font-weight: 600; }
.badges { display: flex; gap: 6px; flex-wrap: wrap; }
.badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px solid #5f6368;
  color: #bdc1c6;
}
.badge-warn { border-color: #f9ab00; color: #fdd663; }
.badge-inert { border-color: #ea4335; color: #f28b82; }
.meta { color: #9aa0a6; margin-bottom: 8px; }
.state-live { color: #8ab4f8; font-weight: 600; }
.track {
  position: relative;
  height: 36px;
  margin: 8px 0 18px;
  border-radius: 6px;
  background: linear-gradient(90deg, #1f2430 0%, #252b38 100%);
  border: 1px solid #303643;
}
.region-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #9aa0a6;
  margin-top: 4px;
}
.notch {
  position: absolute;
  top: -4px;
  width: 10px;
  height: 44px;
  margin-left: -5px;
  background: #8ab4f8;
  border-radius: 3px;
  cursor: ew-resize;
}
.notch-fixed { background: #5f6368; cursor: default; }
.cursor {
  position: absolute;
  top: 0;
  width: 2px;
  height: 100%;
  background: #34a853;
  pointer-events: none;
}
.actions { display: flex; gap: 8px; margin-top: 8px; }
button.copy {
  background: #1a73e8;
  color: #fff;
  border: 0;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  font: inherit;
}
.note { color: #f9ab00; font-size: 11px; margin-top: 6px; }
.empty { color: #9aa0a6; padding: 8px 0; }
details.section { margin-top: 8px; border-top: 1px solid #2a2f3a; padding-top: 6px; }
details.section > summary {
  cursor: pointer;
  color: #bdc1c6;
  font-weight: 600;
  font-size: 11px;
  list-style: none;
  user-select: none;
}
details.section > summary::-webkit-details-marker { display: none; }
details.section > summary::before { content: '▸ '; color: #5f6368; }
details.section[open] > summary::before { content: '▾ '; }
.cast-target { margin: 6px 0 2px; }
.cast-target-name { color: #8ab4f8; font-weight: 600; }
.cast-evidence { color: #9aa0a6; font-size: 10px; }
.cast-rows { margin: 2px 0 0 12px; color: #e8eaed; }
.cast-rows .row { font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cast-none { color: #9aa0a6; font-size: 11px; }
.esc-line { margin: 3px 0; }
.esc-tier { color: #34a853; font-weight: 600; }
.esc-tier-err { color: #f28b82; font-weight: 600; }
.esc-reason { color: #9aa0a6; font-size: 10px; margin-top: 2px; }
.graph-node { font-size: 11px; margin: 2px 0; }
.graph-fam { display: inline-block; min-width: 78px; color: #fdd663; }
.graph-id { color: #5f6368; font-size: 10px; }
.graph-edges { margin-top: 6px; color: #9aa0a6; font-size: 10px; }
.panel-disclaimer { color: #9aa0a6; font-size: 10px; font-style: italic; margin-top: 4px; }
`.trim();
}
