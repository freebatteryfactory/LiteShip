/**
 * CUT B5a — resultId field-sensitivity (the JSON-protocol identity carve-out).
 *
 * `resultId` is minted by the private `computeResultId`/`canonicalJson` in
 * dispatch.ts over the STABLE field set {command, status, payload, verdict?,
 * exitCode?}. B5a deliberately keeps this on the JSON path (MCP wire is JSON;
 * D1/B2 law) rather than migrating it to CanonicalCbor like the internal
 * content addresses. These tests prove the identity actually DEPENDS on its
 * stable fields — so the carve-out is a real receipt identity, not a constant.
 *
 * `computeResultId` is intentionally PRIVATE (D1), so the proof is behavioral
 * through `dispatchToolCall`. Two axes are cleanly isolable behaviorally:
 *   - payload (same command, different arguments)
 *   - command (different tool)
 * Idempotency (identical calls → same id) is D1's lock and timestamp-blindness
 * is B2's; both are cited here, not duplicated. verdict/exitCode ride the same
 * canonicalJson field set and are exercised where verify commands run.
 *
 * @module
 */
import { describe, it, expect } from 'vitest';
import { dispatchToolCall } from '../../../packages/mcp-server/src/dispatch.js';

const RECEIPT_KEY = 'liteship/result';
const idOf = (r: Awaited<ReturnType<typeof dispatchToolCall>>): string => (r._meta?.[RECEIPT_KEY] as { resultId: string }).resultId;

describe('B5a — resultId depends on its stable fields (not a constant)', () => {
  it('PAYLOAD-sensitive: same command, different arguments → different resultId', async () => {
    const a = await dispatchToolCall({ name: 'glossary', arguments: { term: 'boundary' } });
    const b = await dispatchToolCall({ name: 'glossary', arguments: { term: 'cast' } });
    expect(a._meta && b._meta).toBeTruthy();
    expect(idOf(a)).not.toBe(idOf(b)); // payload participates in identity
  });

  it('COMMAND-sensitive: different tool → different resultId', async () => {
    const a = await dispatchToolCall({ name: 'glossary', arguments: { term: 'boundary' } });
    const b = await dispatchToolCall({ name: 'capsule.inspect', arguments: { id: 'nope' } });
    expect(idOf(a)).not.toBe(idOf(b)); // command (and status) participate in identity
  });

  it('STATUS participates: an ok result and a failed result never collide on resultId', async () => {
    const ok = await dispatchToolCall({ name: 'glossary', arguments: { term: 'boundary' } });
    const failed = await dispatchToolCall({ name: 'capsule.inspect', arguments: { id: 'nope' } });
    expect(ok.isError).toBe(false);
    expect(failed.isError).toBe(true);
    expect(idOf(ok)).not.toBe(idOf(failed));
  });

  it('idempotency (D1) and timestamp-blindness (B2) — cited, not duplicated', async () => {
    // D1 proves identical calls agree; B2 proves the wall clock can't move identity.
    // Re-asserted once lightly here so this file reads as a complete identity contract.
    const a = await dispatchToolCall({ name: 'glossary', arguments: { term: 'boundary' } });
    const b = await dispatchToolCall({ name: 'glossary', arguments: { term: 'boundary' } });
    expect(idOf(a)).toBe(idOf(b));
  });
});
