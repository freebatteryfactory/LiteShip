/**
 * Dev-mode inspector keyboard loader.
 *
 * Registers Alt+Shift+C and dynamically imports the overlay module on
 * first toggle so pages that never open the inspector pay no parse cost.
 *
 * @module
 */

const POSITION_STORAGE_KEY = 'czap.inspector.position';

/** sessionStorage key for the draggable inspector panel position. */
export function inspectorPositionStorageKey(): string {
  return POSITION_STORAGE_KEY;
}

let installed = false;

/** Register the Alt+Shift+C toggle handler (idempotent). */
export function installInspectorLoader(): void {
  if (installed || typeof window === 'undefined') {
    return;
  }
  installed = true;

  window.addEventListener(
    'keydown',
    (event) => {
      if (!event.altKey || !event.shiftKey || event.code !== 'KeyC') {
        return;
      }
      event.preventDefault();
      void import('./inspector.js').then(({ toggleInspectorOverlay }) => {
        toggleInspectorOverlay();
      });
    },
    { capture: true },
  );
}
