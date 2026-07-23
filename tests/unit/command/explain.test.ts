// PROVES: INV-DIAGNOSTIC-CODE-CLOSED
/**
 * explain command — the diagnostic-code arm (data-only, every surface) and the
 * exported-symbol arm (CLI-injected api-index). Proves both resolutions and the
 * emitter / negative-control derivation.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { explainCommand, type ExplainPayload } from '@liteship/command';
import { buildApiSymbolResolver } from '../../../packages/cli/src/lib/api-index.js';

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

async function explain(query: string, resolver?: (s: string) => ReturnType<ReturnType<typeof buildApiSymbolResolver>>) {
  const context = resolver ? { resolveApiSymbol: resolver } : {};
  const result = await explainCommand.handler({ name: 'explain', args: { query } }, context);
  return { result, payload: result.payload as ExplainPayload };
}

describe('@liteship/command explain command — diagnostic-code arm', () => {
  it('explains a gauntlet hygiene code, deriving the emitting gate', async () => {
    const { result, payload } = await explain('gauntlet/no-bare-throw');
    expect(result.status).toBe('ok');
    expect(payload.kind).toBe('diagnostic');
    expect(payload.symbol).toBeNull();
    const d = payload.diagnostic!;
    expect(d.code).toBe('gauntlet/no-bare-throw');
    expect(d.area).toBe('gauntlet');
    expect(d.title.length).toBeGreaterThan(0);
    expect(d.explanation.length).toBeGreaterThan(0);
    expect(d.remediation.length).toBeGreaterThan(0);
    expect(d.emitter.kind).toBe('gate');
    expect(d.emitter.id).toBe('gauntlet/no-bare-throw');
  });

  it('explains a check code, projecting its owner/command/authority/negativeControl', async () => {
    const { payload } = await explain('check/format');
    const d = payload.diagnostic!;
    expect(d.area).toBe('check');
    expect(d.emitter.kind).toBe('check');
    expect(d.emitter.id).toBe('check/format');
    expect(d.emitter.owner).toBe('.prettierrc');
    expect(typeof d.emitter.command).toBe('string');
    expect(d.emitter.authority).toBe('blocking');
  });

  it('derives the base gate id for a gauntlet SUB-code and links its proving check', async () => {
    const { payload } = await explain('gauntlet/standards-integrity/weakened');
    const d = payload.diagnostic!;
    expect(d.emitter.kind).toBe('gate');
    // the gate id is the first two segments — the sub-code appends a third
    expect(d.emitter.id).toBe('gauntlet/standards-integrity');
    // The standards check owns the gate source and points at the dogfood test that
    // executes the gate's embedded red fixture through the authority ratchet.
    expect(d.emitter.negativeControl).toBe('tests/unit/gauntlet/gates-dogfood.test.ts');
    expect(d.emitter.provenByCheck).toBe('check/standards-gate');
  });

  it('explains a core domain diagnostic with its real owner', async () => {
    const { payload } = await explain('core/document-graph/wrong_tag');
    const d = payload.diagnostic!;
    expect(d.area).toBe('core');
    expect(d.emitter.kind).toBe('domain');
    expect(d.emitter.id).toBe('core/document-graph/wrong_tag');
    expect(d.emitter.owner).toBe('@liteship/core');
    expect(d.emitter.negativeControl).toBeNull();
  });

  it.each([
    ['schema/type', 'schema', '@liteship/core/schema'],
    ['compiler/css/unknown-state-key', 'compiler', '@liteship/compiler'],
    ['astro/wgpu/webgpu-unavailable', 'astro', '@liteship/astro'],
    ['cli/usage', 'cli', '@liteship/cli'],
    ['migrate/malformed-input', 'migrate', '@liteship/compiler/migrate'],
  ] as const)('explains %s with area %s and owner %s', async (code, area, owner) => {
    const { result, payload } = await explain(code);
    expect(result.status).toBe('ok');
    const diagnostic = payload.diagnostic!;
    expect(diagnostic.area).toBe(area);
    expect(diagnostic.title.length).toBeGreaterThan(0);
    expect(diagnostic.explanation.length).toBeGreaterThan(0);
    expect(diagnostic.remediation.length).toBeGreaterThan(0);
    expect(diagnostic.emitter).toMatchObject({ kind: 'domain', id: code, owner });
  });

  it('links a glob-owned gauntlet gate to the check that proves it', async () => {
    const { payload } = await explain('gauntlet/no-bare-throw');
    expect(payload.diagnostic!.emitter).toMatchObject({
      kind: 'gate',
      id: 'gauntlet/no-bare-throw',
      provenByCheck: 'check/gates',
    });
    expect(payload.diagnostic!.emitter.negativeControl).toBeTruthy();
    expect(payload.diagnostic!.emitter.owner).toBe('@liteship/gauntlet');
  });

  it('a code always resolves data-only — no resolveApiSymbol capability needed', async () => {
    const { result } = await explain('gauntlet/no-placeholder');
    expect(result.status).toBe('ok');
  });
});

describe('@liteship/command explain command — exported-symbol arm', () => {
  const resolver = buildApiSymbolResolver(REPO_ROOT);

  it('resolves an exported symbol to its owning package + source file + TSDoc summary', async () => {
    const { result, payload } = await explain('explainDiagnostic', resolver);
    expect(result.status).toBe('ok');
    expect(payload.kind).toBe('symbol');
    expect(payload.diagnostic).toBeNull();
    const s = payload.symbol!;
    expect(s.symbol).toBe('explainDiagnostic');
    expect(s.package).toBe('@liteship/error');
    expect(s.subpath).toBe('.');
    expect(s.file).toBe('packages/error/src/codes.ts');
    expect(s.kind).toBe('function');
    expect(s.summary.length).toBeGreaterThan(0);
    expect(s.packageDescription.length).toBeGreaterThan(0);
  });

  it('does not expose a declaration that is private to a package implementation', () => {
    expect(resolver('PACKAGE_METADATA_CATALOG')).toBeNull();
  });

  it('a diagnostic code still takes the diagnostic arm even when a resolver is present', async () => {
    const { payload } = await explain('gauntlet/no-bare-throw', resolver);
    expect(payload.kind).toBe('diagnostic');
  });

  it('an unknown token fails structurally (never a throw), exit code > 0', async () => {
    const { result, payload } = await explain('zzz-not-a-code-or-symbol', resolver);
    expect(result.status).toBe('failed');
    expect(result.exitCode ?? 0).toBeGreaterThan(0);
    expect(payload.kind).toBe('unresolved');
  });

  it('without the resolver capability, a symbol degrades to unresolved (MCP-safe)', async () => {
    const { result, payload } = await explain('explainDiagnostic');
    expect(result.status).toBe('failed');
    expect(payload.kind).toBe('unresolved');
  });
});
