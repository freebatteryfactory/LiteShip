/**
 * HTML transform -- resolves `data-liteship="name"` to boundary JSON.
 *
 * Scans HTML/Astro source for `data-liteship="..."` attributes, resolves
 * the named boundary via the existing boundary resolution infrastructure,
 * and replaces with `data-liteship-boundary='...'` containing serialized JSON.
 *
 * @module
 */

import { resolvePrimitive } from './primitive-resolve.js';
import { transformHTMLWithResolver } from './html-transform-engine.js';

/**
 * Transform HTML source, replacing `data-liteship="name"` with resolved boundary JSON.
 *
 * @param source - The HTML/Astro source string
 * @param fromFile - The file path of the source (for resolution context)
 * @param projectRoot - The project root directory
 * @param boundaryDir - Optional boundary definition directory (the plugin's `dirs.boundary` override)
 * @returns The transformed source, or the original if no transforms needed
 */
export async function transformHTML(
  source: string,
  fromFile: string,
  projectRoot: string,
  boundaryDir?: string,
): Promise<string> {
  return transformHTMLWithResolver(source, fromFile, projectRoot, boundaryDir, resolvePrimitive);
}
