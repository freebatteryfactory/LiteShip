/**
 * Pure resumption utilities -- Effect-free.
 *
 * Extracted from resumption.ts for use by client directives.
 *
 * @module
 */

import { HLC } from '@liteship/core';

/**
 * Decode a colon-containing id as canonical HLC wire format, or `undefined` when it
 * is not canonical HLC. `HLC.decode` throwing is a FORMAT-DETECTION signal (the id is
 * a legacy shape), not an error to surface — returning `undefined` lets the caller
 * fall through to the legacy parsers, which is the expected legacy-id path. Isolating
 * the decode here turns the caught format-mismatch into an explicit "not canonical"
 * return instead of a silently-swallowed error.
 */
function decodeCanonicalHlc(
  eventId: string,
): { raw: string; sequence: number; timestamp?: number; nodeId?: string } | undefined {
  let parsed: { raw: string; sequence: number; timestamp?: number; nodeId?: string } | undefined;
  try {
    const decoded = HLC.decode(eventId);
    parsed = {
      raw: eventId,
      sequence: decoded.counter,
      timestamp: decoded.wall_ms,
      nodeId: decoded.node_id,
    };
  } catch {
    // Not canonical HLC — the id is a legacy shape; record `undefined` (undecodable)
    // so the caller falls through to the legacy parsers (the expected legacy-id path).
    parsed = undefined;
  }
  return parsed;
}

/**
 * Parse an event ID to extract sequence number and other components.
 *
 * Primary: canonical HLC wire format (`HLC.encode` — colon-separated hex).
 * Legacy: numeric ("123"), prefixed ("evt-123"), dash-decimal resumption ids.
 */
export const parseEventId = (
  eventId: string,
): { raw: string; sequence: number; timestamp?: number; nodeId?: string } => {
  if (eventId.includes(':')) {
    const canonical = decodeCanonicalHlc(eventId);
    if (canonical !== undefined) return canonical;
  }

  const numericMatch = eventId.match(/^(\d+)$/);
  if (numericMatch) {
    return { raw: eventId, sequence: parseInt(numericMatch[1]!, 10) };
  }

  const prefixedMatch = eventId.match(/^[a-zA-Z]+-(\d+)$/);
  if (prefixedMatch) {
    return { raw: eventId, sequence: parseInt(prefixedMatch[1]!, 10) };
  }

  const hlcMatch = eventId.match(/^(\d+)-(\d+)-(.+)$/);
  if (hlcMatch) {
    return {
      raw: eventId,
      sequence: parseInt(hlcMatch[2]!, 10),
      timestamp: parseInt(hlcMatch[1]!, 10),
      nodeId: hlcMatch[3]!,
    };
  }

  const hlcSimpleMatch = eventId.match(/^(\d+)-(\d+)$/);
  if (hlcSimpleMatch) {
    return {
      raw: eventId,
      sequence: parseInt(hlcSimpleMatch[2]!, 10),
      timestamp: parseInt(hlcSimpleMatch[1]!, 10),
    };
  }

  const anyNumberMatch = eventId.match(/(\d+)$/);
  if (anyNumberMatch) {
    return { raw: eventId, sequence: parseInt(anyNumberMatch[1]!, 10) };
  }

  return { raw: eventId, sequence: 0 };
};

/**
 * Check if resumption is possible by comparing event IDs.
 */
export const canResume = (lastEventId: string, serverOldestId: string): boolean => {
  if (!serverOldestId) return true;
  if (!lastEventId) return false;

  const lastParsed = parseEventId(lastEventId);
  const serverParsed = parseEventId(serverOldestId);

  if (lastParsed.timestamp !== undefined && serverParsed.timestamp !== undefined) {
    if (lastParsed.timestamp !== serverParsed.timestamp) {
      return lastParsed.timestamp >= serverParsed.timestamp;
    }
    return lastParsed.sequence >= serverParsed.sequence;
  }

  if (lastParsed.sequence !== 0 || serverParsed.sequence !== 0) {
    return lastParsed.sequence >= serverParsed.sequence;
  }

  const lastNum = Number(lastEventId);
  const serverNum = Number(serverOldestId);
  if (!isNaN(lastNum) && !isNaN(serverNum)) {
    return lastNum >= serverNum;
  }

  return lastEventId >= serverOldestId;
};
