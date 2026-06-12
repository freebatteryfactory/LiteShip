/**
 * Character-level HTML scanning helpers for the `data-czap` macro transform.
 *
 * Mirrors the offset-preserving blanking idiom from {@link blankCssCommentsAndStrings}
 * in `css-scan.ts`: comments and code-sample contents are blanked to spaces while
 * newlines and every character offset stay 1:1 with the original source.
 *
 * @module
 */

/**
 * Blank HTML comments and `<pre>` / `<code>` block contents while preserving
 * every newline and character offset (blanked characters become spaces).
 */
export function blankHtmlCommentsAndCodeBlocks(html: string): string {
  const out = html.split('');
  let pos = 0;

  const blank = (i: number): void => {
    if (html[i] !== '\n') out[i] = ' ';
  };

  while (pos < html.length) {
    if (html.slice(pos, pos + 4) === '<!--') {
      const start = pos;
      pos += 4;
      while (pos < html.length - 2 && html.slice(pos, pos + 3) !== '-->') {
        pos++;
      }
      pos = Math.min(pos + 3, html.length);
      for (let i = start; i < pos; i++) blank(i);
      continue;
    }

    const tagMatch = html.slice(pos).match(/^<(pre|code)(\s[^>]*)?>/i);
    if (tagMatch) {
      const tag = tagMatch[1]!.toLowerCase();
      const openEnd = pos + tagMatch[0]!.length;
      const closeTag = `</${tag}>`;
      const closeIdx = html.toLowerCase().indexOf(closeTag, openEnd);
      if (closeIdx !== -1) {
        for (let i = openEnd; i < closeIdx; i++) blank(i);
        pos = closeIdx;
        continue;
      }
    }

    pos++;
  }

  return out.join('');
}

/** 1-based line number of a character offset. */
export function lineOfOffset(source: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < source.length; i++) {
    if (source[i] === '\n') line++;
  }
  return line;
}
