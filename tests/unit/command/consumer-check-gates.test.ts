/** Consumer check-gates context laws. */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createNodeCommandContext } from '@liteship/command/host';
import { hasCheckGovernanceSurface } from '../../../packages/command/src/host/check-governance.js';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function consumerRoot(source: string): string {
  const root = mkdtempSync(join(tmpdir(), 'liteship-consumer-gates-'));
  roots.push(root);
  mkdirSync(join(root, 'packages', 'app', 'src'), { recursive: true });
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'consumer', scripts: {} }));
  writeFileSync(join(root, 'packages', 'app', 'src', 'subject.ts'), source);
  return root;
}

describe('packed-consumer check gates', () => {
  it('runs semantic gates without borrowing LiteShip repository governance records', async () => {
    const root = consumerRoot("export function boom(): void { throw new Error('planted'); }\n");

    expect(hasCheckGovernanceSurface(root)).toBe(false);
    const result = await createNodeCommandContext({ cwd: root }).runGauntlet!();

    expect(result.blocked).toBe(true);
    expect(result.findings.some((finding) => finding.ruleId === 'gauntlet/no-bare-throw')).toBe(true);
  });

  it('admits repository governance only when every canonical owner exists', () => {
    const root = consumerRoot('export const ok = true;\n');
    mkdirSync(join(root, 'scripts'), { recursive: true });
    mkdirSync(join(root, 'packages', 'command', 'src', 'checks'), { recursive: true });
    writeFileSync(join(root, 'scripts', 'package-catalog.ts'), 'export {};\n');
    writeFileSync(join(root, 'packages', 'command', 'src', 'checks', 'registry.ts'), 'export {};\n');

    expect(hasCheckGovernanceSurface(root)).toBe(false);
    mkdirSync(join(root, 'traceability'), { recursive: true });
    writeFileSync(join(root, 'traceability', 'testing-ledger.yaml'), 'entries: []\n');
    expect(hasCheckGovernanceSurface(root)).toBe(true);
  });
});
