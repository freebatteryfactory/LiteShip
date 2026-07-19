/**
 * ffmpeg render backend — re-export of the canonical impl now in
 * `@liteship/command/host` (CUT A1 capstone-1). Kept at this path so the scene
 * render adapter resolves unchanged.
 *
 * @module
 */
export { renderWithFfmpeg } from '@liteship/command/host';
export type { RenderOpts, RenderResult } from '@liteship/command/host';
