/**
 * SPSCRing -- lock-free single-producer single-consumer ring buffer
 * backed by SharedArrayBuffer.
 *
 * Designed for real-time compositor state streaming between a Worker
 * (producer) and the main thread (consumer) without blocking either side.
 *
 * ## SharedArrayBuffer requirements
 *
 * SharedArrayBuffer requires the page to be served with the following
 * HTTP headers (COOP/COEP):
 *
 *   Cross-Origin-Opener-Policy: same-origin
 *   Cross-Origin-Embedder-Policy: require-corp
 *
 * Without these headers, `new SharedArrayBuffer(...)` will throw.
 *
 * ## Memory layout
 *
 * ```
 * Int32Array view (control region):
 *   [0]: write cursor  (atomically incremented by producer)
 *   [1]: read cursor   (atomically incremented by consumer)
 *   [2]: slotCount     (written once by createPair)
 *   [3]: slotSize      (written once by createPair)
 *
 * Float64Array view (data region):
 *   Offset = 16 bytes (aligned after four Int32 control slots)
 *   [0 .. slotCount * slotSize - 1]: ring buffer data slots
 * ```
 *
 * The ring geometry lives in the buffer header, so `attachProducer` /
 * `attachConsumer` need only the SharedArrayBuffer — a slotCount/slotSize
 * mismatch between threads is structurally impossible.
 *
 * The producer writes at `writeCursor % slotCount`, the consumer reads
 * at `readCursor % slotCount`. The buffer is full when
 * `write - read === slotCount`, empty when `write === read`.
 *
 * Only `Atomics.load` and `Atomics.store` are used -- no `Atomics.wait`
 * or `Atomics.notify` -- keeping this fully lock-free and non-blocking.
 *
 * @module
 */

import { HostCapabilityError, InvariantViolationError, ValidationError } from '@liteship/error';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Int32 indices of the control slots. */
const WRITE_CURSOR_INDEX = 0;
const READ_CURSOR_INDEX = 1;
const SLOT_COUNT_INDEX = 2;
const SLOT_SIZE_INDEX = 3;

/**
 * Byte size of the control region: four Int32 values (16 bytes) —
 * two cursors plus the ring geometry — 8-byte aligned for the
 * Float64 data region.
 */
const CONTROL_BYTES = 16;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Producer- or consumer-side handle to a single-producer/single-consumer
 * ring buffer backed by `SharedArrayBuffer`. Created by
 * {@link SPSCRing.attachProducer} or {@link SPSCRing.attachConsumer}.
 */
export interface SPSCRingBufferShape {
  /**
   * Push a data slot into the ring buffer.
   * Returns `false` if the buffer is full (non-blocking).
   */
  push(data: Float64Array): boolean;

  /**
   * Pop a data slot from the ring buffer into the provided output array.
   * Returns `false` if the buffer is empty (non-blocking).
   */
  pop(out: Float64Array): boolean;

  /** Number of slots in the ring buffer. */
  readonly capacity: number;

  /** Current number of occupied slots. */
  readonly count: number;
}

/**
 * A matched producer/consumer pair sharing one `SharedArrayBuffer`,
 * returned by {@link SPSCRing.createPair}. Named (rather than an inline
 * anonymous object) so the pair shape is a single referenceable type.
 */
