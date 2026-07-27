import { Diagnostics } from '@liteship/core';
import { boundaryAttrIdentity } from '@liteship/core/authoring';
import { blankHtmlCommentsAndCodeBlocks, lineOfOffset } from './html-scan.js';
import { unresolvedPrimitiveWarning, type PrimitiveResolution } from './primitive-resolve.js';

const DATA_LITESHIP_PATTERN = /data-liteship="([^"]+)"/g;

/** Resolve one authored boundary for the source-private HTML transform engine. */
export type BoundaryResolver = (
  kind: 'boundary',
  name: string,
  fromFile: string,
  projectRoot: string,
  boundaryDir?: string,
) => Promise<PrimitiveResolution<'boundary'> | null>;

/**
 * Source-private HTML transform engine. The package entrypoint supplies the
 * real primitive resolver; tests call this closed module directly with a
 * scripted boundary capability instead of replacing a semantic module.
 */
export async function transformHTMLWithResolver(
  source: string,
  fromFile: string,
  projectRoot: string,
  boundaryDir: string | undefined,
  resolveBoundary: BoundaryResolver,
): Promise<string> {
  const scan = blankHtmlCommentsAndCodeBlocks(source);
  const matches = [...scan.matchAll(DATA_LITESHIP_PATTERN)];
  if (matches.length === 0) return source;

  let result = source;

  for (const match of matches) {
    const fullMatch = match[0]!;
    const boundaryName = match[1]!;
    const line = lineOfOffset(source, match.index ?? 0);

    const resolution = await resolveBoundary('boundary', boundaryName, fromFile, projectRoot, boundaryDir);
    if (!resolution) {
      Diagnostics.warn({
        source: 'liteship/vite.html-transform',
        code: 'boundary-not-found',
        message:
          unresolvedPrimitiveWarning('boundary', boundaryName, fromFile, line, projectRoot, boundaryDir) +
          ` Consequence: the \`data-liteship="${boundaryName}"\` attribute is left untransformed, ` +
          `so this element renders with no reactivity (no boundary state is wired up).`,
        detail: { fromFile, line, boundaryName },
      });
      continue;
    }

    const serialized = JSON.stringify(boundaryAttrIdentity(resolution.primitive));
    const replacement = `data-liteship-boundary='${serialized.replace(/'/g, '&#39;')}' data-liteship-directive="adaptive"`;
    const index = match.index ?? 0;
    result = result.slice(0, index) + replacement + result.slice(index + fullMatch.length);
  }

  return result;
}
