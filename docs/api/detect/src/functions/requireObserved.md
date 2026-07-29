[**LiteShip**](../../../README.md)

***

[LiteShip](../../../README.md) / [detect/src](../README.md) / requireObserved

# Function: requireObserved()

## Call Signature

> **requireObserved**(`evidence`): [`ObservedCapabilityAxisValues`](../type-aliases/ObservedCapabilityAxisValues.md)

Defined in: [detect/src/cap-axes.ts:152](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/cap-axes.ts#L152)

Admit only axes backed entirely by observed inputs.

Complete fallback values remain available through [CapabilityAxisValues](../type-aliases/CapabilityAxisValues.md);
this boundary is for consumers whose claim requires measurement rather than a
conservative default. The returned witnessed view is frozen and contains only
the requested axes.

### Parameters

#### evidence

[`CapabilityTierEvidence`](../type-aliases/CapabilityTierEvidence.md)

### Returns

[`ObservedCapabilityAxisValues`](../type-aliases/ObservedCapabilityAxisValues.md)

## Call Signature

> **requireObserved**\<`Axes`\>(`evidence`, `axes`): [`ObservedCapabilityAxisValues`](../type-aliases/ObservedCapabilityAxisValues.md)\<`Axes`\[`number`\]\>

Defined in: [detect/src/cap-axes.ts:153](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/detect/src/cap-axes.ts#L153)

Admit only axes backed entirely by observed inputs.

Complete fallback values remain available through [CapabilityAxisValues](../type-aliases/CapabilityAxisValues.md);
this boundary is for consumers whose claim requires measurement rather than a
conservative default. The returned witnessed view is frozen and contains only
the requested axes.

### Type Parameters

#### Axes

`Axes` *extends* readonly (`"tier"` \| `"motion"` \| `"design"`)[]

### Parameters

#### evidence

[`CapabilityTierEvidence`](../type-aliases/CapabilityTierEvidence.md)

#### axes

`Axes`

### Returns

[`ObservedCapabilityAxisValues`](../type-aliases/ObservedCapabilityAxisValues.md)\<`Axes`\[`number`\]\>
