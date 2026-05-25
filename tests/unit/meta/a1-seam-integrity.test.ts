/**
 * CUT A1 (capstone) — A1-T8 + the no-cycle invariant. Proves the cli↔mcp cycle
 * and the stdout-capture seam are gone for good:
 *   - the mcp→cli .d.ts shim (czap-cli-shim.d.ts) is deleted;
 *   - @czap/mcp-server source imports neither @czap/cli nor process.stdout
 *     monkey-patching nor a buildArgv argv-flattener;
 *   - the surviving cli→mcp shim is minimal (the exempt one-way dynamic import).
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO = resolve(import.meta.dirname, '..', '..', '..');
const MCP_SRC = resolve(REPO, 'packages/mcp-server/src');

function allMcpSource(): string {
  return readdirSync(MCP_SRC)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => readFileSync(resolve(MCP_SRC, f), 'utf8'))
    .join('\n');
}

describe('A1-T8 — cli↔mcp cycle + stdout-capture seam are deleted', () => {
  it('the mcp→cli .d.ts shim is gone', () => {
    expect(existsSync(resolve(MCP_SRC, 'czap-cli-shim.d.ts'))).toBe(false);
  });

  it('@czap/mcp-server source imports neither @czap/cli nor cli run()', () => {
    const src = allMcpSource();
    expect(src).not.toMatch(/from\s+['"]@czap\/cli['"]/);
    expect(src).not.toMatch(/import\(\s*['"]@czap\/cli['"]\s*\)/);
  });

  it('no stdout monkey-patch or buildArgv survives in the MCP dispatch path', () => {
    const dispatch = readFileSync(resolve(MCP_SRC, 'dispatch.ts'), 'utf8');
    // The actual monkey-patch was an assignment to process.stdout(.write); match
    // the assignment pattern, not prose that merely names the deleted technique.
    expect(dispatch).not.toMatch(/process\.stdout[\s\S]{0,40}\.write\s*=/);
    expect(dispatch).not.toMatch(/\bfunction buildArgv\b/);
    expect(dispatch).not.toContain('buildArgv(');
    // The replacement: structured dispatch through @czap/command.
    expect(dispatch).toContain('structuredContent');
  });

  it('the surviving cli→mcp shim is minimal (only declares start)', () => {
    const shim = readFileSync(resolve(REPO, 'packages/cli/src/mcp-server.d.ts'), 'utf8');
    expect(shim).toContain('export function start');
    // No re-declaration of cli surface; it's just the one-way dynamic-start type.
    expect(shim).not.toContain('export function run');
  });
});
