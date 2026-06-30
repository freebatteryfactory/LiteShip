/**
 * A6 — the Cell↔DOM boundary is a hard structural law. The reactive value
 * primitives are value→wire, never value→DOM: DOM *application* lives only in
 * @czap/web `Morph`. This guard pins that seam at the source so a future agent
 * can't quietly grow a `el.textContent = …` write into the core value layer.
 *
 * Two tiers:
 *   • STRICT no-DOM — cell/store/derived/live-cell carry zero DOM vocabulary at
 *     all (not even a read); they are pure value graph.
 *   • OUTPUT-SINK — signal/zap may *read* the platform (scroll/pointer values,
 *     `addEventListener`, ADR-0005 Cat-3 input seam) but must never *write/bind*
 *     a value into the DOM. We ban only the write sinks, after stripping
 *     comments so a doc-comment example (`document.getElementById`) or the word
 *     "documented" doesn't false-fire.
 *
 * Idiom mirrors a1-seam-integrity.test.ts: read the real source, assert it does
 * NOT match the forbidden shape, and prove the matcher BITES on a planted line.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO = resolve(import.meta.dirname, '..', '..', '..');
const CORE_SRC = resolve(REPO, 'packages/core/src');

function read(file: string): string {
  return readFileSync(resolve(CORE_SRC, file), 'utf8');
}

/**
 * Strip block (`/* *​/`) and line (`//`) comments so the OUTPUT-SINK matcher
 * sees only executable code. Conservative: the line-comment pass skips `://`
 * (e.g. `https://`) so a URL never decapitates a real line.
 */
function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

// STRICT tier: zero DOM vocabulary, reads included. \bElement\b also covers
// HTMLElement-family identifiers; \bdocument\b/\bwindow\b ban platform globals.
const STRICT_DOM =
  /document|window|querySelector|getElementById|createElement|innerHTML|textContent|setAttribute|appendChild|HTMLElement|\bElement\b/;

// OUTPUT-SINK tier: only value→DOM WRITE/BIND sinks. addEventListener and
// scroll/pointer/window reads are deliberately ABSENT — they're the sanctioned
// input-side seam (ADR-0005 Cat-3).
const DOM_SINK =
  /querySelector|getElementById|createElement|innerHTML|\.textContent\s*=|setAttribute|appendChild|\.append\(/;

const STRICT_FILES = ['cell.ts', 'store.ts', 'derived.ts', 'live-cell.ts'];
const SINK_FILES = ['signal.ts', 'zap.ts'];

describe('A6 — Cell↔DOM boundary (value→wire, never value→DOM)', () => {
  describe('STRICT no-DOM tier — the value graph carries zero DOM vocabulary', () => {
    for (const file of STRICT_FILES) {
      it(`${file} matches no DOM token at all`, () => {
        expect(read(file)).not.toMatch(STRICT_DOM);
      });
    }
  });

  describe('OUTPUT-SINK tier — signal/zap may read the platform but never write the DOM', () => {
    for (const file of SINK_FILES) {
      it(`${file} (code-only) matches no value→DOM write sink`, () => {
        expect(codeOnly(read(file))).not.toMatch(DOM_SINK);
      });
    }

    it('the input-side seam stays legal (addEventListener / window reads are NOT banned)', () => {
      // Guard the guard: the sink matcher must let the sanctioned reads through,
      // otherwise the OUTPUT-SINK assertions above would be vacuously strict.
      expect("element.addEventListener('scroll', h)").not.toMatch(DOM_SINK);
      expect('const y = window.scrollY').not.toMatch(DOM_SINK);
    });
  });

  describe('BITE — the matchers actually catch a planted violation', () => {
    it('STRICT_DOM bites a planted DOM read', () => {
      expect("const x = document.querySelector('#a')").toMatch(STRICT_DOM);
    });

    it('DOM_SINK bites a planted value→DOM write', () => {
      expect("el.textContent = String(value)").toMatch(DOM_SINK);
      expect("root.appendChild(node)").toMatch(DOM_SINK);
    });

    it('DOM_SINK does NOT bite a doc-comment sink once comments are stripped', () => {
      const planted = "/** example: document.getElementById('btn') */\nexport const z = 1;";
      expect(read('zap.ts')).toContain("getElementById('btn')"); // it really is in zap.ts (a doc comment)
      expect(codeOnly(planted)).not.toMatch(DOM_SINK);
    });
  });
});
