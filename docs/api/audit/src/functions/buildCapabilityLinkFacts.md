[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [audit/src](../README.md) / buildCapabilityLinkFacts

# Function: buildCapabilityLinkFacts()

> **buildCapabilityLinkFacts**(`opts`): `CapabilityLinkFacts`

Defined in: [audit/src/repo-ir-capability-link.ts:89](https://github.com/heyoub/LiteShip/blob/main/packages/audit/src/repo-ir-capability-link.ts#L89)

Build the CapabilityLinkFacts — the HOST's heavy job. Pure given the inputs + the source on
disk: a deterministic `ts.Program` over the capability modules + the sanctioned files yields the same
symbol resolutions and the same link results every run (the property the verdict cache needs).

## Parameters

### opts

[`CapabilityLinkOptions`](../interfaces/CapabilityLinkOptions.md)

## Returns

`CapabilityLinkFacts`
