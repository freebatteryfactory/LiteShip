/**
 * LSP base-protocol framing — `Content-Length: N\r\n\r\n<json>`.
 *
 * The LSP wire is JSON-RPC 2.0 (the same kernel `jsonrpc.ts` parses) but framed
 * differently from MCP's newline-delimited stdio: each message is a header block
 * (`Content-Length: <bytes>\r\n`, optional `Content-Type`, terminated by a blank
 * `\r\n`) followed by exactly `<bytes>` of UTF-8 JSON
 * (https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#baseProtocol).
 *
 * This module is the framing seam ONLY: a stateful byte-accumulating
 * {@link makeFrameReader} that yields complete JSON payload strings as headers
 * resolve, and {@link encodeFrame} that wraps a payload string in its header.
 * Parsing the payload as JSON-RPC reuses the existing kernel (`JsonRpcServer.parse`);
 * dispatching it is {@link module:lsp/server}. PURE-by-construction: the reader
 * is a closure over a buffer, no I/O — the caller pumps bytes in.
 *
 * @module
 */

import { Buffer } from 'node:buffer';
import { InvariantViolationError } from '@czap/error';

/** The header that carries the payload byte-length (§baseProtocol). */
const CONTENT_LENGTH_HEADER = 'content-length';

/** The CRLF-CRLF that terminates the header block. */
const HEADER_TERMINATOR = '\r\n\r\n';

/**
 * A stateful frame reader. Feed it incoming chunks (`push`); it returns the zero
 * or more complete JSON payload strings that became available. Bytes are
 * accumulated in a `Buffer` so a multi-byte UTF-8 character split across two TCP
 * chunks is never mis-sliced (the Content-Length is a BYTE count, decoded only
 * once a full frame is present).
 */
export interface FrameReader {
  /** Feed a chunk; return every complete payload string the buffer now yields. */
  readonly push: (chunk: Buffer | string) => readonly string[];
}

/**
 * Build a {@link FrameReader}. The buffer grows until a full header block + its
 * declared payload byte-count are present, then emits the payload and advances.
 * A malformed header (missing/non-numeric Content-Length) is a protocol
 * violation — surfaced as a tagged {@link InvariantViolationError}, never
 * silently dropped (the §baseProtocol contract is broken; the stream cannot be
 * realigned without a length).
 */
export function makeFrameReader(): FrameReader {
  let buffer: Buffer = Buffer.concat([]);

  const drain = (): readonly string[] => {
    const out: string[] = [];
    for (;;) {
      const headerEnd = buffer.indexOf(HEADER_TERMINATOR);
      if (headerEnd === -1) break; // header block not yet complete
      const headerText = buffer.subarray(0, headerEnd).toString('ascii');
      const contentLength = parseContentLength(headerText);
      const bodyStart = headerEnd + HEADER_TERMINATOR.length;
      if (buffer.length - bodyStart < contentLength) break; // body not yet complete
      const body = buffer.subarray(bodyStart, bodyStart + contentLength).toString('utf8');
      buffer = buffer.subarray(bodyStart + contentLength);
      out.push(body);
    }
    return out;
  };

  return {
    push: (chunk: Buffer | string): readonly string[] => {
      const incoming = typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk;
      buffer = buffer.length === 0 ? incoming : Buffer.concat([buffer, incoming]);
      return drain();
    },
  };
}

/**
 * Parse the `Content-Length` value out of an LSP header block. Headers are
 * case-insensitive field names (§baseProtocol cites HTTP header semantics), one
 * per `\r\n`-delimited line. A missing or non-numeric length is a protocol
 * violation (the frame length is mandatory and the only realignment anchor).
 */
function parseContentLength(headerText: string): number {
  for (const line of headerText.split('\r\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    if (line.slice(0, colon).trim().toLowerCase() !== CONTENT_LENGTH_HEADER) continue;
    const value = Number(line.slice(colon + 1).trim());
    if (!Number.isInteger(value) || value < 0) {
      throw InvariantViolationError(
        'lsp-framing',
        `Content-Length must be a non-negative integer (got: ${line.slice(colon + 1).trim()})`,
      );
    }
    return value;
  }
  throw InvariantViolationError('lsp-framing', 'LSP frame is missing the mandatory Content-Length header');
}

/**
 * Wrap a JSON payload string in its LSP frame: the `Content-Length` header (the
 * UTF-8 BYTE length, not the character count), a blank line, then the payload.
 * PURE: a string transform.
 */
export function encodeFrame(payload: string): string {
  const byteLength = Buffer.byteLength(payload, 'utf8');
  return `Content-Length: ${byteLength}\r\n\r\n${payload}`;
}
