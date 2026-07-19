/**
 * JSON-Schema parity fixture — the byte-parity cage over the CURRENT Effect-AST
 * deriver (packages/core/src/json-schema-from-schema.ts) captured BEFORE any
 * schema producer changes.
 *
 * Three laws:
 *   - the capture is DETERMINISTIC (re-run ⟹ byte-identical);
 *   - it covers EXACTLY the derived slots — every handler-backed command
 *     descriptor's inputSchema + outputSchema (the 13 command files'
 *     `schemaToJsonSchema` call sites), and nothing hand-authored;
 *   - the committed fixture is FRESH (regenerate via
 *     scripts/capture-json-schema-parity.ts; a stale copy fails here).
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import {
  buildParityFixtureContent,
  buildParityMap,
  FIXTURE_RELATIVE_PATH,
} from '../../../scripts/capture-json-schema-parity.js';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

describe('json-schema parity fixture', () => {
  it('is deterministic: two builds produce byte-identical content', () => {
    expect(buildParityFixtureContent()).toBe(buildParityFixtureContent());
  });

  it('covers every handler-backed descriptor slot (18 handlers → inputSchema + outputSchema)', () => {
    const keys = Object.keys(buildParityMap());
    expect(keys.filter((k) => k.endsWith('#inputSchema')).length).toBe(18);
    expect(keys.filter((k) => k.endsWith('#outputSchema')).length).toBe(18);
    expect(keys.length).toBe(36);
  });

  it('every captured value is the stableSerialize canonical form (key-sorted object, "type" after "properties")', () => {
    const map = buildParityMap();
    const version = map['version#outputSchema'];
    expect(version).toBe(
      '{"properties":{"liteship":{"type":"string"},"node":{"type":"string"},"pnpm":{"type":["string","null"]}},"required":["liteship","node","pnpm"],"type":"object"}',
    );
  });

  it('the committed fixture is fresh (regenerate with scripts/capture-json-schema-parity.ts)', () => {
    const onDisk = readFileSync(resolve(repoRoot, FIXTURE_RELATIVE_PATH), 'utf8');
    expect(onDisk).toBe(buildParityFixtureContent());
  });
});
