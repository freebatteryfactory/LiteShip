[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [core/src](../README.md) / decodeDocumentGraph

# Function: decodeDocumentGraph()

> **decodeDocumentGraph**(`value`): [`DocumentGraph`](../interfaces/DocumentGraph.md)

Defined in: [core/src/document-graph-address.ts:169](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/core/src/document-graph-address.ts#L169)

VERSION-AWARE, FAIL-CLOSED reader for an UNTRUSTED DocumentGraph value (a graph
lowered from persisted JSON / a wire payload). `sealGraph` only re-mints ids; it
does NOT verify the envelope `_tag`/`_version` or that every node is well-formed.
A host that reconstructs a graph from outside the program must run it through
THIS gate first, so a future-version (`_version: 2`) or malformed graph is
rejected with ONE canonical tagged `ParseError` — never silently misparsed
into a v1 shape. "Written data needs a reader": this is the graph envelope's
fail-closed reader, the twin of [isWellFormedNode](../variables/isWellFormedNode.md)'s per-node gate.

## Parameters

### value

`unknown`

## Returns

[`DocumentGraph`](../interfaces/DocumentGraph.md)

## Throws

`ParseError` (`source: 'DocumentGraph'`) when the value is not a
  record, carries the wrong `_tag`, an unsupported `_version`, or a node that
  fails the [isWellFormedNode](../variables/isWellFormedNode.md) trust gate.
