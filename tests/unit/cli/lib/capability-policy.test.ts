import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { SANCTIONED_SKIPS } from '@czap/gauntlet';
import { resolveCapabilitySites } from '../../../../packages/cli/src/lib/capability-policy.js';

function writeSanctionedSkipFixture(root: string, duplicateFile?: string): void {
  const byFile = new Map<string, string[]>();
  for (const s of SANCTIONED_SKIPS) {
    const lines = byFile.get(s.file) ?? [];
    lines.push(s.site);
    if (s.file === duplicateFile) lines.push(s.site);
    byFile.set(s.file, lines);
  }
  for (const [file, lines] of byFile) {
    const abs = join(root, file);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, `${lines.join('\n')}\n`);
  }
}

describe('resolveCapabilitySites — fail-closed site resolution', () => {
  it('returns one locatable site for each sanctioned skip in a clean fixture', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cap-policy-'));
    try {
      writeSanctionedSkipFixture(dir);
      const sites = resolveCapabilitySites(dir);
      expect(sites).toHaveLength(SANCTIONED_SKIPS.length);
      expect(
        sites.every((s) => s.line > 0),
        JSON.stringify(sites.filter((s) => s.line <= 0)),
      ).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('marks a duplicate normalized live skip line unresolved instead of proving only the first occurrence', () => {
    const target = SANCTIONED_SKIPS.find((s) => s.file === 'tests/integration/cli/scene-dev.test.ts')!;
    const dir = mkdtempSync(join(tmpdir(), 'cap-policy-dup-'));
    try {
      writeSanctionedSkipFixture(dir, target.file);
      const sites = resolveCapabilitySites(dir);
      const resolved = sites.find((s) => s.file === target.file && s.declaredCapability === target.capability);
      expect(resolved?.line).toBe(-1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
