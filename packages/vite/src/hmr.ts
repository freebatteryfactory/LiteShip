/**
 * HMR handler for `czap:update` messages.
 *
 * Performs surgical DOM updates when `@quantize` CSS or shader
 * uniforms change during development, avoiding full page reloads.
 *
 * @module
 */

declare global {
  interface HTMLCanvasElement {
    /**
     * czap runtime-attached WebGL program for HMR uniform updates.
     * Set by the shader directive when a program is linked.
     */
    __czapProgram?: WebGLProgram;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Shape of the HMR payload the czap Vite plugin ships over the Vite
 * dev-server WebSocket. Handled by {@link handleHMR} on the client.
 */
export interface HMRPayload {
  /** Message discriminator. Always `'czap:update'`. */
  readonly type: 'czap:update';
  /** Boundary id whose compiled output changed. */
  readonly boundary: string;
  /** New compiled CSS (omitted when only uniforms changed). */
  readonly css?: string;
  /** New shader-uniform values (omitted when only CSS changed). */
  readonly uniforms?: Record<string, number>;
}

// ---------------------------------------------------------------------------
// CSS Hot Update
// ---------------------------------------------------------------------------

/**
 * Find or create a <style> element for a specific boundary's compiled CSS.
 * Uses a data attribute for identification across HMR cycles.
 */
function getOrCreateStyleElement(boundaryId: string): HTMLStyleElement {
  const selector = `style[data-czap-boundary="${boundaryId}"]`;
  const existing = document.querySelector(selector);
  if (existing instanceof HTMLStyleElement) return existing;

  const el = document.createElement('style');
  el.setAttribute('data-czap-boundary', boundaryId);
  document.head.appendChild(el);
  return el;
}

/**
 * Apply CSS updates by replacing the boundary's style element content.
 */
function applyCSSUpdate(boundary: string, css: string): void {
  const el = getOrCreateStyleElement(boundary);
  el.textContent = css;
}

// ---------------------------------------------------------------------------
// Boundary targeting
// ---------------------------------------------------------------------------

/** Resolve live satellite roots for a compiled boundary name (satelliteAttrs shape). */
function boundaryRootsFor(boundary: string): HTMLElement[] {
  const roots: HTMLElement[] = [];

  for (const el of Array.from(document.querySelectorAll<HTMLElement>(`[data-czap-boundary="${boundary}"]`))) {
    roots.push(el);
  }

  for (const el of Array.from(document.querySelectorAll<HTMLElement>('[data-czap-boundary]'))) {
    if (roots.includes(el)) continue;
    const raw = el.getAttribute('data-czap-boundary');
    if (!raw?.startsWith('{')) continue;
    try {
      const parsed = JSON.parse(raw) as { id?: string };
      if (parsed.id === boundary) roots.push(el);
    } catch {
      // Malformed boundary payloads are ignored — HMR must not throw mid-dev.
    }
  }

  for (const el of Array.from(document.querySelectorAll<HTMLElement>(`[data-czap-satellite="${boundary}"]`))) {
    if (!roots.includes(el)) roots.push(el);
  }

  return roots;
}

/** Dispatch uniform updates on the boundary root only — never bubble to `document`. */
function dispatchBoundaryUniformUpdate(target: EventTarget, uniforms: Record<string, number>): void {
  target.dispatchEvent(
    new CustomEvent('czap:uniform-update', {
      detail: { glsl: uniforms },
      bubbles: false,
    }),
  );
}

// ---------------------------------------------------------------------------
// Shader Uniform Hot Update
// ---------------------------------------------------------------------------

/**
 * Update shader uniform values on canvases within the target boundary only.
 *
 * Events are dispatched on the boundary root with `bubbles: false` so unrelated
 * `document` listeners (other GPU runtimes on the page) are not mutated.
 */
function applyUniformUpdate(boundary: string, uniforms: Record<string, number>): void {
  const boundaryRoots = boundaryRootsFor(boundary);

  for (const root of boundaryRoots) {
    dispatchBoundaryUniformUpdate(root, uniforms);
  }

  const canvases = new Set<HTMLCanvasElement>();
  for (const root of boundaryRoots) {
    for (const canvas of Array.from(root.querySelectorAll<HTMLCanvasElement>('canvas'))) {
      canvases.add(canvas);
    }
  }
  for (const canvas of Array.from(
    document.querySelectorAll<HTMLCanvasElement>(`canvas[data-czap-boundary="${boundary}"]`),
  )) {
    canvases.add(canvas);
  }

  for (const canvas of canvases) {
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) continue;

    const program = canvas.__czapProgram;
    if (!program) continue;

    for (const [name, value] of Object.entries(uniforms)) {
      const location = gl.getUniformLocation(program, name);
      if (location !== null) {
        gl.uniform1f(location, value);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Handle a czap:update HMR payload.
 * Dispatches to CSS replacement or shader uniform updates based on payload content.
 */
export function handleHMR(payload: HMRPayload): void {
  if (typeof document === 'undefined') return;

  if (payload.css !== undefined) {
    applyCSSUpdate(payload.boundary, payload.css);
  }

  if (payload.uniforms !== undefined) {
    applyUniformUpdate(payload.boundary, payload.uniforms);
  }
}
