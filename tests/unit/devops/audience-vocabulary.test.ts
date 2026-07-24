// @vitest-environment node

import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { analyzeAudienceVocabulary, type VocabularySource } from '../../support/audience-vocabulary.js';

const source = (
  id: string,
  audience: VocabularySource['audience'],
  text: string,
  format: VocabularySource['format'] = 'prose',
): VocabularySource => ({ id, audience, text, format });

function between(text: string, start: string, end: string): string {
  const from = text.indexOf(start);
  const until = text.indexOf(end, from + start.length);
  if (from < 0 || until < 0) throw new Error(`live corpus markers missing: ${start} → ${end}`);
  return text.slice(from, until);
}

describe('audience vocabulary classifier', () => {
  test('beginner and operational product prose cannot make cast part of the task model', () => {
    const violations = analyzeAudienceVocabulary([
      source('beginner', 'beginner', 'Define the graph, then cast it.'),
      source('cli', 'operational', 'Cast failed. Recast the project.'),
    ]);
    expect(violations.map(({ code }) => code)).toEqual(['beginner-cast', 'operational-cast']);
  });

  test('expert prose permits only a verb carrying an explicit target', () => {
    expect(
      analyzeAudienceVocabulary([
        source('valid-1', 'expert', 'The definition casts to CSS.'),
        source('valid-2', 'expert', 'Cast the document graph into a WGSL target.'),
        source('valid-3', 'expert', 'The adapter may cast the projection onto the video surface.'),
      ]),
    ).toEqual([]);

    const violations = analyzeAudienceVocabulary([
      source('noun', 'expert', 'The cast emits a surface.'),
      source('bare', 'expert', 'The compiler can cast once and cache it.'),
      source('noun-target', 'expert', 'Every cast target reads the graph.'),
    ]);
    expect(violations).toHaveLength(3);
    expect(violations.every(({ code }) => code === 'expert-bare-cast')).toBe(true);
  });

  test('historical use requires an explicit provenance label', () => {
    expect(
      analyzeAudienceVocabulary([source('labelled', 'historical', 'Historically this was called a cast.')]),
    ).toEqual([]);
    expect(
      analyzeAudienceVocabulary([source('unlabelled', 'historical', 'The cast emitted a receipt.')]),
    ).toMatchObject([{ code: 'historical-cast-unlabelled' }]);
  });

  test('polysemy, identifiers, paths, code, and labelled external quotations are false positives', () => {
    expect(
      analyzeAudienceVocabulary([
        source('theatre', 'beginner', 'The theatrical cast took a bow after the play.'),
        source('typescript', 'operational', 'A TypeScript type cast can hide a signature drift.'),
        source('words', 'beginner', 'Broadcast the forecast after the show.'),
        source(
          'markdown',
          'beginner',
          [
            'Use `castContext` only in engine source.',
            'See packages/core/src/authoring/ai-cast.ts.',
            '> [external] “The cast is the whole pipeline.”',
            '```ts',
            'const cast = value as CastTarget;',
            '```',
          ].join('\n'),
          'markdown',
        ),
      ]),
    ).toEqual([]);
  });

  test('meaningful live beginner, operational, and expert slices satisfy their audience contracts', () => {
    const gettingStarted = readFileSync('GETTING-STARTED.md', 'utf8');
    const scaffoldReadme = readFileSync('packages/create-liteship/README.md', 'utf8');
    const agents = readFileSync('AGENTS.md', 'utf8');
    const glossary = readFileSync('GLOSSARY.md', 'utf8');
    const expertSentence = glossary.match(/Definitions cast to CSS/)?.[0];
    expect(expertSentence).toBeDefined();

    expect(
      analyzeAudienceVocabulary([
        source('GETTING-STARTED.md', 'beginner', gettingStarted, 'markdown'),
        source('packages/create-liteship/README.md', 'beginner', scaffoldReadme, 'markdown'),
        source('AGENTS.md#commands', 'operational', between(agents, '### Commands', '### Check profiles'), 'markdown'),
        source('GLOSSARY.md#cast-target-verb', 'expert', expertSentence!),
      ]),
    ).toEqual([]);
  });
});
