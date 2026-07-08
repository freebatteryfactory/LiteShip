/**
 * The HOST-INJECTED LiteShip TAINT REGISTRY — the LiteShip-LOCAL source / sink /
 * sanitizer classification the CLI injects into `@czap/audit`'s GENERIC taint
 * oracle (the ADR-0012 / D7b boundary).
 *
 * The audit taint oracle (`buildRepoIRTaint`) traces dataflow but references NO
 * LiteShip-specific name — it takes the classification as a parameter. THIS module
 * is that parameter: it names LiteShip's REAL untrusted-input seams (from the
 * recon), so the engine stays downstream-installable while the LiteShip policy
 * lives with the host that legitimately knows it. A downstream project composes its
 * OWN registry the same way — no fork, no rebuild.
 *
 * The seams (the visual-compiler's actual untrusted boundaries, NOT a generic
 * web-app taint set):
 *
 * SOURCES — where an untrusted value enters:
 *   • `fetch` — a network fetch (the GLSL/WGSL shader-source fetch, a WASM module
 *     fetch, an SSE snapshot/replay fetch). The returned text/response is untrusted.
 *   • `readFileSync` / `readFile` — a file read (path-traversal / untrusted-content
 *     surface on the Node/CLI side).
 *   • `process.env` is read as a property, not a call — handled as an env-source
 *     identifier is out of THIS oracle's call-classified scope (documented limit);
 *     the network + file + AI-proposal sources are the live visual-compiler seams.
 *
 * SINKS — the dangerous operations:
 *   • `shaderSource` / `compileShader` — WebGL2 GLSL compilation (an injection sink).
 *   • `createShaderModule` — WebGPU WGSL compilation (an injection sink).
 *   • `eval` / `Function` — code execution.
 *   • `applyValidatedPatch` / `apply` — the AI-cast graph-apply into the LIVE
 *     runtime (the untrusted-apply seam — a GraphPatch reaching the live graph).
 *   • `innerHTML` / `outerHTML` — a DOM-injection ASSIGNMENT sink (matched as the
 *     assignment-target property, not a call).
 *
 * SANITIZERS — the validators that BREAK the taint (the guarded boundaries):
 *   • `validateGraphPatchProposal` — the AI-cast proposal VALIDATION (re-seal,
 *     re-stamp, structural validate, mint the unforgeable ValidatedProposal). The
 *     ONLY path to a proposal `applyValidatedPatch` will accept — so an AI-cast
 *     value that crosses it is sanitized.
 *   • `validateGeneratedUITree` / `validateGeneratedUIProposal` — the genui proposal
 *     validation (host-catalog validate, prototype-poison guard).
 *   • `resolveRuntimeUrl` / `allowRuntimeEndpointUrl` — the runtime-URL SSRF guard
 *     (origin / private-IP / protocol allowlist) — so a URL/shader-src that crosses
 *     it is sanitized before the fetch.
 *   • `verifyShaderIntegrity` — the shader CONTENT-integrity guard (SRI sha256 of
 *     the fetched shader bytes vs the author-pinned hash) — the CONTENT sibling of
 *     the URL guard. The runtime compiles the value it returns, so the fetched
 *     bytes that reach `gl.shaderSource` / `createShaderModule` are verified.
 *   • `sanitizeElementTree` / `createHtmlFragment` / `resolveHtmlString` — the HTML
 *     trust policy (strip dangerous tags / attributes) — so HTML that crosses it is
 *     sanitized before an innerHTML write.
 *
 * This is DATA the CLI injects; it carries no logic. The oracle does the tracing.
 *
 * @module
 */
import type { TaintRegistry } from '@czap/audit';

/**
 * Callee NAMES whose RETURN value is an untrusted SOURCE in LiteShip. Matched
 * against a call expression's callee (a bare id or a member name). `fetch` is the
 * headline visual-compiler source (shader-source / WASM / snapshot fetch).
 */
const LITESHIP_TAINT_SOURCES: readonly string[] = [
  // Network — the shader-source / WASM / SSE-snapshot fetch. The returned response
  // (and its `.text()` / `.arrayBuffer()`) is untrusted.
  'fetch',
  // File reads (the Node/CLI path-traversal + untrusted-content surface).
  'readFile',
  'readFileSync',
];

/**
 * Callee NAMES that are dangerous SINKS — a tainted value reaching one of their
 * ARGUMENTS is a flow. These are the visual-compiler's real injection / apply /
 * exec seams.
 */
