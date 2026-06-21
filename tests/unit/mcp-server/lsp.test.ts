/**
 * LSP rigor skin — the THIRD JSON-RPC skin over the one gauntlet fold.
 *
 * Locks (every one DETERMINISTIC — pure projections + a stub injected runner,
 * no clock, no filesystem):
 *   1. Finding → LSP Diagnostic projection: every severity, every level, the
 *      1-based→0-based line conversion, the no-column whole-line range, the
 *      no-location drop, the file→URI mapping, the fixed source.
 *   2. Finding.remediation → LSP CodeAction projection: the patch arm (a
 *      machine-applicable command carrying the diff) + the instruction arm (the
 *      ordered steps) + the no-remediation null + the diagnostics back-link.
 *   3. The LSP server lifecycle: an `initialize` handshake returns the
 *      capabilities (codeActionProvider); a request before `initialize` is a
 *      protocol violation; shutdown/exit close cleanly.
 *   4. A `czap/check` request over a STUB set of findings (injected runner)
 *      produces publishDiagnostics notifications grouped by URI.
 *   5. The `textDocument/codeAction` request returns the remediations for the
 *      findings in the requested range.
 *   6. Content-Length framing round-trips.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { Readable, Writable } from 'node:stream';
import { runLspStdio } from '../../../packages/mcp-server/src/lsp/stdio.js';
import {
  projectFinding,
  groupDiagnosticsByUri,
  severityToDiagnostic,
  fileToUri,
  projectRemediation,
  handle,
  initialLspState,
  makeFrameReader,
  encodeFrame,
  CZAP_CHECK_METHOD,
  LSP_SERVER_CAPABILITIES,
  DiagnosticSeverity,
  CodeActionKind,
  APPLY_PATCH_COMMAND,
  SHOW_INSTRUCTION_COMMAND,
  DIAGNOSTIC_SOURCE,
} from '../../../packages/mcp-server/src/lsp/index.js';
import type {
  FindingLike,
  LspGauntletRunner,
  LspDiagnostic,
  LspCodeAction,
} from '../../../packages/mcp-server/src/lsp/index.js';
import type { JsonRpcSuccess, JsonRpcErrorResponse } from '../../../packages/mcp-server/src/jsonrpc.js';

// ---------- fixtures ----------

const ERR_FINDING: FindingLike = {
  ruleId: 'no-default-export',
  severity: 'error',
  level: 'L3',
  title: 'default export',
  detail: 'modules must use named exports',
  location: { file: 'packages/x/src/a.ts', line: 12, column: 5 },
  remediation: { kind: 'patch', description: 'convert to a named export', diff: '--- a\n+++ b\n@@ -1 +1 @@\n-export default x\n+export { x }\n' },
};
const WARN_FINDING: FindingLike = {
  ruleId: 'no-var',
  severity: 'warning',
  level: 'L1',
  title: 'var declaration',
  detail: 'prefer const/let',
  location: { file: 'packages/x/src/b.ts', line: 1 }, // no column → whole-line
  remediation: { kind: 'instruction', description: 'replace var', steps: ['find the var', 'change to const'] },
};
const ADVISORY_FINDING: FindingLike = {
  ruleId: 'oracle-divergence',
  severity: 'advisory',
  level: 'L0',
  title: 'oracle disagreement',
  detail: 'ts-ast says X, regex says Y',
  location: { file: 'packages/x/src/a.ts', line: 30 },
};
const UNANCHORED_FINDING: FindingLike = {
  ruleId: 'global-policy',
  severity: 'error',
  level: 'L4',
  title: 'repo-wide policy',
  detail: 'no location — surfaced via CLI/MCP only',
};

/** A stub injected runner — returns a fixed finding list, NO engine, NO fs, NO clock. */
function stubRunner(findings: readonly FindingLike[], blocked = false): LspGauntletRunner {
  return async () => ({ findings, blocked });
}

// ---------- 1. Finding → Diagnostic ----------

