/**
 * Unit contract for the `check` command (the tasks-vs-gates weld). The handler is
 * pure: it projects the injected `runGauntlet` capability's {@link GauntletResult}
 * (the PURE gauntlet engine fold, `litelaunchGauntlet`) into a structured
 * `CapsuleCommandResult` carrying the Finding[] work-list (WELD 2). These tests
 * pin that projection + the capability-absence guard WITHOUT running the real
 * engine — the engine (`litelaunchGauntlet` over the live repo) is exercised
 * end-to-end by the gauntlet dogfood tests and the CLI invocation.
 *
 * `check` is deliberately NOT the CLI-owned `gauntlet` orchestrator (which spawns
 * the 28-phase `gauntlet:full` run): it is the in-process, fixture-qualified gate
 * fold, and it is `mcpExposed` because its Finding[] is exactly the structured
 * work-list a human (CLI) or an agent (MCP) reads and acts on.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { checkCommand, commandRegistry, mcpExposedDescriptors } from '@czap/command';
import type { CheckPayload, CommandContext } from '@czap/command';
import type { Finding, GauntletResult } from '@czap/gauntlet';

// ── Single-source drift-guard ────────────────────────────────────────────────
// `SchemaFinding` is the finding element of the command's EXPORTED `CheckPayload`
// type, derived MECHANICALLY (`CheckPayload['findings'][number]`) so it can never
// hand-drift from the payload the handler actually returns — the compile-time link
// the earlier hand-written 6-field mirror lacked. The command's `outputSchema`
// (CheckPayloadSchema, hand-written JSON-Schema) models this element MINUS
// `remediation` (a heterogeneous union the JSON-Schema dialect can't express); the
// CheckPayload TYPE keeps the canonical gauntlet `Finding` (remediation included) so
// no capability is narrowed away. The never-executed assertions below pin that
// relationship: the payload's finding IS the canonical `Finding`, and its only
// sans-schema field is the optional `remediation`, which the payload preserves.
type SchemaFinding = CheckPayload['findings'][number];
type CanonicalFindingSansRemediation = Omit<Finding, 'remediation'>;
function __checkFindingContract(s: SchemaFinding, c: CanonicalFindingSansRemediation): void {
  const _toCanonical: CanonicalFindingSansRemediation = s;
  const _toSchema: SchemaFinding = c;
  void _toCanonical;
  void _toSchema;
}
// CheckPayload.findings keeps the FULL canonical Finding (remediation preserved).
function __checkPayloadKeepsRemediation(p: CheckPayload): Finding['remediation'] {
  return p.findings[0]?.remediation;
}
void __checkFindingContract;
void __checkPayloadKeepsRemediation;

/** A known blocking finding — the WELD-2 record we expect to ride straight through the payload. */
const BARE_THROW: Finding = {
  ruleId: 'gauntlet/no-bare-throw',
  severity: 'error',
  level: 'L3',
  title: 'bare throw',
  detail: 'throw a tagged @czap/error, not a bare value',
  location: { file: 'packages/x/src/y.ts', line: 12 },
  remediation: {
    kind: 'instruction',
    description: 'Replace the bare throw with a tagged error',
    steps: ['import the @czap/error constructor', 'throw the tagged variant instead'],
  },
};

/** Build a CommandContext whose injected `runGauntlet` returns a fixed result. */
const ctxWith = (result: GauntletResult): CommandContext => ({
  cwd: '/repo',
  runGauntlet: async () => result,
});

