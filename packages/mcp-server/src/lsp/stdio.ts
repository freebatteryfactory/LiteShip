/**
 * LSP stdio driver — pump Content-Length-framed bytes through {@link handle}.
 *
 * Wires the three lean seams together: {@link makeFrameReader} de-frames the
 * incoming byte stream into JSON payloads, {@link handle} dispatches each over
 * the INJECTED gauntlet runner (the lean-engine seam — the engine lives in the
 * CLI host), and {@link encodeFrame} re-frames every response + push
 * notification back onto the output stream. The lifecycle {@link LspServerState}
 * is threaded across messages; `exit` closes the loop.
 *
 * Defaults to `process.stdin`/`process.stdout` so the CLI bootstrap is a
 * one-liner (`runLspStdio(runner)`); tests inject a pre-populated Readable + a
 * sink Writable to exercise the full frame→handle→frame loop without spawning a
 * child process.
 *
 * @module
 */

import type { Readable, Writable } from 'node:stream';
import { encodeFrame, makeFrameReader } from './framing.js';
import { handle, initialLspState, type LspServerState } from './server.js';
import type { LspNotification } from './server.js';
import type { LspGauntletRunner } from './types.js';
import type { JsonRpcResponse } from '../jsonrpc.js';

/** Serialize a response/notification to its framed wire string. */
function frameResponse(response: JsonRpcResponse): string {
  return encodeFrame(JSON.stringify(response));
}

/** Serialize a server→client notification (jsonrpc 2.0, no id) to its framed wire string. */
function frameNotification(notification: LspNotification): string {
  return encodeFrame(JSON.stringify({ jsonrpc: '2.0', method: notification.method, params: notification.params }));
}

/**
 * Run the LSP stdio loop until the input stream closes OR `exit` is received.
 * The gauntlet runner is INJECTED so the engine (and the heavy audit IR build it
 * depends on) stays in the CLI host; this driver never imports it. Returns once the
 * loop ends so the bootstrap can `process.exit` cleanly.
 */
export async function runLspStdio(
  runGauntlet: LspGauntletRunner,
  input: Readable = process.stdin,
  output: Writable = process.stdout,
): Promise<void> {
  const reader = makeFrameReader();
  let state: LspServerState = initialLspState();

  await new Promise<void>((resolveLoop, rejectLoop) => {
    // A SINGLE serial processing chain: every payload (across every chunk) is
    // appended to `queue`, so lifecycle state threads deterministically AND the
    // `end` handler can await the tail before resolving — no race where `end`
    // fires while a `czap/check` fold + its publishDiagnostics writes are still
    // in flight (the bug a fast in-memory Readable surfaces: it emits all data
    // then `end` on the same tick).
    let queue: Promise<void> = Promise.resolve();
    let done = false;

    const finish = (): void => {
      if (done) return;
      done = true;
      input.off('data', onData);
      resolveLoop();
    };

    const processOne = async (payload: string): Promise<void> => {
      if (done) return;
      const { state: next, result } = await handle(payload, state, runGauntlet);
      state = next;
      for (const notification of result.notifications) {
        output.write(frameNotification(notification));
      }
      if (result.response !== null) {
        output.write(frameResponse(result.response));
      }
      if (result.exit) finish();
    };

    function onData(chunk: Buffer | string): void {
      // Append every complete frame this chunk completed onto the serial queue.
      for (const payload of reader.push(chunk)) {
        queue = queue.then(() => processOne(payload));
      }
      queue.catch(rejectLoop);
    }

    input.on('data', onData);
    // Resolve only AFTER the queued work drains (the tail), not on the raw event.
    input.once('end', () => void queue.then(finish).catch(rejectLoop));
    input.once('error', rejectLoop);
  });
}
