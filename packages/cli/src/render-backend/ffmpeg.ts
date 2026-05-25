/**
 * ffmpeg render backend — re-export of the canonical impl now in
 * `@czap/command/host` (CUT A1 capstone-1). Kept at this path so the scene
 * render adapter resolves unchanged.
 *
 * @module
 */
export { renderWithFfmpeg } from '@czap/command/host';
export type { RenderOpts, RenderResult } from '@czap/command/host';
