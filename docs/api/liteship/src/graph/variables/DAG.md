[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [liteship/src/graph](../README.md) / DAG

# Variable: DAG

> `const` **DAG**: `object`

Defined in: core/dist/graph/dag.d.ts:289

DAG namespace -- receipt DAG merge and canonical linearization.

Build, query, and merge directed acyclic graphs of receipt envelopes.
Supports deterministic linearization, fork detection, ancestor queries,
and anti-fork rule enforcement.

## Type Declaration

### ancestors

> **ancestors**: *typeof* `ancestors`

### canonicalHead

> **canonicalHead**: *typeof* `canonicalHead`

### checkForkRule

> **checkForkRule**: *typeof* `checkForkRule`

### checkpoint

> **checkpoint**: *typeof* `checkpoint`

### commonAncestor

> **commonAncestor**: *typeof* `commonAncestor`

### empty

> **empty**: *typeof* `empty`

### fromReceipts

> **fromReceipts**: *typeof* `fromReceipts`

### getHeads

> **getHeads**: *typeof* `getHeads`

### ingest

> **ingest**: *typeof* `ingest`

### ingestAll

> **ingestAll**: *typeof* `ingestAll`

### isAncestor

> **isAncestor**: *typeof* `isAncestor`

### isFork

> **isFork**: *typeof* `isFork`

### linearize

> **linearize**: *typeof* `linearize`

### linearizeFrom

> **linearizeFrom**: *typeof* `linearizeFrom`

### merge

> **merge**: *typeof* `merge`

### pruneToBound

> **pruneToBound**: *typeof* `pruneToBound`

### size

> **size**: *typeof* `size`

### spliceCheckpoint

> **spliceCheckpoint**: *typeof* `spliceCheckpoint`

## Example

```ts
import { DAG } from '@liteship/core';

const dag = DAG.fromReceipts(envelopes);
const ordered = DAG.linearize(dag);
const forked = DAG.isFork(dag);
const result = DAG.merge(dag, remoteEnvelopes);
```
