/**
 * REAL-REPO PROOF — the SOUND AST skip detector (`detectSkipsAST`) over the LIVE `tests/` tree.
 *
 * This is the anti-fragile guard that the AST detector (the cure for the token-scanner whack-a-mole)
 * is CORRECT against the real corpus, not just synthetic fixtures:
 *  - every one of the enumerated `SANCTIONED_SKIPS` is DETECTED by the AST walk AND classified
 *    CONDITIONAL (skipIf/runIf/ternary/enclosing-if) — the structural F2 proof, never `unconditional`;
 *  - ZERO false positives across the whole governed test tree (a `describe(...)` CLI command import,
 *    a `@playwright/test` `test`, a ternary `renderIt` declaration — all the cross-module + alias
 *    shapes that would flood a naive detector — stay clean exactly as the token detector leaves them);
 *  - the F2 sanctioning is STRUCTURAL: an UNCONDITIONAL `it.skip` is non-sanctionable regardless of
 *    its title; the enclosing-if / skipIf conditional forms are sanctionable.
 *
 * Pins the detector against the real repo so a regression (a new false positive, a missed sanctioned
 * site, a broken conditionality) reds here, not in a far-downstream gauntlet run.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { detectSkipsAST } from '@czap/audit';
import { SANCTIONED_SKIPS, sanctionedSkipFor, normalizeSiteLine } from '@czap/gauntlet';

const ROOT = process.cwd();

function walk(dir: string, acc: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const p = resolve(dir, entry.name);
    if (entry.isDirectory()) walk(p, acc);
    else if (entry.name.endsWith('.ts')) acc.push(p);
  }
}

describe('REAL REPO — detectSkipsAST over the whole tests/ tree', () => {
  const files: string[] = [];
  walk(resolve(ROOT, 'tests'), files);
  // Exclude tests/generated/ — the plumb-gate owns that subtree (no double-jeopardy).
  const governed = files.filter((f) => !/\/tests\/generated\//.test(f));

  it('detects every sanctioned skip + classifies it conditional + ZERO unsanctioned (no false positives)', () => {
    const detectedSanctioned = new Set<string>();
    const blocking: string[] = [];
    for (const abs of governed) {
      const rel = abs.slice(ROOT.length + 1);
      const text = readFileSync(abs, 'utf8');
      const lines = text.split('\n');
      for (const skip of detectSkipsAST(text)) {
        const rawLine = lines[skip.line - 1] ?? '';
        const sanction = sanctionedSkipFor(rel, rawLine, skip.conditional);
        if (sanction !== undefined) {
          detectedSanctioned.add(`${rel}::${normalizeSiteLine(rawLine)}`);
          // Every sanctioned skip must classify CONDITIONAL under the AST structural proof.
          expect(
            skip.conditional,
            `${rel}:${skip.line} (${skip.token}) must classify conditional, not a placeholder`,
          ).not.toBe('unconditional');
        } else {
          blocking.push(`${rel}:${skip.line} ${skip.token} [${skip.conditional}] :: ${rawLine.trim()}`);
        }
      }
    }
    // Every enumerated sanctioned site must be hit by the detector + classified conditional.
    for (const s of SANCTIONED_SKIPS) {
      const key = `${s.file}::${normalizeSiteLine(s.site)}`;
      expect(detectedSanctioned.has(key), `sanctioned site not detected/classified-conditional: ${key}`).toBe(true);
    }
    // ZERO new false positives across the live tree.
    expect(blocking, `unsanctioned skips found:\n${blocking.join('\n')}`).toEqual([]);
  });
});

describe('F2 — structural conditionality is the sanctioning proof', () => {
  const FILE = 'tests/smoke/intro-render.test.ts';
  const SITE = "it.skip('skipped — ffmpeg libx264 render probe failed (see czap doctor)', () => {});";

  it('an UNCONDITIONAL it.skip("later") is non-sanctionable via structure', () => {
    const [m] = detectSkipsAST('it.skip("later", () => {});');
    expect(m!.conditional).toBe('unconditional');
    // Even if the file+site were (maliciously) enumerated, the unconditional structure refuses it.
    expect(sanctionedSkipFor(FILE, SITE, 'unconditional')).toBeUndefined();
  });

  it('an UNCONDITIONAL it.skip("ffmpeg probe") is non-sanctionable (a title alone is not a gate, structurally)', () => {
    const [m] = detectSkipsAST('it.skip("ffmpeg probe", () => {});');
    expect(m!.conditional).toBe('unconditional');
    expect(sanctionedSkipFor(FILE, SITE, 'unconditional')).toBeUndefined();
  });

  it('a CONDITIONAL if(!FFMPEG){ it.skip(...) } is sanctionable — the AST sees the enclosing-if', () => {
    const matches = detectSkipsAST('if (!FFMPEG) {\n  it.skip("inside guard", () => {});\n}');
    expect(matches[0]!.conditional).toBe('enclosing-if');
    // The enumerated ffmpeg site, classified conditional, IS sanctioned.
    expect(sanctionedSkipFor(FILE, SITE, 'enclosing-if')).toBeDefined();
  });
});
