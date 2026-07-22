/**
 * explain (CLI adapter) — thin projection over `@liteship/command`'s explain
 * command. Injects the CLI-side api-index (`buildApiSymbolResolver`) as the
 * `resolveApiSymbol` capability so a SYMBOL lookup resolves against the repo
 * source; the DIAGNOSTIC-CODE arm is data-only. Emits the structured JSON receipt
 * to stdout and a pretty summary to stderr (unless `--json`).
 *
 * @module
 */

import { explainCommand, type CommandContext, type ExplainPayload } from '@liteship/command';
import { color, colorEnabled } from '../lib/ansi.js';
import { buildApiSymbolResolver } from '../lib/api-index.js';
import { emit, emitError } from '../receipts.js';

/** Render the diagnostic arm to stderr. */
function prettyDiagnostic(payload: ExplainPayload, on: boolean): string {
  const d = payload.diagnostic!;
  const head = `${color('cyan', d.code, on)}  ${color('dim', `(${d.area})`, on)}`;
  const emitterLine =
    d.emitter.kind === 'domain'
      ? `  ${color('dim', 'emitter:', on)} ${d.emitter.owner ?? 'domain diagnostic'}`
      : `  ${color('dim', 'emitter:', on)} ${d.emitter.kind} ${color('cyan', d.emitter.id ?? '', on)}` +
        (d.emitter.negativeControl ? `\n  ${color('dim', 'negative control:', on)} ${d.emitter.negativeControl}` : '');
  return `${head}\n  ${d.title}\n\n  ${d.explanation}\n\n  ${color('dim', 'fix:', on)} ${d.remediation}\n${emitterLine}\n`;
}

/** Render the symbol arm to stderr. */
function prettySymbol(payload: ExplainPayload, on: boolean): string {
  const s = payload.symbol!;
  const head = `${color('cyan', s.symbol, on)}  ${color('dim', `(${s.kind})`, on)}`;
  const owner = `  ${color('dim', 'from:', on)} ${color('cyan', s.package, on)}  ${color('dim', s.file, on)}`;
  const summary = s.summary ? `\n  ${s.summary}` : '';
  return `${head}\n${owner}${summary}\n`;
}

/** Execute the explain command (CLI adapter over the shared registry command). */
export async function explain(
  query: string | null,
  opts: { json?: boolean; pretty?: boolean; cwd?: string } = {},
): Promise<number> {
  if (query === null || query.length === 0) {
    emitError(
      'explain',
      'cli/usage',
      'usage: liteship explain <diagnostic-code | exported-symbol>',
      'e.g. liteship explain gauntlet/no-bare-throw',
    );
    return 1;
  }

  const cwd = opts.cwd ?? process.cwd();
  const context: CommandContext = { cwd, resolveApiSymbol: buildApiSymbolResolver(cwd) };
  const result = await explainCommand.handler({ name: 'explain', args: { query } }, context);
  const payload = result.payload as ExplainPayload;

  if (result.status === 'failed') {
    emitError(
      'explain',
      'cli/not-found',
      `no diagnostic code or exported symbol matches: ${query}`,
      'try a code like gauntlet/no-bare-throw, or an exported symbol like explainDiagnostic',
    );
    return result.exitCode ?? 1;
  }

  // Preserve a stable stdout receipt: base envelope + payload fields.
  emit({
    status: result.status,
    command: result.command,
    timestamp: result.timestamp,
    query: payload.query,
    kind: payload.kind,
    diagnostic: payload.diagnostic,
    symbol: payload.symbol,
  });

  const wantPretty = opts.pretty ?? (!opts.json && Boolean(process.stderr.isTTY));
  if (wantPretty) {
    const on = colorEnabled();
    process.stderr.write('\n');
    if (payload.kind === 'diagnostic') process.stderr.write(prettyDiagnostic(payload, on));
    else if (payload.kind === 'symbol') process.stderr.write(prettySymbol(payload, on));
  }
  return 0;
}