describe('LSP — Finding → Diagnostic projection (pure)', () => {
  it('maps every severity to its LSP DiagnosticSeverity', () => {
    expect(severityToDiagnostic('error')).toBe(DiagnosticSeverity.Error);
    expect(severityToDiagnostic('warning')).toBe(DiagnosticSeverity.Warning);
    expect(severityToDiagnostic('advisory')).toBe(DiagnosticSeverity.Information);
  });

  it('converts 1-based line+column to a 0-based single-character range', () => {
    const p = projectFinding(ERR_FINDING);
    expect(p).not.toBeNull();
    const d = p!.diagnostic;
    expect(d.range.start).toEqual({ line: 11, character: 4 }); // 12→11, 5→4
    expect(d.range.end).toEqual({ line: 11, character: 5 });
  });

  it('with no column, spans the whole line (character 0 → sentinel)', () => {
    const p = projectFinding(WARN_FINDING);
    const d = p!.diagnostic;
    expect(d.range.start).toEqual({ line: 0, character: 0 }); // line 1→0
    expect(d.range.end.line).toBe(0);
    expect(d.range.end.character).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('carries ruleId as code, the fixed source, the title+detail message, and level+ruleId in data', () => {
    const d = projectFinding(ERR_FINDING)!.diagnostic;
    expect(d.code).toBe('no-default-export');
    expect(d.source).toBe(DIAGNOSTIC_SOURCE);
    expect(d.source).toBe('czap-gauntlet');
    expect(d.message).toBe('default export — modules must use named exports');
    expect(d.data).toEqual({ level: 'L3', ruleId: 'no-default-export' });
  });

  it('preserves every assurance level in data', () => {
    for (const level of ['L0', 'L1', 'L2', 'L3', 'L4'] as const) {
      const d = projectFinding({ ...ADVISORY_FINDING, level })!.diagnostic;
      expect(d.data.level).toBe(level);
    }
  });

  it('returns null for an unanchored finding (no Diagnostic without a range)', () => {
    expect(projectFinding(UNANCHORED_FINDING)).toBeNull();
  });

  it('maps a repo-relative POSIX path to a file:// URI via pathToFileURL (canonical, percent-encoded)', () => {
    expect(fileToUri('packages/x/src/a.ts')).toBe('file:///packages/x/src/a.ts');
    expect(fileToUri('/abs/a.ts')).toBe('file:///abs/a.ts');
    expect(fileToUri('file:///already.ts')).toBe('file:///already.ts');
    // pathToFileURL is the canonical constructor: it percent-encodes reserved
    // characters per the URI grammar (a hand-rolled `file://` concat would emit an
    // invalid URI here). Inputs are repo-relative POSIX — paths are normalized
    // upstream (the audit layer), so there are no backslashes to convert here.
    expect(fileToUri('packages/x/with space.ts')).toBe('file:///packages/x/with%20space.ts');
  });

  it('groups diagnostics by URI deterministically, dropping unanchored findings', () => {
    const grouped = groupDiagnosticsByUri([ERR_FINDING, WARN_FINDING, ADVISORY_FINDING, UNANCHORED_FINDING]);
    expect(grouped.map((g) => g.uri)).toEqual([
      'file:///packages/x/src/a.ts',
      'file:///packages/x/src/b.ts',
    ]); // sorted, unanchored dropped
    const aGroup = grouped.find((g) => g.uri.endsWith('a.ts'))!;
    expect(aGroup.diagnostics).toHaveLength(2); // ERR + ADVISORY both in a.ts
    // Determinism: same input → byte-identical grouping.
    expect(groupDiagnosticsByUri([ERR_FINDING, WARN_FINDING])).toEqual(
      groupDiagnosticsByUri([ERR_FINDING, WARN_FINDING]),
    );
  });
});

// ---------- 2. remediation → CodeAction ----------

describe('LSP — Finding.remediation → CodeAction projection (pure)', () => {
  const errDiag = projectFinding(ERR_FINDING)!.diagnostic;
  const warnDiag = projectFinding(WARN_FINDING)!.diagnostic;

  it('projects a patch remediation to a quickfix carrying the apply-patch command + diff', () => {
    const action = projectRemediation(ERR_FINDING.remediation, errDiag, 'file:///packages/x/src/a.ts');
    expect(action).not.toBeNull();
    expect(action!.kind).toBe(CodeActionKind.QuickFix);
    expect(action!.command?.command).toBe(APPLY_PATCH_COMMAND);
    const arg = action!.command!.arguments[0] as { uri: string; diff: string; ruleId: string };
    expect(arg.uri).toBe('file:///packages/x/src/a.ts');
    expect(arg.diff).toContain('+export { x }');
    expect(arg.ruleId).toBe('no-default-export');
    // back-link to the diagnostic it fixes
    expect(action!.diagnostics).toEqual([errDiag]);
  });

  it('projects an instruction remediation to a quickfix carrying the ordered steps', () => {
    const action = projectRemediation(WARN_FINDING.remediation, warnDiag, 'file:///packages/x/src/b.ts');
    expect(action!.command?.command).toBe(SHOW_INSTRUCTION_COMMAND);
    const arg = action!.command!.arguments[0] as { steps: readonly string[] };
    expect(arg.steps).toEqual(['find the var', 'change to const']);
    expect(action!.diagnostics).toEqual([warnDiag]);
  });

  it('returns null when there is no remediation', () => {
    expect(projectRemediation(undefined, errDiag, 'file:///x')).toBeNull();
  });
});

// ---------- 3. server lifecycle ----------

describe('LSP — server lifecycle (initialize / shutdown / exit)', () => {
  const runner = stubRunner([]);

  it('initialize returns the rigor capabilities (codeActionProvider quickfix) + serverInfo', async () => {
    const { state, result } = await handle(
      JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { capabilities: {} } }),
      initialLspState(),
      runner,
    );
    expect(state.initialized).toBe(true);
    const ok = result.response as JsonRpcSuccess;
    const caps = (ok.result as { capabilities: typeof LSP_SERVER_CAPABILITIES }).capabilities;
    expect(caps.codeActionProvider.codeActionKinds).toContain('quickfix');
    expect(caps).toEqual(LSP_SERVER_CAPABILITIES);
    expect((ok.result as { serverInfo: { name: string } }).serverInfo.name).toBe('czap-gauntlet-lsp');
  });

  it('a request before initialize is a protocol violation (error, not silent)', async () => {
    const { result } = await handle(
      JSON.stringify({ jsonrpc: '2.0', id: 2, method: CZAP_CHECK_METHOD }),
      initialLspState(),
      runner,
    );
    const err = result.response as JsonRpcErrorResponse;
    expect(err.error.code).toBe(-32603); // InvariantViolationError → internal
    expect(err.error.message).toContain('before');
  });

  it('an unknown request method is an honest method-not-found (-32601)', async () => {
    const init = await handle(
      JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
      initialLspState(),
      runner,
    );
    const { result } = await handle(
      JSON.stringify({ jsonrpc: '2.0', id: 9, method: 'textDocument/hover', params: {} }),
      init.state,
      runner,
    );
    expect((result.response as JsonRpcErrorResponse).error.code).toBe(-32601);
  });

  it('shutdown then exit closes the loop cleanly (exit gets no response)', async () => {
    let s = (await handle(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }), initialLspState(), runner)).state;
    const sd = await handle(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'shutdown' }), s, runner);
    expect((sd.result.response as JsonRpcSuccess).result).toBeNull();
    s = sd.state;
    expect(s.shuttingDown).toBe(true);
    const ex = await handle(JSON.stringify({ jsonrpc: '2.0', method: 'exit' }), s, runner);
    expect(ex.result.response).toBeNull();
    expect(ex.result.exit).toBe(true);
  });

  it('a malformed JSON frame body yields a -32700 parse error (never a silent drop)', async () => {
    const { result } = await handle('{not json', initialLspState(), runner);
    expect((result.response as JsonRpcErrorResponse).error.code).toBe(-32700);
  });

  it('a FAILING notification handler produces no response but logs the error (window/logMessage — never a silent drop)', async () => {
    // A `czap/check` NOTIFICATION (no id) before `initialize` throws in the
    // handler. §4.1: a notification gets no JSON-RPC response — but the error must
    // be CONSUMED, not laundered. It is surfaced over the out-of-band LSP log
    // channel (window/logMessage), so the failure is observable.
    const { result } = await handle(
      JSON.stringify({ jsonrpc: '2.0', method: CZAP_CHECK_METHOD }), // no id → notification
      initialLspState(),
      runner,
    );
    expect(result.response).toBeNull(); // §4.1: notifications get no response
    expect(result.notifications).toHaveLength(1);
    const note = result.notifications[0]!;
    expect(note.method).toBe('window/logMessage');
    const params = note.params as { type: number; message: string };
    expect(params.type).toBe(1); // MessageType.Error
    expect(params.message).toContain('notification handler failed');
    expect(params.message).toContain('before'); // carries the consumed error's own message
  });
});

