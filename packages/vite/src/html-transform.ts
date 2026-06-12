/**
 * HTML transform -- resolves `data-czap="name"` to boundary JSON.
 *
 * Scans HTML/Astro source for `data-czap="..."` attributes, resolves
 * the named boundary via the existing boundary resolution infrastructure,
 * and replaces with `data-czap-boundary='...'` containing serialized JSON.
 *
 * @module
 */

import { Diagnostics } from '@czap/core';
import { blankHtmlCommentsAndCodeBlocks, lineOfOffset } from './html-scan.js';
import { resolvePrimitive, unresolvedPrimitiveWarning } from './primitive-resolve.js';

// Match data-czap="boundaryName" (not data-czap-* which are other attrs)
const DATA_CZAP_PATTERN = /data-czap="([^"]+)"/g;

/**
 * Transform HTML source, replacing `data-czap="name"` with resolved boundary JSON.
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
  const scan = blankHtmlCommentsAndCodeBlocks(source);
  const matches = [...scan.matchAll(DATA_CZAP_PATTERN)];
  if (matches.length === 0) return source;

  let result = source;

  for (const match of matches) {
    const fullMatch = match[0]!;
    const boundaryName = match[1]!;
    const line = lineOfOffset(source, match.index ?? 0);

    const resolution = await resolvePrimitive('boundary', boundaryName, fromFile, projectRoot, boundaryDir);
    if (!resolution) {
      Diagnostics.warn({
        source: 'czap/vite.html-transform',
        code: 'boundary-not-found',
        message: unresolvedPrimitiveWarning('boundary', boundaryName, fromFile, line, projectRoot, boundaryDir),
        detail: { fromFile, line, boundaryName },
      });
      continue;
    }

    const boundary = resolution.primitive;
    const serialized = JSON.stringify({
      id: boundary.id,
      input: boundary.input,
      thresholds: boundary.thresholds,
      states: boundary.states,
      hysteresis: boundary.hysteresis,
    });

    // Replace data-czap="name" with data-czap-boundary='...' and activate the satellite directive.
    const replacement = `data-czap-boundary='${serialized.replace(/'/g, '&#39;')}' data-czap-directive="satellite"`;
    const index = match.index ?? 0;
    result = result.slice(0, index) + replacement + result.slice(index + fullMatch.length);
  }

  return result;
}
