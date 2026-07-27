import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { renderToCanvas } from '../../../packages/web/src/capture/render.js';
import * as MediabunnyBridge from '../../../packages/web/src/capture/mediabunny.js';
import { createWebCodecsCapture } from '../../../packages/web/src/capture/webcodecs.js';

// The `./mediabunny.js` shim re-exports the third-party mediabunny muxer classes.
// Rather than interaction-mock our own wrapper, we script the muxer boundary with
// fake classes and inject them through the implementation's encoder seam. The
// public createWebCodecsCapture type intentionally exposes only authored options;
// this source-level test capability must not pull Mediabunny declarations into
// the package's public type graph.
const mediabunnyState = {
  codecNames: [] as string[],
  packets: [] as Array<{ packet: unknown; metadata?: unknown }>,
  tracks: [] as Array<{ source: unknown; options: Record<string, unknown> }>,
  formatOptions: [] as Record<string, unknown>[],
  packetInputs: [] as unknown[],
  startCalls: 0,
  finalizeCalls: 0,
  cancelCalls: 0,
  cancelError: null as Error | null,
  buffer: new Uint8Array([1, 2, 3, 4]) as Uint8Array | null,
};

class BufferTargetFake {
  get buffer(): Uint8Array | null {
    return mediabunnyState.buffer;
  }
}

class EncodedVideoPacketSourceFake {
  constructor(codec: string) {
    mediabunnyState.codecNames.push(codec);
  }

  async add(packet: unknown, metadata?: unknown): Promise<void> {
    mediabunnyState.packets.push({ packet, metadata });
  }
}

class OutputFake {
  state = 'pending';

  constructor(_config: Record<string, unknown>) {}

  addVideoTrack(source: unknown, options: Record<string, unknown>): void {
    mediabunnyState.tracks.push({ source, options });
  }

  async start(): Promise<void> {
    mediabunnyState.startCalls++;
    this.state = 'started';
  }

  async finalize(): Promise<void> {
    mediabunnyState.finalizeCalls++;
    this.state = 'finalized';
  }

  async cancel(): Promise<void> {
    mediabunnyState.cancelCalls++;
    if (mediabunnyState.cancelError) throw mediabunnyState.cancelError;
    this.state = 'canceled';
  }
}

class Mp4OutputFormatFake {
  constructor(options: Record<string, unknown>) {
    mediabunnyState.formatOptions.push(options);
  }
}

const EncodedPacketFake = {
  fromEncodedChunk(chunk: unknown) {
    mediabunnyState.packetInputs.push(chunk);
    return { chunk };
  },
};

/** The scripted mediabunny encoder bundle injected into `createWebCodecsCapture`. */
const mediabunny = {
  BufferTarget: BufferTargetFake,
  EncodedPacket: EncodedPacketFake,
  EncodedVideoPacketSource: EncodedVideoPacketSourceFake,
  Mp4OutputFormat: Mp4OutputFormatFake,
  Output: OutputFake,
};

const makeWebCodecsCapture = createWebCodecsCapture as unknown as (
  options: Parameters<typeof createWebCodecsCapture>[0],
  codecs: unknown,
) => ReturnType<typeof createWebCodecsCapture>;

if (false) {
  // @ts-expect-error The third-party injection seam is source-test capability,
  // not part of the public createWebCodecsCapture factory contract.
  createWebCodecsCapture(undefined, mediabunny);
}

type VideoEncoderInit = {
  output: (chunk: unknown, metadata?: unknown) => void;
  error: (error: DOMException) => void;
};

class EncodedVideoChunkMock {
  readonly byteLength: number;

  constructor(
    readonly init: {
      data: Uint8Array;
      type: 'key' | 'delta';
      timestamp: number;
      duration?: number;
    },
  ) {
    this.byteLength = init.data.byteLength;
  }

  get type(): 'key' | 'delta' {
    return this.init.type;
  }

  get timestamp(): number {
    return this.init.timestamp;
  }

  get duration(): number | undefined {
    return this.init.duration;
  }