// ---------- 4. czap/check → publishDiagnostics ----------

describe('LSP — czap/check publishes diagnostics grouped by URI (injected runner)', () => {
  it('runs the injected runner and emits one publishDiagnostics per file URI', async () => {
    const runner = stubRunner([ERR_FINDING, WARN_FINDING, ADVISORY_FINDING, UNANCHORED_FINDING]);
    const init = await handle(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }), initialLspState(), runner);
    const { state, result } = await handle(
      JSON.stringify({ jsonrpc: '2.0', id: 2, method: CZAP_CHECK_METHOD }),
      init.state,
      runner,
    );
    // two URIs (a.ts has ERR+ADVISORY, b.ts has WARN); unanchored dropped
    const methods = result.notifications.map((n) => n.method);
    expect(methods).toEqual(['textDocument/publishDiagnostics', 'textDocument/publishDiagnostics']);
    const uris = result.notifications.map((n) => (n.params as { uri: string }).uri).sort();
    expect(uris).toEqual(['file:///packages/x/src/a.ts', 'file:///packages/x/src/b.ts']);
    const aParams = result.notifications.find((n) => (n.params as { uri: string }).uri.endsWith('a.ts'))!
      .params as { diagnostics: readonly LspDiagnostic[] };
    expect(aParams.diagnostics).toHaveLength(2);
    // findings are cached on state for the codeAction resolution
    expect(state.lastFindings).toHaveLength(4);
    // response carries the summary
    expect((result.response as JsonRpcSuccess).result).toEqual({ findingCount: 4, publishedUris: 2 });
  });
});

