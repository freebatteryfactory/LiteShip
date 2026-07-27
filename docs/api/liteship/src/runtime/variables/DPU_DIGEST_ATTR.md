[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/runtime](../README.md) / DPU\_DIGEST\_ATTR

# Variable: DPU\_DIGEST\_ATTR

> `const` **DPU\_DIGEST\_ATTR**: `"data-liteship-dpu-digest"` = `"data-liteship-dpu-digest"`

Defined in: web/dist/watch-and-prepare.d.ts:29

DOM attribute stamped with the sha256 integrity digest of the APPLIED DOM
serialization (`target.innerHTML` after sanitize + apply) — NOT the envelope's
pre-sanitization input bytes. The envelope digest verifies transport integrity
before apply; this attribute attests what is actually rendered.