  copyTo(target: Uint8Array): void {
    target.set(this.init.data);
  }
}

class EncodedAudioChunkMock {}

const encoderState = {
  instances: [] as VideoEncoderMock[],
  frames: [] as Array<{ bitmap: unknown; init: { timestamp: number; duration: number } }>,
  supportResult: true,
  supportError: null as Error | null,
  emitChunks: true,
  chunkMetadataMode: 'first-only' as 'first-only' | 'never',
  pendingError: null as DOMException | null,
};

class VideoEncoderMock {
  static readonly isConfigSupported = vi.fn(async (config: Record<string, unknown>) => {
    if (encoderState.supportError) {
      throw encoderState.supportError;
    }

    return {
      supported: encoderState.supportResult,
      config,
    };
  });

  readonly configure = vi.fn((config: Record<string, unknown>) => {
    this.config = config;
  });
  readonly flush = vi.fn(async () => {});
  readonly close = vi.fn(() => {});
  readonly encode = vi.fn((_frame: unknown, options?: Record<string, unknown>) => {
    if (encoderState.pendingError) {
      this.init.error(encoderState.pendingError);
      return;
    }

    if (!encoderState.emitChunks) {
      return;
    }

    const latestFrame = encoderState.frames.at(-1);
    this.init.output(
      new EncodedVideoChunkMock({
        data: new Uint8Array([1, 2, 3, 4]),
        type: options?.keyFrame ? 'key' : 'delta',
        timestamp: latestFrame?.init.timestamp ?? 0,
        duration: latestFrame?.init.duration,
      }),
      encoderState.chunkMetadataMode === 'first-only' && this.encode.mock.calls.length === 1
        ? {
            decoderConfig: {
              codec: 'vp09.00.10.08',
              codedWidth: 640,
              codedHeight: 480,
              description: new Uint8Array([1, 2, 3]),
            },
          }
        : undefined,
    );
  });

  config: Record<string, unknown> | null = null;

  constructor(private readonly init: VideoEncoderInit) {
    encoderState.instances.push(this);
  }
}

class VideoFrameMock {
  readonly close = vi.fn(() => {});

  constructor(bitmap: unknown, init: { timestamp: number; duration: number }) {
    encoderState.frames.push({ bitmap, init });
  }
}

