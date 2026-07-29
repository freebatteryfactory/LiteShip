[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../README.md) / [core/src](../../README.md) / ShipCapsule

# ShipCapsule

Public namespace for ShipCapsule. `make` builds a capsule from
input (sync), `canonicalize` encodes it as canonical CBOR for transport /
hashing, `decode` round-trips canonical bytes and returns a `Result`
(`@liteship/error`) that rejects non-canonical encodings AND unknown
`schema_version`s (`unsupported_version`, fail-closed), `computeId` mints the
fnv1a label over the canonicalized payload (sync).

## Type Aliases

- [BuildEnv](type-aliases/BuildEnv.md)
- [DecodeError](type-aliases/DecodeError.md)
- [Input](type-aliases/Input.md)
