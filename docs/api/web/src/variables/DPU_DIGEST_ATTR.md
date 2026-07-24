[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [web/src](../README.md) / DPU\_DIGEST\_ATTR

# Variable: DPU\_DIGEST\_ATTR

> `const` **DPU\_DIGEST\_ATTR**: `"data-liteship-dpu-digest"` = `'data-liteship-dpu-digest'`

Defined in: [web/src/dpu/watch-and-prepare.ts:34](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/web/src/dpu/watch-and-prepare.ts#L34)

DOM attribute stamped with the sha256 integrity digest of the APPLIED DOM
serialization (`target.innerHTML` after sanitize + apply) — NOT the envelope's
pre-sanitization input bytes. The envelope digest verifies transport integrity
before apply; this attribute attests what is actually rendered.