const LITESHIP_TAINT_SINKS: readonly string[] = [
  // GPU shader compilation — the GLSL/WGSL injection surface.
  'shaderSource',
  'compileShader',
  'createShaderModule',
  // Code execution.
  'eval',
  'Function',
  // DOM HTML injection via method call (sibling to assignment sinks below).
  'insertAdjacentHTML',
  'document.write',
  'document.writeln',
  // The AI-cast graph-apply into the LIVE runtime (the untrusted-apply seam).
  'applyValidatedPatch',
  'apply',
  // Process exec (the Node/CLI side — a dynamic command is a flow). DELIBERATELY
  // only the `*Sync` forms: bare `exec` / `spawn` collide by NAME with `RegExp.exec`
  // and similar member methods (the published src has dozens of `<re>.exec(...)`
  // calls and ZERO `child_process.exec` runtime calls), so including them yields only
  // name-collision false positives. This is a HOST-POLICY tightening of a known
  // name-based-taint imprecision — the generic oracle stays name-matched; the host
  // chooses which names are worth the collision risk. `execSync` / `spawnSync` have
  // no common member-method collision.
  'execSync',
  'spawnSync',
];

/**
 * Assignment-TARGET property names that are SINKS when assigned a tainted value —
 * the DOM-injection assignment seam (`el.innerHTML = tainted`). Distinct from the
 * call sinks because the dangerous operation is a property assignment.
 */
const LITESHIP_TAINT_ASSIGNMENT_SINKS: readonly string[] = ['innerHTML', 'outerHTML'];

/**
 * Callee NAMES that SANITIZE — a value crossing one of these has its taint BROKEN.
 * These are LiteShip's real validators: the AI-cast proposal validation, the genui
 * proposal validation, the runtime-URL SSRF guard, and the HTML trust policy.
 */
const LITESHIP_TAINT_SANITIZERS: readonly string[] = [
  // The AI-cast graph-patch proposal VALIDATION (the unforgeable-token mint).
  'validateGraphPatchProposal',
  // The genui proposal validation (host-catalog validate, prototype-poison guard).
  'validateGeneratedUITree',
  'validateGeneratedUIProposal',
  // The runtime-URL SSRF guard (origin / private-IP / protocol allowlist).
  'resolveRuntimeUrl',
  'allowRuntimeEndpointUrl',
  // The shader CONTENT-integrity guard (SRI sha256 of the fetched shader bytes vs
  // the author-pinned hash, BEFORE `gl.shaderSource` / `createShaderModule`). The
  // CONTENT sibling of the URL guard above: `resolveRuntimeUrl` sanitizes the URL
  // (the ORIGIN); THIS sanitizes the fetched BYTES (the CONTENT). The GLSL/WGSL
  // runtimes compile the value this returns (`verification.content`), so a shader
  // reaching the GPU has provably been verified — the fetch→verify→compile flow is
  // genuinely SANITIZED, not softened.
  'verifyShaderIntegrity',
  // The HTML trust policy (strip dangerous tags / attributes).
  'sanitizeElementTree',
  'createHtmlFragment',
  'resolveHtmlString',
];

/**
 * Human notes per classified callee — the WHY carried into each flow endpoint's
 * `note` (so the finding reads without re-deriving why a site is a source/sink).
 */
const LITESHIP_TAINT_NOTES: Readonly<Record<string, string>> = {
  fetch: 'a network fetch — the returned shader-source / WASM / snapshot bytes are untrusted',
  readFile: 'a file read — untrusted file content / path-traversal surface',
  readFileSync: 'a file read — untrusted file content / path-traversal surface',
  shaderSource: 'WebGL2 GLSL shader compilation — a shader-injection sink',
  compileShader: 'WebGL2 GLSL shader compilation — a shader-injection sink',
  createShaderModule: 'WebGPU WGSL shader compilation — a shader-injection sink',
  eval: 'dynamic code execution',
  Function: 'dynamic code execution (the Function constructor)',
  applyValidatedPatch: 'the AI-cast graph-apply into the LIVE runtime — an untrusted-apply sink',
  apply: 'a graph-patch apply into the live document graph',
  execSync: 'a child-process exec — a command-injection sink',
  spawnSync: 'a child-process spawn — a command-injection sink',
  innerHTML: 'a DOM innerHTML assignment — an HTML-injection sink',
  outerHTML: 'a DOM outerHTML assignment — an HTML-injection sink',
  insertAdjacentHTML: 'a DOM insertAdjacentHTML call — an HTML-injection sink',
  'document.write': 'a document.write call — an HTML-injection sink',
  'document.writeln': 'a document.writeln call — an HTML-injection sink',
};

/**
 * The LiteShip taint registry — the host-injected source/sink/sanitizer
 * classification handed to `@czap/audit`'s `buildRepoIRTaint`. Frozen sets for
 * O(1) classification + immutability (the registry is DATA, never mutated).
 */
export const LITESHIP_TAINT_REGISTRY: TaintRegistry = {
  sources: new Set(LITESHIP_TAINT_SOURCES),
  sinks: new Set(LITESHIP_TAINT_SINKS),
  assignmentSinkNames: new Set(LITESHIP_TAINT_ASSIGNMENT_SINKS),
  sanitizers: new Set(LITESHIP_TAINT_SANITIZERS),
  notes: LITESHIP_TAINT_NOTES,
};
