import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readReleasePromotionWorkspace, workflowJob } from '../../../scripts/lib/release-promotion-contract.js';

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'liteship-release-contract-'));
  roots.push(root);
  mkdirSync(join(root, '.github', 'workflows'), { recursive: true });
  writeFileSync(join(root, 'package.json'), JSON.stringify({ scripts: { build: 'tsc --build' } }));
  writeFileSync(join(root, '.github', 'workflows', 'ci.yml'), 'jobs:\n  test:\n    runs-on: ubuntu-latest\n');
  writeFileSync(
    join(root, '.github', 'workflows', 'release.yml'),
    'jobs:\n  release-certified:\n    runs-on: ubuntu-latest\n  publish:\n    runs-on: ubuntu-latest\n',
  );
  return root;
}

describe('release promotion contract reader', () => {
  it('returns the canonical workflow and script owners', () => {
    const workspace = readReleasePromotionWorkspace(fixture());
    expect(workspace.rootScripts).toEqual({ build: 'tsc --build' });
    expect(workspace.ciWorkflow).toContain('test:');
    expect(workflowJob(workspace.releaseWorkflow, 'release-certified', 'publish')).toContain('runs-on');
    expect(workflowJob(workspace.releaseWorkflow, 'publish')).toContain('runs-on');
  });

  it('fails closed when scripts are not an object', () => {
    const root = fixture();
    writeFileSync(join(root, 'package.json'), JSON.stringify({ scripts: [] }));
    expect(() => readReleasePromotionWorkspace(root)).toThrow(/scripts must be an object/u);
  });

  it('fails closed when a required job is absent', () => {
    const workspace = readReleasePromotionWorkspace(fixture());
    expect(() => workflowJob(workspace.releaseWorkflow, 'missing')).toThrow(/missing workflow job/u);
  });
});
