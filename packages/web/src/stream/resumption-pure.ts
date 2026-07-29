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

function isAsciiDigits(value: string): boolean {
  if (value.length === 0) return false;
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code < 48 || code > 57) return false;
  }
  return true;
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

  if (isAsciiDigits(eventId)) {
    return { raw: eventId, sequence: Number.parseInt(eventId, 10) };
  }

  const firstDash = eventId.indexOf('-');
  const secondDash = firstDash < 0 ? -1 : eventId.indexOf('-', firstDash + 1);
  const prefix = firstDash > 0 ? eventId.slice(0, firstDash) : '';
  const suffix = firstDash > 0 ? eventId.slice(firstDash + 1) : '';
  let alphabeticPrefix = prefix.length > 0;
  for (let index = 0; index < prefix.length; index++) {
    const code = prefix.charCodeAt(index);
    if (!((code >= 65 && code <= 90) || (code >= 97 && code <= 122))) alphabeticPrefix = false;
  }
  if (secondDash < 0 && alphabeticPrefix && isAsciiDigits(suffix)) {
    return { raw: eventId, sequence: Number.parseInt(suffix, 10) };
  }

  if (firstDash > 0 && secondDash > firstDash + 1 && secondDash < eventId.length - 1) {
    const timestamp = eventId.slice(0, firstDash);
    const sequence = eventId.slice(firstDash + 1, secondDash);
    if (isAsciiDigits(timestamp) && isAsciiDigits(sequence)) {
      return {
        raw: eventId,
        sequence: Number.parseInt(sequence, 10),
        timestamp: Number.parseInt(timestamp, 10),
        nodeId: eventId.slice(secondDash + 1),
      };
    }
  }

  if (firstDash > 0 && secondDash < 0 && isAsciiDigits(prefix) && isAsciiDigits(suffix)) {
    return {
      raw: eventId,
      sequence: Number.parseInt(suffix, 10),
      timestamp: Number.parseInt(prefix, 10),
    };
  }

  let digitStart = eventId.length;
  while (digitStart > 0) {
    const code = eventId.charCodeAt(digitStart - 1);
    if (code < 48 || code > 57) break;
    digitStart--;
  }
  if (digitStart < eventId.length) {
    return { raw: eventId, sequence: Number.parseInt(eventId.slice(digitStart), 10) };
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
