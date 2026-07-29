[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [liteship/src/runtime](../README.md) / WebCodecsCaptureOptions

# Interface: WebCodecsCaptureOptions

Defined in: web/dist/capture/webcodecs.d.ts:14

Options for [createWebCodecsCapture](../functions/createWebCodecsCapture.md). All fields are optional;
omitted values fall back to Baseline H.264 at 4 Mbps.

## Properties

### bitrate?

> `readonly` `optional` **bitrate?**: `number`

Defined in: web/dist/capture/webcodecs.d.ts:18

Target bitrate in bits/second. Default: 4_000_000

***

### codec?

> `readonly` `optional` **codec?**: `string`

Defined in: web/dist/capture/webcodecs.d.ts:16

Video codec string. Default: 'avc1.42001E' (H.264 Baseline Level 3.0)

***

### keyframeInterval?

> `readonly` `optional` **keyframeInterval?**: `number`

Defined in: web/dist/capture/webcodecs.d.ts:20

Keyframe interval in frames. Default: 30
