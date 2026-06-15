import { initGPUDirective } from '../runtime/gpu.js';

// Astro hands custom client directives their expression on `opts.value`
// (`client:gpu={{ force: true }}` → `{ name: 'gpu', value: { force: true } }`),
// matching its built-in directives. The `?? opts` fallback also accepts a value
// passed directly (the plain-div boot scanner / unit tests). `{ force: true }`
// boots the shader even in low/headless tiers (see the initGPUDirective force
// escape hatch).
export default (load: () => Promise<unknown>, opts: Record<string, unknown>, el: HTMLElement) => {
  const value = (opts?.['value'] ?? opts) as Record<string, unknown> | undefined;
  initGPUDirective(load, el, value);
};
