import { initSvgDirective } from '../runtime/svg.js';

export default (load: () => Promise<unknown>, _opts: Record<string, unknown>, el: HTMLElement) => {
  initSvgDirective(load, el);
};
