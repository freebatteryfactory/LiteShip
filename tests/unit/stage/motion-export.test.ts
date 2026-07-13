/**
 * Stage authored-motion export (#130) — the video leg's content-addressed track.
 *
 * `exportMotionTrack` samples the ONE shared kernel (`sampleProgram`) at every frame and
 * content-addresses the folded per-frame CSS through the SAME `CanonicalCbor.encode` →
 * `AddressedDigest.of` kernel the dual-export carrier uses (ADR-0003/0011/0040). The digest
 * IS the built-in oracle for the video leg: the SAME program + frame count addresses
 * identically, while a different program or frame count addresses differently. The
 * cross-target parity oracle proves the frame VALUES equal the reference; this proves the
 * content-addressing carrier around them.
 */
import { describe, test, expect } from 'vitest';
import { exportMotionTrack, sampleMotionFrames } from '../../../packages/stage/src/motion-export.js';
import { MOTION_PARITY_FIXTURES } from '../../fixtures/motion-parity/programs.js';

const revealPlan = MOTION_PARITY_FIXTURES.find((f) => f.name === 'single-reveal-spring')!.plan;
const seqPlan = MOTION_PARITY_FIXTURES.find((f) => f.name === 'seq-2-linear')!.plan;

describe('exportMotionTrack — content-addressed authored-motion track', () => {
  test('carries every sampled frame verbatim plus a real artifact digest', () => {
    const track = exportMotionTrack(revealPlan, 9);
    expect(track.totalFrames).toBe(9);
    expect(track.frames).toHaveLength(9);
    // The frames ARE the shared-kernel samples — same indices, same typed values.
    expect(track.frames).toEqual(sampleMotionFrames(revealPlan, 9));
    // The endpoints land exactly on t=0 and t=1 (endpoint-inclusive frame mapping).
    expect(track.frames[0]!.t).toBe(0);
    expect(track.frames.at(-1)!.t).toBe(1);
    // A genuine content address, not an empty placeholder.
    expect(track.artifactDigest.integrity_digest.length).toBeGreaterThan(0);
  });

  test('is deterministic — the SAME program + frame count addresses identically (the oracle)', () => {
    expect(exportMotionTrack(revealPlan, 9).artifactDigest).toEqual(exportMotionTrack(revealPlan, 9).artifactDigest);
  });

  test('a different frame count addresses differently', () => {
    expect(exportMotionTrack(revealPlan, 9).artifactDigest.integrity_digest).not.toBe(
      exportMotionTrack(revealPlan, 12).artifactDigest.integrity_digest,
    );
  });

  test('a different program addresses differently — the digest pins the exact motion', () => {
    expect(exportMotionTrack(revealPlan, 9).artifactDigest.integrity_digest).not.toBe(
      exportMotionTrack(seqPlan, 9).artifactDigest.integrity_digest,
    );
  });
});
