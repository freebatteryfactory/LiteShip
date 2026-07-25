/** Structural PNG/JPEG/WebP header decoder. Recognized malformed formats refuse. */

import { ParseError } from '@liteship/error';

/** Decoded image format + dimensions. */
export interface DecodedImage {
  readonly format: 'png' | 'jpeg' | 'webp' | 'unknown';
  readonly width: number;
  readonly height: number;
}

const PNG_SIGNATURE = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function startsWith(view: DataView, bytes: Uint8Array): boolean {
  if (view.byteLength < bytes.byteLength) return false;
  for (let index = 0; index < bytes.byteLength; index++) if (view.getUint8(index) !== bytes[index]) return false;
  return true;
}

function fourCC(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );
}

function malformed(format: string, detail: string, offset: number): never {
  throw ParseError(`image.${format}`, detail, { code: 'malformed', offset });
}

/** Probe an image buffer for format and dimensions. */
export async function imageDecoder(bytes: ArrayBuffer): Promise<DecodedImage> {
  const view = new DataView(bytes);
  if (startsWith(view, PNG_SIGNATURE)) return decodePng(view);
  if (view.byteLength >= 2 && view.getUint16(0) === 0xffd8) return decodeJpeg(view);
  if (view.byteLength >= 12 && fourCC(view, 0) === 'RIFF' && fourCC(view, 8) === 'WEBP') return decodeWebp(view);
  return { format: 'unknown', width: 0, height: 0 };
}

function decodePng(view: DataView): DecodedImage {
  if (view.byteLength < 24) malformed('png', 'PNG is truncated before the IHDR dimensions.', view.byteLength);
  const ihdrLength = view.getUint32(8);
  if (ihdrLength !== 13 || fourCC(view, 12) !== 'IHDR') {
    malformed('png', 'PNG must begin with a 13-byte IHDR chunk.', 8);
  }
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  if (width === 0 || height === 0) malformed('png', 'PNG width and height must both be non-zero.', 16);
  return { format: 'png', width, height };
}

function isStartOfFrame(marker: number): boolean {
  return marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
}

function decodeJpeg(view: DataView): DecodedImage {
  let offset = 2;
  while (offset < view.byteLength) {
    while (offset < view.byteLength && view.getUint8(offset) !== 0xff) offset++;
    if (offset >= view.byteLength) break;
    while (offset < view.byteLength && view.getUint8(offset) === 0xff) offset++;
    if (offset >= view.byteLength) malformed('jpeg', 'JPEG ends inside a marker prefix.', offset - 1);
    const marker = view.getUint8(offset++);
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > view.byteLength) malformed('jpeg', 'JPEG segment is missing its length.', offset);
    const segmentLength = view.getUint16(offset);
    if (segmentLength < 2)
      malformed('jpeg', `JPEG segment 0x${marker.toString(16)} has invalid length ${segmentLength}.`, offset);
    const segmentEnd = offset + segmentLength;
    if (segmentEnd > view.byteLength) malformed('jpeg', 'JPEG segment extends beyond the input buffer.', offset);
    if (isStartOfFrame(marker)) {
      if (segmentLength < 8) malformed('jpeg', 'JPEG SOF segment is too short for dimensions.', offset);
      const height = view.getUint16(offset + 3);
      const width = view.getUint16(offset + 5);
      if (width === 0 || height === 0) malformed('jpeg', 'JPEG width and height must both be non-zero.', offset + 3);
      return { format: 'jpeg', width, height };
    }
    offset = segmentEnd;
  }
  return malformed('jpeg', 'JPEG contains no structural start-of-frame dimensions.', offset);
}

function readUint24LE(view: DataView, offset: number): number {
  return view.getUint8(offset) | (view.getUint8(offset + 1) << 8) | (view.getUint8(offset + 2) << 16);
}

function decodeWebp(view: DataView): DecodedImage {
  const declaredEnd = 8 + view.getUint32(4, true);
  if (declaredEnd > view.byteLength) malformed('webp', 'WebP RIFF extent exceeds the input buffer.', 4);
  if (declaredEnd < 20) malformed('webp', 'WebP is truncated before its image chunk.', declaredEnd);
  const kind = fourCC(view, 12);
  const size = view.getUint32(16, true);
  if (20 + size > declaredEnd) malformed('webp', `${kind} chunk extends beyond the WebP RIFF extent.`, 16);

  let width: number;
  let height: number;
  if (kind === 'VP8X') {
    if (size < 10) malformed('webp', 'VP8X chunk is too short for canvas dimensions.', 16);
    width = readUint24LE(view, 24) + 1;
    height = readUint24LE(view, 27) + 1;
  } else if (kind === 'VP8L') {
    if (size < 5 || view.getUint8(20) !== 0x2f) malformed('webp', 'VP8L chunk has an invalid lossless signature.', 20);
    const b1 = view.getUint8(21);
    const b2 = view.getUint8(22);
    const b3 = view.getUint8(23);
    const b4 = view.getUint8(24);
    width = 1 + (b1 | ((b2 & 0x3f) << 8));
    height = 1 + ((b2 >>> 6) | (b3 << 2) | ((b4 & 0x0f) << 10));
  } else if (kind === 'VP8 ') {
    if (size < 10 || view.getUint8(23) !== 0x9d || view.getUint8(24) !== 0x01 || view.getUint8(25) !== 0x2a) {
      malformed('webp', 'VP8 chunk is missing its key-frame dimension signature.', 20);
    }
    width = view.getUint16(26, true) & 0x3fff;
    height = view.getUint16(28, true) & 0x3fff;
  } else {
    return malformed('webp', `Unsupported WebP image chunk ${JSON.stringify(kind)}.`, 12);
  }
  if (width === 0 || height === 0) malformed('webp', 'WebP width and height must both be non-zero.', 20);
  return { format: 'webp', width, height };
}
