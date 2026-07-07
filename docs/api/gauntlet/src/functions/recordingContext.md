[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [gauntlet/src](../README.md) / recordingContext

# Function: recordingContext()

> **recordingContext**(`base`): [`EvidenceRecorder`](../interfaces/EvidenceRecorder.md)

Defined in: [gauntlet/src/evidence-recorder.ts:153](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/gauntlet/src/evidence-recorder.ts#L153)

Wrap `base` in an instrumented [GateContext](../interfaces/GateContext.md) that records every out-of-IR /
fact-channel read into a live set — including an access of a channel that turns out
ABSENT (recorded as `<channel>:absent`, distinct from a present read and from
never-accessed). The wrapper is FAITHFUL: each accessor returns exactly what
`base`'s does (the gate sees an identical world — a present fact verbatim, an absent
one `undefined`), it only ALSO records the read. The in-IR file set (`base.ir?.files`)
is captured up front so a `readFile` can be classified in-IR (the coverage digest
covers it → not recorded) vs out-of-IR (recorded as `readFile:<path>`).

`ir.facts` / `ir.refs` are recorded via a Proxy over the IR that traps `get` on
those two keys (and passes every other property through unchanged), so a gate that
folds `ir.facts` records `ir.facts` without the recorder needing to know the gate's
internals.

## Parameters

### base

[`GateContext`](../interfaces/GateContext.md)

## Returns

[`EvidenceRecorder`](../interfaces/EvidenceRecorder.md)
