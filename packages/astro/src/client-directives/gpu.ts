import { initGPUDirective } from '../runtime/gpu.js';

// `opts` is the directive value: `client:gpu={{ force: true }}` boots the
// shader even in low/headless tiers (see initGPUDirective's force escape hatch).
export default (load: () => Promise<unknown>, opts: Record<string, unknown>, el: HTMLElement) => {
  initGPUDirective(load, el, opts);
};