export interface SPSCRingPair {
  /** The shared buffer carrying the control header + data slots. Transfer this to the Worker. */
  readonly buffer: SharedArrayBuffer;
  /** Producer-side handle (push-only). */
  readonly producer: SPSCRingBufferShape;
  /** Consumer-side handle (pop-only). */
  readonly consumer: SPSCRingBufferShape;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

function _createBuffer(slotCount: number, slotSize: number): SharedArrayBuffer {
  const dataBytes = slotCount * slotSize * Float64Array.BYTES_PER_ELEMENT;
  const sab = new SharedArrayBuffer(CONTROL_BYTES + dataBytes);
  // Ring geometry lives in the buffer header so attach sites never
  // re-supply (or mismatch) it.
  const control = new Int32Array(sab, 0, 4);
  control[SLOT_COUNT_INDEX] = slotCount;
  control[SLOT_SIZE_INDEX] = slotSize;
  return sab;
}

/**
 * Read the ring geometry from the buffer header, validating any
 * explicitly re-supplied values against it. Explicit args are accepted
 * for back-compat with the pre-header protocol; a mismatch is a thrown
 * error instead of silent data corruption.
 */
function _readGeometry(
  sab: SharedArrayBuffer,
  fn: 'attachProducer' | 'attachConsumer',
  slotCount?: number,
  slotSize?: number,
): { slotCount: number; slotSize: number } {
  if (sab.byteLength < CONTROL_BYTES) {
    throw ValidationError(
      'spsc-ring',
      `SPSCRing.${fn}: buffer is only ${sab.byteLength} bytes — too small to carry the ${CONTROL_BYTES}-byte control header. Create it with SPSCRing.createPair(slotCount, slotSize).`,
    );
  }
  const header = new Int32Array(sab, 0, 4);
  const headerSlotCount = header[SLOT_COUNT_INDEX]!;
  const headerSlotSize = header[SLOT_SIZE_INDEX]!;
  if (headerSlotCount <= 0 || headerSlotSize <= 0) {
    throw ValidationError(
      'spsc-ring',
      `SPSCRing.${fn}: buffer header carries no ring geometry (slotCount ${headerSlotCount}, slotSize ${headerSlotSize}) — the buffer was not created by SPSCRing.createPair, or predates the 16-byte header layout. Recreate it with SPSCRing.createPair(slotCount, slotSize).`,
    );
  }
  if (
    (slotCount !== undefined && slotCount !== headerSlotCount) ||
    (slotSize !== undefined && slotSize !== headerSlotSize)
  ) {
    throw ValidationError(
      'spsc-ring',
      `SPSCRing.${fn}: this buffer was created with slotCount ${headerSlotCount} / slotSize ${headerSlotSize}, but you passed slotCount ${slotCount ?? headerSlotCount} / slotSize ${slotSize ?? headerSlotSize}. Drop the extra arguments — the buffer header carries the geometry — or pass the exact values given to createPair.`,
    );
  }
  return { slotCount: headerSlotCount, slotSize: headerSlotSize };
}

function _makeRing(
  sab: SharedArrayBuffer,
  slotCount: number,
  slotSize: number,
  role: 'producer' | 'consumer',
): SPSCRingBufferShape {
  if (slotCount <= 0 || !Number.isInteger(slotCount)) {
    throw InvariantViolationError(
      'spsc-ring',
      `SPSCRingBuffer: slotCount must be a positive integer, got ${slotCount}`,
    );
  }
  if (slotSize <= 0 || !Number.isInteger(slotSize)) {
    throw InvariantViolationError('spsc-ring', `SPSCRingBuffer: slotSize must be a positive integer, got ${slotSize}`);
  }
  const control = new Int32Array(sab, 0, 2);
  const data = new Float64Array(sab, CONTROL_BYTES);

  return {
    push(input: Float64Array): boolean {
      if (role !== 'producer') {
        throw InvariantViolationError(
          'spsc-ring',
          'SPSCRing: this handle is the consumer side — push() is producer-only. Inside the worker, call SPSCRing.attachProducer(buffer) and push on that handle.',
        );
      }
      if (input.length !== slotSize) {
        throw ValidationError(
          'spsc-ring',
          `SPSCRing: this ring was created with slotSize ${slotSize} but you pushed a Float64Array of length ${input.length}. Allocate your scratch array once with new Float64Array(${slotSize}) and reuse it.`,
        );
      }

      const write = Atomics.load(control, WRITE_CURSOR_INDEX);
      const read = Atomics.load(control, READ_CURSOR_INDEX);

      // Full when write - read === slotCount
      if (write - read >= slotCount) {
        return false;
      }

      const slotIndex = (write % slotCount) * slotSize;
      for (let i = 0; i < slotSize; i++) {
        data[slotIndex + i] = input[i]!;
      }

      // Store with release semantics: the data write must be visible
      // before the cursor advances. Atomics.store on Int32Array provides
      // a sequentially consistent store which is stronger than needed
      // but correct.
      Atomics.store(control, WRITE_CURSOR_INDEX, write + 1);
      return true;
    },

    pop(out: Float64Array): boolean {
      if (role !== 'consumer') {
        throw InvariantViolationError(
          'spsc-ring',
          'SPSCRing: this handle is the producer side — pop() is consumer-only. On the consuming thread, call SPSCRing.attachConsumer(buffer) and pop on that handle.',
        );
      }
      if (out.length !== slotSize) {
        throw ValidationError(
          'spsc-ring',
          `SPSCRing: this ring was created with slotSize ${slotSize} but you popped into a Float64Array of length ${out.length}. Allocate your scratch array once with new Float64Array(${slotSize}) and reuse it.`,
        );
      }

      const write = Atomics.load(control, WRITE_CURSOR_INDEX);
      const read = Atomics.load(control, READ_CURSOR_INDEX);

      // Empty when write === read
      if (write === read) {
        return false;
      }

      const slotIndex = (read % slotCount) * slotSize;
      for (let i = 0; i < slotSize; i++) {
        out[i] = data[slotIndex + i]!;
      }

      Atomics.store(control, READ_CURSOR_INDEX, read + 1);
      return true;
    },

    get capacity(): number {
      return slotCount;
    },

    get count(): number {
      const write = Atomics.load(control, WRITE_CURSOR_INDEX);
      const read = Atomics.load(control, READ_CURSOR_INDEX);
      return write - read;
    },
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a matched producer/consumer pair sharing the same SharedArrayBuffer.
 *
 * Typically called on the main thread; the `buffer` (SharedArrayBuffer) is
 * then transferred to the Worker via `postMessage`, and the Worker calls
 * `SPSCRing.attachProducer(buffer)` to get its side of the ring — the
 * ring geometry rides in the buffer header, so nothing else needs to be
 * shuttled through the message protocol.
 *
 * @example
 * ```ts
 * import { SPSCRing } from '@liteship/worker';
 *
 * const { buffer, producer, consumer } = SPSCRing.createPair(64, 4);
 * // producer.push(new Float64Array([1, 2, 3, 4])); // true
 * // consumer.pop(new Float64Array(4));              // true
 * // Transfer buffer to a Worker via postMessage
 * worker.postMessage({ buffer });
 * ```
 *
 * The two arguments are both bare positive integers and are NOT
 * interchangeable: `slotCount` is the ring depth (how many entries),
 * `slotSize` the entry width (Float64 lanes per entry). Transposing them
 * silently produces a different geometry rather than an error, so the
 * order is `(depth, width)` — same order as the memory-layout header
 * above (`[2]: slotCount`, `[3]: slotSize`). Each is guarded as a positive
 * integer ({@link _makeRing} throws otherwise), so `0`/negative/fractional
 * values fail loudly.
 *
 * @param slotCount - Ring depth: number of slots (power of 2 recommended)
 * @param slotSize  - Entry width: number of Float64 values per slot
 * @returns A {@link SPSCRingPair}: the shared buffer + producer/consumer handles
 */
function _createPair(slotCount: number, slotSize: number): SPSCRingPair {
  // Preflight the environment so the failure teaches the COOP/COEP
  // requirement instead of surfacing the browser's bare ReferenceError /
  // constructor TypeError. The crossOriginIsolated probe only applies
  // where that global exists (browsers) — Node and test runners expose
  // SharedArrayBuffer without isolation.
  if (
    typeof SharedArrayBuffer === 'undefined' ||
    (typeof crossOriginIsolated !== 'undefined' && !crossOriginIsolated)
  ) {
    throw HostCapabilityError(
      'SharedArrayBuffer',
      'SPSCRing.createPair: SharedArrayBuffer is unavailable because this page is not cross-origin isolated. Serve it with "Cross-Origin-Opener-Policy: same-origin" and "Cross-Origin-Embedder-Policy: require-corp" — @liteship/astro sets these headers for you.',
    );
  }
  const buffer = _createBuffer(slotCount, slotSize);
  return {
    buffer,
    producer: _makeRing(buffer, slotCount, slotSize, 'producer'),
    consumer: _makeRing(buffer, slotCount, slotSize, 'consumer'),
  };
}

/**
 * Attach as producer to an existing SharedArrayBuffer.
 * Call this inside the Worker that produces data.
 *
 * @example
 * ```ts
 * import { SPSCRing } from '@liteship/worker';
 *
 * // Inside a Worker's message handler:
 * self.onmessage = (e) => {
 *   const producer = SPSCRing.attachProducer(e.data.buffer);
 *   const data = new Float64Array([1.0, 2.0, 3.0, 4.0]);
 *   producer.push(data); // true if buffer not full
 * };
 * ```
 *
 * @param sab       - The SharedArrayBuffer from the main thread
 * @param slotCount - Optional; validated against the buffer header (a mismatch throws)
 * @param slotSize  - Optional; validated against the buffer header (a mismatch throws)
 * @returns A producer-side {@link SPSCRingBufferShape}
 */
function _attachProducer(sab: SharedArrayBuffer, slotCount?: number, slotSize?: number): SPSCRingBufferShape {
  const geometry = _readGeometry(sab, 'attachProducer', slotCount, slotSize);
  return _makeRing(sab, geometry.slotCount, geometry.slotSize, 'producer');
}

/**
 * Attach as consumer to an existing SharedArrayBuffer.
 * Call this on the main thread that consumes data.
 *
 * @example
 * ```ts
 * import { SPSCRing } from '@liteship/worker';
 *
 * // On the main thread after receiving buffer from Worker:
 * const consumer = SPSCRing.attachConsumer(sharedBuffer);
 * const out = new Float64Array(4);
 * if (consumer.pop(out)) {
 *   console.log('Received:', out); // Float64Array [1.0, 2.0, 3.0, 4.0]
 * }
 * ```
 *
 * @param sab       - The SharedArrayBuffer shared with the producer
 * @param slotCount - Optional; validated against the buffer header (a mismatch throws)
 * @param slotSize  - Optional; validated against the buffer header (a mismatch throws)
 * @returns A consumer-side {@link SPSCRingBufferShape}
 */
function _attachConsumer(sab: SharedArrayBuffer, slotCount?: number, slotSize?: number): SPSCRingBufferShape {
  const geometry = _readGeometry(sab, 'attachConsumer', slotCount, slotSize);
  return _makeRing(sab, geometry.slotCount, geometry.slotSize, 'consumer');
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/**
 * SPSC ring buffer namespace.
 *
 * Lock-free single-producer single-consumer ring buffer backed by
 * `SharedArrayBuffer`. Designed for real-time compositor state streaming
 * between a Worker (producer) and the main thread (consumer) without
 * blocking either side. Uses only `Atomics.load`/`Atomics.store` --
 * fully non-blocking.
 *
 * @example
 * ```ts
 * import { SPSCRing } from '@liteship/worker';
 *
 * // Main thread: create pair and send buffer to Worker
 * const { buffer, producer, consumer } = SPSCRing.createPair(128, 8);
 * worker.postMessage({ buffer });
 *
 * // In Worker: attach as producer (geometry rides in the buffer header)
 * // const producer = SPSCRing.attachProducer(buffer);
 * // producer.push(new Float64Array(8));
 *
 * // Main thread: consume in animation loop
 * const out = new Float64Array(8);
 * function frame() {
 *   while (consumer.pop(out)) { /* process out *\/ }
 *   requestAnimationFrame(frame);
 * }
 * ```
 */
export const SPSCRing = {
  createPair: _createPair,
  attachProducer: _attachProducer,
  attachConsumer: _attachConsumer,
} as const;

export declare namespace SPSCRing {
  /** Producer- or consumer-facing view of a SPSC ring buffer. */
  export type Shape = SPSCRingBufferShape;
}