describe('check command — handler contract', () => {
  it('projects a BLOCKED gauntlet result to status failed / exit 1, with the Finding[] visible in the payload (WELD 2)', async () => {
    const result: GauntletResult = {
      findings: [BARE_THROW],
      outcomes: [
        {
          gateId: 'gauntlet/no-bare-throw',
          proof: {
            gateId: 'gauntlet/no-bare-throw',
            selfProven: true,
            redCaught: true,
            greenClean: true,
            mutationKilled: true,
          },
          authority: 'blocking',
          findings: [BARE_THROW],
          waived: [],
          waiverFindings: [],
        },
      ],
      blocked: true,
    };
    const out = await checkCommand.handler({ name: 'check', args: {} }, ctxWith(result));
    expect(out.status).toBe('failed');
    expect(out.exitCode).toBe(1);

    const payload = out.payload as CheckPayload;
    expect(payload.ok).toBe(false);
    expect(payload.blocked).toBe(true);
    expect(payload.findingCount).toBe(1);
    // The finding that went IN is the same finding visible in the payload — byte-for-byte.
    expect(payload.findings).toEqual([BARE_THROW]);
    expect(payload.findings[0]!.location).toEqual({ file: 'packages/x/src/y.ts', line: 12 });
    expect(payload.findings[0]!.remediation).toEqual(BARE_THROW.remediation);
  });

  it('projects an UNBLOCKED (clean) gauntlet result to status ok / exit 0 with an empty work-list', async () => {
    const result: GauntletResult = { findings: [], outcomes: [], blocked: false };
    const out = await checkCommand.handler({ name: 'check', args: {} }, ctxWith(result));
    expect(out.status).toBe('ok');
    expect(out.exitCode).toBe(0);
    const payload = out.payload as CheckPayload;
    expect(payload).toEqual({ ok: true, blocked: false, findingCount: 0, findings: [] });
  });

  it('surfaces advisory findings (a non-blocking run still carries its work-list)', async () => {
    const advisory: Finding = {
      ruleId: 'gauntlet/no-nondeterminism',
      severity: 'advisory',
      level: 'L1',
      title: 'ambient clock read',
      detail: 'calibrating — not yet blocking',
    };
    const result: GauntletResult = {
      findings: [advisory],
      outcomes: [
        {
          gateId: 'gauntlet/no-nondeterminism',
          proof: {
            gateId: 'gauntlet/no-nondeterminism',
            selfProven: false,
            redCaught: false,
            greenClean: false,
            mutationKilled: false,
          },
          authority: 'advisory',
          findings: [advisory],
          waived: [],
          waiverFindings: [],
        },
      ],
      blocked: false,
    };
    const out = await checkCommand.handler({ name: 'check', args: {} }, ctxWith(result));
    // Findings present, but not blocking → ok / exit 0.
    expect(out.status).toBe('ok');
    expect(out.exitCode).toBe(0);
    const payload = out.payload as CheckPayload;
    expect(payload.findingCount).toBe(1);
    expect(payload.findings[0]!.severity).toBe('advisory');
  });

  it('without the injected runGauntlet capability → ONE structured capability_unavailable failure, exit 2', async () => {
    const out = await checkCommand.handler({ name: 'check', args: {} }, { cwd: '/repo' });
    expect(out.status).toBe('failed');
    expect(out.exitCode).toBe(2);
    const payload = out.payload as { error: string; missing: string[] };
    expect(payload.error).toBe('capability_unavailable');
    expect(payload.missing).toEqual(['runGauntlet']);
  });

  it('forwards an optional string[] `globs` scope to the injected capability; ignores a malformed one', async () => {
    const seen: Array<readonly string[] | undefined> = [];
    const ctx: CommandContext = {
      cwd: '/repo',
      runGauntlet: async (globs) => {
        seen.push(globs);
        return { findings: [], outcomes: [], blocked: false };
      },
    };
    await checkCommand.handler({ name: 'check', args: { globs: ['packages/core/src/**/*.ts'] } }, ctx);
    // A non-array / non-string-array value falls through to the engine default (undefined).
    await checkCommand.handler({ name: 'check', args: { globs: 'not-an-array' } }, ctx);
    await checkCommand.handler({ name: 'check', args: {} }, ctx);
    expect(seen).toEqual([['packages/core/src/**/*.ts'], undefined, undefined]);
  });
});

describe('check command — descriptor + catalog registration', () => {
  it('declares runGauntlet as its unconditional requirement and is a read-only, MCP-exposed handler', () => {
    expect(checkCommand.descriptor.name).toBe('check');
    expect(checkCommand.descriptor.requires).toEqual(['runGauntlet']);
    expect(checkCommand.descriptor.annotations?.readOnly).toBe(true);
    expect(checkCommand.descriptor.annotations?.mcpExposed).toBe(true);
    // outputSchema declares the WELD-2 payload shape.
    expect(checkCommand.descriptor.outputSchema?.type).toBe('object');
    expect(Object.keys(checkCommand.descriptor.outputSchema?.properties ?? {})).toEqual([
      'ok',
      'blocked',
      'findingCount',
      'findings',
    ]);
  });

  it('is registered in the canonical catalog as a handler-backed, MCP-exposed command', () => {
    const registered = commandRegistry.get('check');
    expect(registered?.handler).toBeTypeOf('function');
    expect(registered?.descriptor.executionKind).toBe('handler');
    expect(mcpExposedDescriptors().map((d) => d.name)).toContain('check');
  });
});
