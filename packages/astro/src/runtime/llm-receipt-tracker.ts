import type { Receipt, UIFrame } from '@liteship/core';
import { GenFrame } from '@liteship/core';
import { createReceiptChain } from './receipt-chain.js';
import type { LLMRenderPipeline, LLMRenderHost } from './llm-render-pipeline.js';

/**
 * Recent entries kept un-compacted ahead of the last-ack point — the replay
 * window the gap-resolver may still reach back into. Drop-only compaction never
 * touches anything newer than `lastAck − RETENTION_MARGIN`.
 */
const RETENTION_MARGIN = 64;

/**
 * Extra slack beyond the margin before a checkpoint is worth minting: a
 * compaction hashes via `crypto.subtle`, so we wait until enough entries have
 * accumulated below the window to make the reclamation worthwhile.
 */
const COMPACT_THRESHOLD = 32;

/** Tracks receipt chain, pending frames, envelope ingestion, and gap replay. */
export interface LLMReceiptTracker {
  readonly receiptChain: ReturnType<typeof createReceiptChain> | null;
  readonly lastAckReceiptId: UIFrame['receiptId'] | null;

  recordFrame(frame: UIFrame): void;
  rememberEnvelope(envelope: Receipt.Envelope): void;
  replayGap(pipeline: LLMRenderPipeline, host: LLMRenderHost): { readonly type: string };
  reset(): void;
}

/**
 * Build a fresh {@link LLMReceiptTracker}. Internally lazy-initialises
 * the receipt chain on the first envelope or gap replay, so idle LLM
 * sessions pay no storage cost.
 */
export function createLLMReceiptTracker(): LLMReceiptTracker {
  let _receiptChain: ReturnType<typeof createReceiptChain> | null = null;
  let _pendingFrames: UIFrame[] | null = null;
  let _lastAckReceiptId: UIFrame['receiptId'] | null = null;
  let _compacting = false;
  let _compactionEpoch = 0;

  /**
   * Auto-compact the receipt chain below `lastAck − margin` during envelope
   * ingestion and gap replay, never during per-frame recording.
   * Drop-only and bounded: resolves a watermark `margin` entries behind the
   * last-ack point in the canonical linearization and reclaims everything below
   * it. No-ops until enough entries have accumulated (margin + threshold) and is
   * re-entrancy-guarded so a single mint is ever in flight. Compaction is a
   * best-effort GC — its failure (e.g. a non-dominated watermark) is swallowed
   * rather than surfaced, since it can never affect correctness, only footprint.
   */
  function compactBelowAck(margin: number = RETENTION_MARGIN): void {
    if (_compacting) return;
    const chain = _receiptChain;
    if (!chain || _lastAckReceiptId === null) return;

    const hashes = chain.linearizedHashes();
    const ackIndex = hashes.indexOf(_lastAckReceiptId);
    // Need the ack point to sit at least margin+threshold deep before there is
    // anything worth reclaiming below the retention window.
    if (ackIndex < margin + COMPACT_THRESHOLD) return;

    const watermark = hashes[ackIndex - margin];
    if (watermark === undefined) return;

    _compacting = true;
    const epoch = _compactionEpoch;
    const settle = (): void => {
      // Only clear the guard if no reset() opened a new generation while this
      // compaction was in flight — a stale completion must not unlock (and so
      // allow overlapping) compaction on the new chain.
      if (epoch === _compactionEpoch) _compacting = false;
    };
    chain.compactBelow(watermark).then(settle, settle);
  }

  function getReceiptChain(): ReturnType<typeof createReceiptChain> {
    if (!_receiptChain) {
      _receiptChain = createReceiptChain();
      for (const frame of _pendingFrames ?? []) {
        _receiptChain.rememberFrame(frame);
      }
      _pendingFrames = null;
    }

    return _receiptChain;
  }

  const tracker: LLMReceiptTracker = {
    get receiptChain() {
      return _receiptChain;
    },
    get lastAckReceiptId() {
      return _lastAckReceiptId;
    },

    recordFrame(frame: UIFrame): void {
      _lastAckReceiptId = frame.receiptId;
      if (_receiptChain) {
        _receiptChain.rememberFrame(frame);
        return;
      }

      (_pendingFrames ??= []).push(frame);
    },

    rememberEnvelope(envelope: Receipt.Envelope): void {
      getReceiptChain().ingestEnvelope(envelope);
      // Envelope ingestion (not per-frame recording) is the debounce tick for
      // auto-compaction.
      compactBelowAck();
    },

    replayGap(pipeline: LLMRenderPipeline, host: LLMRenderHost): { readonly type: string } {
      pipeline.flushPendingText(host, tracker.recordFrame);
      const strategy = GenFrame.resolveGap(
        _lastAckReceiptId,
        pipeline.llmRuntime?.tokenBuffer.length ?? 0,
        getReceiptChain(),
        {
          canResume: false,
        },
      );
      if (strategy.type === 'replay') {
        for (const frame of strategy.frames) {
          pipeline.renderFrame(frame, host);
        }
      }

      // Gap replay is a natural non-frame-recording moment to reclaim history below ack.
      compactBelowAck();

      return strategy;
    },

    reset(): void {
      _lastAckReceiptId = null;
      _receiptChain = null;
      _pendingFrames = null;
      _compacting = false;
      // New generation: an in-flight compaction from the previous chain must not
      // clear `_compacting` for this one (see compactBelowAck's epoch guard).
      _compactionEpoch += 1;
    },
  };

  return tracker;
}
