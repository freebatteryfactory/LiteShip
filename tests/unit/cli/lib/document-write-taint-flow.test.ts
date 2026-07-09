/**
 * document.write / writeln taint flow — proves calleeName member match (#121).
 *
 * @module
 */
import { describe, expect, it, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { buildRepoIRTaint } from '../../../../packages/audit/src/repo-ir-taint.js';
import { resolveDevopsProfile } from '@czap/audit';
import { LITESHIP_TAINT_REGISTRY } from '../../../../packages/cli/src/lib/taint-policy.js';

const fixtures: string[] = [];
afterEach(() => {
  for (const dir of fixtures.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function makeFixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'czap-doc-write-taint-'));
  fixtures.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const abs = resolve(root, rel);
    mkdirSync(resolve(abs, '..'), { recursive: true });
    writeFileSync(abs, content, 'utf8');
  }
  return root;
}

describe('document.write taint flow (#121)', () => {
  it('flags fetch → document.write and fetch → document.writeln as unsanitized flows', () => {
    const root = makeFixture({
      'package.json': JSON.stringify({ name: 'app-root', private: true, type: 'module' }),
      'packages/app/package.json': JSON.stringify({
        name: '@app/site',
        version: '0.0.0',
        exports: { '.': { development: './src/page.ts' } },
      }),
      'packages/app/src/page.ts': `
export async function render(html: string): Promise<void> {
  const res = await fetch('/api');
  const body = await res.text();
  document.write(body);
  document.writeln(html + body);
}
`,
    });

    const profile = resolveDevopsProfile({
      repoRoot: root,
      internalPackagePrefix: '@app/',
      packageTopology: { '@app/site': { allowedInternalImports: [], kind: 'app' } },
    });

    const facts = buildRepoIRTaint(LITESHIP_TAINT_REGISTRY, { profile, interproceduralDepth: 0 });
    const writeFlows = facts.flows.filter((f) => f.sink.callee === 'write' || f.sink.callee === 'writeln');
    expect(writeFlows.length).toBeGreaterThanOrEqual(1);
    expect(writeFlows.some((f) => f.sink.callee === 'write' && f.source.callee === 'fetch')).toBe(true);
    expect(writeFlows.some((f) => f.sink.callee === 'writeln' && f.source.callee === 'fetch')).toBe(true);
    expect(writeFlows.every((f) => f.sanitizedBy === null)).toBe(true);
  });
});
