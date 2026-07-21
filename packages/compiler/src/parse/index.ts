/**
 * `@liteship/compiler/parse` — the shared character-level CSS scanner, relocated
 * DOWN into the compiler (it is the leaf CSS-parse counterpart to the compiler's
 * CSS-emit surface). vite's at-rule block parsers and the P14 `migrate` adapters
 * both draw foreign-CSS tokenization from here, so it must sit below vite (which
 * deps on `@liteship/compiler`). Pure named re-export facade — no declarations.
 *
 * @module
 */

export {
  blankCssCommentsAndStrings,
  parseFlatDeclarations,
  cssPrologueEnd,
  skipWsAndComments,
  skipSegment,
  braceDepthDelta,
  lineOfOffset,
} from './css-scan.js';
export { normalizeCssLineEndings } from './normalize-css-eol.js';