describe('web capture runtime', () => {
  beforeEach(() => {
    mediabunnyState.codecNames.length = 0;
    mediabunnyState.packets.length = 0;
    mediabunnyState.tracks.length = 0;
    mediabunnyState.formatOptions.length = 0;
    mediabunnyState.packetInputs.length = 0;
    mediabunnyState.startCalls = 0;
    mediabunnyState.finalizeCalls = 0;
    mediabunnyState.cancelCalls = 0;
    mediabunnyState.cancelError = null;
    mediabunnyState.buffer = new Uint8Array([1, 2, 3, 4]);

    encoderState.instances.length = 0;
    encoderState.frames.length = 0;
    encoderState.supportResult = true;
    encoderState.supportError = null;
    encoderState.emitChunks = true;
    encoderState.chunkMetadataMode = 'first-only';
    encoderState.pendingError = null;

    VideoEncoderMock.isConfigSupported.mockClear();
    vi.stubGlobal('VideoEncoder', VideoEncoderMock as never);
    vi.stubGlobal('VideoFrame', VideoFrameMock as never);
    vi.stubGlobal('EncodedVideoChunk', EncodedVideoChunkMock as never);
    vi.stubGlobal('EncodedAudioChunk', EncodedAudioChunkMock as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test('the public factory allocates an explicitly disposable inert capture', async () => {
    const capture = createWebCodecsCapture();
    expect(capture.lifetime.disposed).toBe(false);
    await capture.dispose();
    expect(capture.lifetime.disposed).toBe(true);
  });

  test('renders default CSS-derived fills on OffscreenCanvas and HTMLCanvasElement targets', () => {
    const ctx = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: '',
    };
    const offscreenCanvas = {
      width: 32,
      height: 18,
      getContext: vi.fn(() => ctx),
    };
    const htmlCanvas = {
      width: 24,
      height: 12,
      getContext: vi.fn(() => ctx),
    };

    renderToCanvas(
      {
        discrete: {},
        blend: {},
        outputs: {
          css: {
            '--liteship-background': 'black',
            '--liteship-foreground': 'white',
          },
          glsl: {},
          aria: {},
        },
      } as never,
      offscreenCanvas as never,
    );
    renderToCanvas(
      {
        discrete: {},
        blend: {},
        outputs: {
          css: {
            '--liteship-bg': 'navy',
            '--liteship-color': 'gold',
          },
          glsl: {},
          aria: {},
        },
      } as never,
      htmlCanvas as never,
    );

    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 32, 18);
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 32, 18);
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 24, 12);
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 24, 12);
    expect(ctx.fillStyle).toBe('gold');

    expect(() =>
      renderToCanvas(
        {
          discrete: {},
          blend: {},
          outputs: { css: {}, glsl: {}, aria: {} },
        } as never,
        {
          width: 1,
          height: 1,
          getContext: () => null,
        } as never,
      ),
    ).toThrow('Failed to get 2D context from OffscreenCanvas');
  });

  test('exports the mediabunny bridge from the shared capture seam', () => {
    expect(typeof MediabunnyBridge.BufferTarget).toBe('function');
    expect(typeof MediabunnyBridge.EncodedVideoPacketSource).toBe('function');
    expect(typeof MediabunnyBridge.Output).toBe('function');
  });

  test('covers support probing, timestamp normalization, packet draining, and codec mapping', async () => {
    const avcCapture = makeWebCodecsCapture(undefined, mediabunny);
    await expect(
      avcCapture.init({
        width: 641,
        height: 480,
        fps: 30,
      } as never),
      // Teaching contract: codec family, the offending size, and both ways out.
    ).rejects.toThrow(
      /\(H\.264\/HEVC\) requires even width and height\. Got 641x480 — round to 640x480, or use a VP9\/AV1 codec string/,
    );

    const capture = makeWebCodecsCapture(
      {
        codec: 'vp09.00.10.08',
        bitrate: 2_000_000,
        keyframeInterval: 2,
      },
      mediabunny,
    );

    await capture.init({
      width: 641,
      height: 481,
      fps: 30,
    } as never);

    await capture.capture({
      frame: 0,
      timestamp: 10,
      bitmap: { frame: 'first' } as never,
    });
    await capture.capture({
      frame: 1,
      timestamp: 9,
      bitmap: { frame: 'second' } as never,
    });

    const result = await capture.finalize();
    const encoder = encoderState.instances[0];

    expect(VideoEncoderMock.isConfigSupported).toHaveBeenCalledWith({
      codec: 'vp09.00.10.08',
      width: 641,
      height: 481,
      bitrate: 2_000_000,
      framerate: 30,
    });
    expect(encoder).toBeDefined();
    expect(encoder?.configure).toHaveBeenCalledWith({
      codec: 'vp09.00.10.08',
      width: 641,
      height: 481,
      bitrate: 2_000_000,
      framerate: 30,
    });
    expect(encoder?.encode.mock.calls[0]?.[1]).toEqual({ keyFrame: true });
    expect(encoder?.encode.mock.calls[1]?.[1]).toEqual({ keyFrame: false });
    expect(encoder?.flush).toHaveBeenCalledOnce();
    expect(encoder?.close).toHaveBeenCalledOnce();

    expect(encoderState.frames[0]?.init).toEqual({
      timestamp: 10_000,
      duration: 1_000_000 / 30,
    });
    expect(encoderState.frames[1]?.init.timestamp).toBe(10_001);

    expect(mediabunnyState.codecNames).toEqual(['vp9']);
    expect(mediabunnyState.tracks[0]?.options).toEqual({ frameRate: 30 });
    expect(mediabunnyState.packets).toHaveLength(2);
    expect(mediabunnyState.packets[0]?.metadata).toBeDefined();
    expect(mediabunnyState.packets[1]?.metadata).toBeUndefined();

    expect(result.codec).toBe('vp09.00.10.08');
    expect(result.frames).toBe(2);
    expect(Number(result.durationMs)).toBeCloseTo(66.66, 1);
    expect(result.blob.type).toBe('video/mp4');
    expect(result.blob.size).toBeGreaterThan(0);

    await expect(capture.finalize()).rejects.toThrow('FrameCapture not initialized');
  });

  test('rejects unsupported codec mappings and support probe failures', async () => {
    const unsupportedCapture = makeWebCodecsCapture(
      {
        codec: 'weird-codec',
      },
      mediabunny,
    );
    await expect(
      unsupportedCapture.init({
        width: 640,
        height: 480,
        fps: 30,
      } as never),
    ).rejects.toThrow('Unsupported WebCodecs codec');

    encoderState.supportResult = false;
    const unsupportedConfigCapture = makeWebCodecsCapture(undefined, mediabunny);
    await expect(
      unsupportedConfigCapture.init({
        width: 640,
        height: 480,
        fps: 30,
      } as never),
    ).rejects.toThrow('VideoEncoder does not support codec');

    encoderState.supportResult = true;
    encoderState.supportError = new Error('probe boom');
    const probeErrorCapture = makeWebCodecsCapture(undefined, mediabunny);
    await expect(
      probeErrorCapture.init({
        width: 640,
        height: 480,
        fps: 30,
      } as never),
    ).rejects.toThrow('VideoEncoder support probe failed: probe boom');
  });

  test('maps HEVC and AV1 codec aliases and stringifies non-Error support probe failures', async () => {
    encoderState.supportError = 'probe string boom' as never;
    const stringProbeCapture = makeWebCodecsCapture(
      {
        codec: 'hev1.1.6.L93.B0',
      },
      mediabunny,
    );
    await expect(
      stringProbeCapture.init({
        width: 640,
        height: 480,
        fps: 30,
      } as never),
    ).rejects.toThrow('VideoEncoder support probe failed: probe string boom');

    encoderState.supportError = null;

    const hevcCapture = makeWebCodecsCapture(
      {
        codec: 'hvc1.1.6.L93.B0',
      },
      mediabunny,
    );
    await hevcCapture.init({
      width: 640,
      height: 480,
      fps: 30,
    } as never);
    await hevcCapture.capture({ bitmap: { close() {} }, timestamp: 0 } as never);
    await hevcCapture.finalize();

    const av1Capture = makeWebCodecsCapture(
      {
        codec: 'av1',
      },
      mediabunny,
    );
    await av1Capture.init({
      width: 641,
      height: 481,
      fps: 30,
    } as never);
    await av1Capture.capture({ bitmap: { close() {} }, timestamp: 0 } as never);
    await av1Capture.finalize();

    expect(mediabunnyState.codecNames).toEqual(expect.arrayContaining(['hevc', 'av1']));
  });

  test('rejects unavailable encoders and skips support probing when the runtime does not expose it', async () => {
    const originalVideoEncoder = VideoEncoderMock as unknown as typeof VideoEncoder;
    vi.stubGlobal('VideoEncoder', undefined);

    const unavailableCapture = makeWebCodecsCapture(undefined, mediabunny);
    await expect(
      unavailableCapture.init({
        width: 640,
        height: 480,
        fps: 30,
      } as never),
    ).rejects.toThrow('WebCodecs VideoEncoder is unavailable in this environment');

    vi.stubGlobal('VideoEncoder', originalVideoEncoder as never);
    vi.stubGlobal('VideoFrame', VideoFrameMock as never);
    const supportProbe = VideoEncoderMock.isConfigSupported;
    try {
      Object.defineProperty(VideoEncoderMock, 'isConfigSupported', {
        configurable: true,
        value: undefined,
      });

      const capture = makeWebCodecsCapture(
        {
          codec: 'vp09.00.10.08',
        },
        mediabunny,
      );
      await capture.init({
        width: 641,
        height: 481,
        fps: 30,
      } as never);
      expect(VideoEncoderMock.isConfigSupported).toBeUndefined();
      await capture.capture({
        frame: 0,
        timestamp: Number.NaN,
        bitmap: {} as never,
      });
      const result = await capture.finalize();
      expect(result.frames).toBe(1);
      expect(encoderState.frames[0]?.init.timestamp).toBe(Math.max(0, Math.round(1_000_000 / 30) - 1));
    } finally {
      Object.defineProperty(VideoEncoderMock, 'isConfigSupported', {
        configurable: true,
        value: supportProbe,
      });
    }
  });

  test('surfaces encoder errors, missing packets, and empty muxer output deterministically', async () => {
    const errorCapture = makeWebCodecsCapture(undefined, mediabunny);
    await errorCapture.init({
      width: 640,
      height: 480,
      fps: 30,
    } as never);
    encoderState.pendingError = new DOMException('encode boom');
    await expect(
      errorCapture.capture({
        frame: 0,
        timestamp: 0,
        bitmap: {} as never,
      }),
    ).rejects.toThrow('VideoEncoder error: encode boom');

    encoderState.pendingError = null;
    encoderState.emitChunks = false;
    const noPacketsCapture = makeWebCodecsCapture(undefined, mediabunny);
    await noPacketsCapture.init({
      width: 640,
      height: 480,
      fps: 30,
    } as never);
    await noPacketsCapture.capture({
      frame: 0,
      timestamp: 0,
      bitmap: {} as never,
    });
    await expect(noPacketsCapture.finalize()).rejects.toThrow('VideoEncoder produced no packets');

    encoderState.emitChunks = true;
    mediabunnyState.buffer = null;
    const noOutputCapture = makeWebCodecsCapture(undefined, mediabunny);
    await noOutputCapture.init({
      width: 640,
      height: 480,
      fps: 30,
    } as never);
    await noOutputCapture.capture({
      frame: 0,
      timestamp: 0,
      bitmap: {} as never,
    });
    await expect(noOutputCapture.finalize()).rejects.toThrow('MP4 muxer produced no output');
  });

  test('rejects capture and finalize before initialization and rejects empty finalize runs', async () => {
    const capture = makeWebCodecsCapture(
      {
        codec: 'vp09.00.10.08',
      },
      mediabunny,
    );

    await expect(
      capture.capture({
        frame: 0,
        timestamp: 0,
        bitmap: {} as never,
      }),
    ).rejects.toThrow('FrameCapture not initialized');
    const uninitializedFinalize = makeWebCodecsCapture(undefined, mediabunny);
    await expect(uninitializedFinalize.finalize()).rejects.toThrow('FrameCapture not initialized');

    await capture.init({
      width: 640,
      height: 480,
      fps: 30,
    } as never);
    await expect(capture.finalize()).rejects.toThrow('FrameCapture has no frames to finalize');
  });

  test('explicit disposal is idempotent, closes the encoder, cancels the muxer, and makes the capture inert', async () => {
    const capture = makeWebCodecsCapture(undefined, mediabunny);
    await capture.init({ width: 640, height: 480, fps: 30 } as never);
    const encoder = encoderState.instances[0]!;

    const first = capture.dispose();
    const second = capture.dispose();
    expect(second).toBe(first);
    await first;

    expect(encoder.close).toHaveBeenCalledOnce();
    expect(mediabunnyState.cancelCalls).toBe(1);
    await expect(capture.init({ width: 640, height: 480, fps: 30 } as never)).rejects.toThrow(
      'FrameCapture is disposed',
    );
    await expect(capture.capture({ bitmap: {} as never, timestamp: 0 } as never)).rejects.toThrow(
      'FrameCapture not initialized',
    );
    await expect(capture.finalize()).rejects.toThrow('FrameCapture not initialized');
  });

  test('disposal attempts encoder and muxer cleanup and aggregates both failures', async () => {
    const capture = makeWebCodecsCapture(undefined, mediabunny);
    await capture.init({ width: 640, height: 480, fps: 30 } as never);
    const encoder = encoderState.instances[0]!;
    encoder.close.mockImplementation(() => {
      throw new Error('encoder close failed');
    });
    mediabunnyState.cancelError = new Error('muxer cancel failed');

    await expect(capture.dispose()).rejects.toMatchObject({
      _tag: 'LifetimeDisposeError',
      causes: [
        expect.objectContaining({
          errors: [
            expect.objectContaining({ message: 'encoder close failed' }),
            expect.objectContaining({ message: 'muxer cancel failed' }),
          ],
        }),
      ],
    });
    expect(encoder.close).toHaveBeenCalledOnce();
    expect(mediabunnyState.cancelCalls).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// captureVideo pipeline
// ---------------------------------------------------------------------------

describe('captureVideo pipeline', () => {
  test('orchestrates renderer -> capture -> result', async () => {
    const { captureVideo } = await import('../../../packages/web/src/capture/pipeline.js');

    const frames = [
      { frame: 0, timestamp: 0, state: { outputs: { css: {} } } },
      { frame: 1, timestamp: 33, state: { outputs: { css: {} } } },
    ];

    const renderer = {
      config: { width: 320, height: 240, fps: 30 },
      async *frames() {
        for (const f of frames) yield f;
      },
    };

    const initSpy = vi.fn();
    const captureSpy = vi.fn();
    const finalizeSpy = vi.fn().mockResolvedValue({
      codec: 'mock',
      frames: 2,
      durationMs: 66,
      blob: new Blob(),
    });

    const mockCapture = {
      init: initSpy,
      capture: captureSpy,
      finalize: finalizeSpy,
      dispose: vi.fn(async () => {}),
    };

    // Mock OffscreenCanvas globally for this test
    const mockCtx = { clearRect: vi.fn(), fillRect: vi.fn(), fillStyle: '' };
    const OrigOffscreenCanvas = globalThis.OffscreenCanvas;
    globalThis.OffscreenCanvas = class {
      width: number;
      height: number;
      constructor(w: number, h: number) {
        this.width = w;
        this.height = h;
      }
      getContext() {
        return mockCtx;
      }
    } as never;

    try {
      const result = await captureVideo(renderer as never, mockCapture as never);

      expect(initSpy).toHaveBeenCalledWith({ width: 320, height: 240, fps: 30 });
      expect(captureSpy).toHaveBeenCalledTimes(2);
      expect(finalizeSpy).toHaveBeenCalledOnce();
      expect(result.frames).toBe(2);
    } finally {
      if (OrigOffscreenCanvas) {
        globalThis.OffscreenCanvas = OrigOffscreenCanvas;
      } else {
        delete (globalThis as Record<string, unknown>).OffscreenCanvas;
      }
    }
  });

  test('falls back to HTMLCanvasElement and ImageBitmap when OffscreenCanvas is unavailable', async () => {
    const { captureVideo } = await import('../../../packages/web/src/capture/pipeline.js');

    const renderer = {
      config: { width: 64, height: 48, fps: 24 },
      async *frames() {
        yield { frame: 0, timestamp: 0, state: { outputs: { css: {} } } };
      },
    };

    const initSpy = vi.fn();
    const captureSpy = vi.fn();
    const finalizeSpy = vi.fn().mockResolvedValue({
      codec: 'mock',
      frames: 1,
      durationMs: 41,
      blob: new Blob(),
    });

    const mockCapture = {
      init: initSpy,
      capture: captureSpy,
      finalize: finalizeSpy,
      dispose: vi.fn(async () => {}),
    };

    const originalOffscreenCanvas = globalThis.OffscreenCanvas;
    const originalCreateImageBitmap = globalThis.createImageBitmap;
    const originalDocument = globalThis.document;
    const imageBitmap = { close: vi.fn() } as unknown as ImageBitmap;
    const createImageBitmapSpy = vi.fn(async () => imageBitmap);
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({
        clearRect() {},
        fillRect() {},
        fillStyle: '',
      })),
    };
    vi.stubGlobal('document', {
      createElement: vi.fn(() => mockCanvas),
    } as unknown as Document);
    const mockCtx = {
      clearRect() {},
      fillRect() {},
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D;
    mockCanvas.getContext.mockReturnValue(mockCtx);

    delete (globalThis as Record<string, unknown>).OffscreenCanvas;
    vi.stubGlobal('createImageBitmap', createImageBitmapSpy);

    try {
      const result = await captureVideo(renderer as never, mockCapture as never);

      expect(initSpy).toHaveBeenCalledWith({ width: 64, height: 48, fps: 24 });
      expect(createImageBitmapSpy).toHaveBeenCalledOnce();
      expect(captureSpy).toHaveBeenCalledWith({
        frame: 0,
        timestamp: 0,
        bitmap: imageBitmap,
      });
      expect((imageBitmap as { close: ReturnType<typeof vi.fn> }).close).toHaveBeenCalledOnce();
      expect(result.frames).toBe(1);
    } finally {
      if (originalOffscreenCanvas) {
        globalThis.OffscreenCanvas = originalOffscreenCanvas;
      } else {
        delete (globalThis as Record<string, unknown>).OffscreenCanvas;
      }
      if (originalDocument) {
        globalThis.document = originalDocument;
      } else {
        delete (globalThis as Record<string, unknown>).document;
      }
      if (originalCreateImageBitmap) {
        globalThis.createImageBitmap = originalCreateImageBitmap;
      } else {
        delete (globalThis as Record<string, unknown>).createImageBitmap;
      }
    }
  });

  test('throws when neither OffscreenCanvas nor document canvas support is available', async () => {
    const { captureVideo } = await import('../../../packages/web/src/capture/pipeline.js');

    const renderer = {
      config: { width: 16, height: 16, fps: 30 },
      async *frames() {
        yield { frame: 0, timestamp: 0, state: { outputs: { css: {} } } };
      },
    };

    const initSpy = vi.fn(async () => {});
    const finalizeSpy = vi.fn(async () => ({
      codec: 'mock',
      frames: 0,
      durationMs: 0,
      blob: new Blob(),
    }));
    const mockCapture = {
      init: initSpy,
      capture: vi.fn(),
      finalize: finalizeSpy,
      dispose: vi.fn(async () => {}),
    };

    const originalOffscreenCanvas = globalThis.OffscreenCanvas;
    const originalDocument = globalThis.document;
    delete (globalThis as Record<string, unknown>).OffscreenCanvas;
    delete (globalThis as Record<string, unknown>).document;

    try {
      await expect(captureVideo(renderer as never, mockCapture as never)).rejects.toThrow(
        'captureVideo requires OffscreenCanvas or HTMLCanvasElement support.',
      );
      expect(initSpy).toHaveBeenCalledOnce();
      expect(finalizeSpy).not.toHaveBeenCalled();
    } finally {
      if (originalOffscreenCanvas) {
        globalThis.OffscreenCanvas = originalOffscreenCanvas;
      } else {
        delete (globalThis as Record<string, unknown>).OffscreenCanvas;
      }
      if (originalDocument) {
        globalThis.document = originalDocument;
      } else {
        delete (globalThis as Record<string, unknown>).document;
      }
    }
  });

  test('throws when DOM canvas fallback cannot create an ImageBitmap', async () => {
    const { captureVideo } = await import('../../../packages/web/src/capture/pipeline.js');

    const renderer = {
      config: { width: 64, height: 48, fps: 24 },
      async *frames() {
        yield { frame: 0, timestamp: 0, state: { outputs: { css: {} } } };
      },
    };

    const mockCapture = {
      init: vi.fn(async () => {}),
      capture: vi.fn(),
      finalize: vi.fn(),
      dispose: vi.fn(async () => {}),
    };

    const originalOffscreenCanvas = globalThis.OffscreenCanvas;
    const originalCreateImageBitmap = globalThis.createImageBitmap;
    const originalDocument = globalThis.document;
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({
        clearRect() {},
        fillRect() {},
        fillStyle: '',
      })),
    };

    vi.stubGlobal('document', {
      createElement: vi.fn(() => mockCanvas),
    } as unknown as Document);
    delete (globalThis as Record<string, unknown>).OffscreenCanvas;
    delete (globalThis as Record<string, unknown>).createImageBitmap;

    try {
      await expect(captureVideo(renderer as never, mockCapture as never)).rejects.toThrow(
        'captureVideo requires createImageBitmap when OffscreenCanvas is unavailable.',
      );
      expect(mockCapture.capture).not.toHaveBeenCalled();
      expect(mockCapture.finalize).not.toHaveBeenCalled();
    } finally {
      if (originalOffscreenCanvas) {
        globalThis.OffscreenCanvas = originalOffscreenCanvas;
      } else {
        delete (globalThis as Record<string, unknown>).OffscreenCanvas;
      }
      if (originalDocument) {
        globalThis.document = originalDocument;
      } else {
        delete (globalThis as Record<string, unknown>).document;
      }
      if (originalCreateImageBitmap) {
        globalThis.createImageBitmap = originalCreateImageBitmap;
      } else {
        delete (globalThis as Record<string, unknown>).createImageBitmap;
      }
    }
  });

  test.each([
    ['init', 'init failed'],
    ['capture', 'capture failed'],
    ['finalize', 'finalize failed'],
  ] as const)('disposes the owned capture when %s fails', async (failedStep, message) => {
    const { captureVideo } = await import('../../../packages/web/src/capture/pipeline.js');
    const originalOffscreenCanvas = globalThis.OffscreenCanvas;
    globalThis.OffscreenCanvas = class {
      constructor(
        readonly width: number,
        readonly height: number,
      ) {}
      getContext() {
        return { clearRect() {}, fillRect() {}, fillStyle: '' };
      }
    } as never;
    const renderer = {
      config: { width: 16, height: 16, fps: 30 },
      async *frames() {
        yield { frame: 0, timestamp: 0, state: { outputs: { css: {} } } };
      },
    };
    const dispose = vi.fn(async () => {});
    const mockCapture = {
      init: vi.fn(async () => {
        if (failedStep === 'init') throw new Error(message);
      }),
      capture: vi.fn(async () => {
        if (failedStep === 'capture') throw new Error(message);
      }),
      finalize: vi.fn(async () => {
        if (failedStep === 'finalize') throw new Error(message);
        return { codec: 'mock', frames: 1, durationMs: 1, blob: new Blob() };
      }),
      dispose,
    };

    try {
      await expect(captureVideo(renderer as never, mockCapture as never)).rejects.toThrow(message);
      expect(dispose).toHaveBeenCalledOnce();
    } finally {
      if (originalOffscreenCanvas) globalThis.OffscreenCanvas = originalOffscreenCanvas;
      else delete (globalThis as Record<string, unknown>).OffscreenCanvas;
    }
  });

  test('preserves the operation and disposal failures in one aggregate', async () => {
    const { captureVideo } = await import('../../../packages/web/src/capture/pipeline.js');
    const primary = new Error('init failed');
    const teardown = new Error('dispose failed');
    const mockCapture = {
      init: vi.fn(async () => {
        throw primary;
      }),
      capture: vi.fn(),
      finalize: vi.fn(),
      dispose: vi.fn(async () => {
        throw teardown;
      }),
    };
    const renderer = { config: { width: 1, height: 1, fps: 1 }, frames: vi.fn() };

    await expect(captureVideo(renderer as never, mockCapture as never)).rejects.toMatchObject({
      errors: [primary, teardown],
      message: 'captureVideo failed and its FrameCapture also failed during disposal',
    });
    expect(mockCapture.dispose).toHaveBeenCalledOnce();
  });
});