// ---------- 5. textDocument/codeAction ----------

describe('LSP — textDocument/codeAction returns the remediations in range', () => {
  it('returns the patch + instruction code actions for findings in the requested document/range', async () => {
    const runner = stubRunner([ERR_FINDING, WARN_FINDING, ADVISORY_FINDING]);
    let s = (await handle(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }), initialLspState(), runner)).state;
    s = (await handle(JSON.stringify({ jsonrpc: '2.0', id: 2, method: CZAP_CHECK_METHOD }), s, runner)).state;

    // a.ts, lines 0..40 — covers ERR_FINDING (line 11) but ADVISORY has no remediation
    const caResult = await handle(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'textDocument/codeAction',
        params: {
          textDocument: { uri: 'file:///packages/x/src/a.ts' },
          range: { start: { line: 0, character: 0 }, end: { line: 40, character: 0 } },
          context: { diagnostics: [] },
        },
      }),
      s,
      runner,
    );
    const actions = (caResult.result.response as JsonRpcSuccess).result as readonly LspCodeAction[];
    expect(actions).toHaveLength(1); // only ERR has a remediation; ADVISORY has none
    expect(actions[0]!.command?.command).toBe(APPLY_PATCH_COMMAND);

    // b.ts → the instruction action
    const bResult = await handle(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'textDocument/codeAction',
        params: {
          textDocument: { uri: 'file:///packages/x/src/b.ts' },
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 99 } },
          context: { diagnostics: [] },
        },
      }),
      s,
      runner,
    );
    const bActions = (bResult.result.response as JsonRpcSuccess).result as readonly LspCodeAction[];
    expect(bActions).toHaveLength(1);
    expect(bActions[0]!.command?.command).toBe(SHOW_INSTRUCTION_COMMAND);
  });

  it('returns no actions for a range that overlaps no finding', async () => {
    const runner = stubRunner([ERR_FINDING]);
    let s = (await handle(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }), initialLspState(), runner)).state;
    s = (await handle(JSON.stringify({ jsonrpc: '2.0', id: 2, method: CZAP_CHECK_METHOD }), s, runner)).state;
    const r = await handle(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'textDocument/codeAction',
        params: {
          textDocument: { uri: 'file:///packages/x/src/a.ts' },
          range: { start: { line: 100, character: 0 }, end: { line: 101, character: 0 } },
        },
      }),
      s,
      runner,
    );
    expect((r.result.response as JsonRpcSuccess).result).toEqual([]);
  });
});

