import { initGraphDirective } from '../runtime/graph-directive.js';

export default (load: () => Promise<unknown>, _opts: Record<string, unknown>, el: HTMLElement) => {
  initGraphDirective(load, el);
};
