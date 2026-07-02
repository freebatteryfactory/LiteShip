// @vitest-environment node
/**
 * Diagram drift guard — the canonical `signal → boundary → graph → cast → patch` mental
 * model appears in README, GLOSSARY, and AUTHORING-MODEL. Pin the three copies
 * byte-identical so the anchor asset can't silently diverge (the exact "drift between
 * projection layers" LiteShip exists to prevent, applied to its own docs).
 */
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = process.cwd();
const FILES = ['README.md', 'GLOSSARY.md', 'AUTHORING-MODEL.md'] as const;

function diagramBlock(file: string): string {
  const src = readFileSync(join(REPO, file), 'utf8').replace(/\r\n/g, '\n');
  const match = src.match(/<!-- BEGIN DIAGRAM[^]*?-->\n([^]*?)\n<!-- END DIAGRAM -->/);
  if (!match) throw new Error(`${file}: canonical DIAGRAM block not found`);
  return match[1]!;
}

describe('canonical diagram', () => {
  test('the signal→boundary→graph→cast→patch block is byte-identical across README / GLOSSARY / AUTHORING-MODEL', () => {
    const reference = diagramBlock(FILES[0]);
    for (const file of FILES.slice(1)) {
      expect(diagramBlock(file), `${file} diagram drifted from ${FILES[0]}`).toBe(reference);
    }
  });
});