// ---------- 6. Content-Length framing ----------

describe('LSP — Content-Length framing round-trip', () => {
  it('encodeFrame wraps a payload with the byte-length header', () => {
    const framed = encodeFrame('{"a":1}');
    expect(framed).toBe('Content-Length: 7\r\n\r\n{"a":1}');
  });

  it('the reader de-frames one or more concatenated frames, including a chunk split mid-frame', () => {
    const reader = makeFrameReader();
    const f1 = encodeFrame('{"id":1}');
    const f2 = encodeFrame('{"id":2}');
    // feed f1 + the first half of f2
    const wire = f1 + f2;
    const firstHalf = wire.slice(0, f1.length + 10);
    const secondHalf = wire.slice(f1.length + 10);
    expect(reader.push(firstHalf)).toEqual(['{"id":1}']);
    expect(reader.push(secondHalf)).toEqual(['{"id":2}']);
  });

  it('correctly counts multi-byte UTF-8 payloads by BYTES not characters', () => {
    const reader = makeFrameReader();
    const payload = JSON.stringify({ msg: 'café — ✓' }); // multi-byte chars
    expect(reader.push(encodeFrame(payload))).toEqual([payload]);
  });
});

// ---------- 7. full stdio driver round-trip (the injected-runner loop) ----------

describe('LSP — runLspStdio drives the full framed loop with the injected runner', () => {
  it('initialize → czap/check → shutdown → exit, framing in + out, drains before close', async () => {
    const input = Readable.from([
      encodeFrame(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { capabilities: {} } })),
      encodeFrame(JSON.stringify({ jsonrpc: '2.0', id: 2, method: CZAP_CHECK_METHOD })),
      encodeFrame(JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'shutdown' })),
      encodeFrame(JSON.stringify({ jsonrpc: '2.0', method: 'exit' })),
    ]);
    let out = '';
    const output = new Writable({
      write(chunk: Buffer, _enc, cb): void {
        out += chunk.toString();
        cb();
      },
    });

    await runLspStdio(stubRunner([ERR_FINDING]), input, output);

    // The reduce-race regression: czap/check's publishDiagnostics MUST have been
    // written before the loop closed on `exit`.
    expect(out).toContain('"id":1'); // initialize response
    expect(out).toContain('textDocument/publishDiagnostics'); // czap/check push
    expect(out).toContain('"code":"no-default-export"');
    expect(out).toContain('"id":3'); // shutdown response
    // Every emitted frame carries a Content-Length header (LSP base protocol).
    const headerCount = out.split('Content-Length:').length - 1;
    expect(headerCount).toBeGreaterThanOrEqual(3); // init + publish + shutdown
  });
});
