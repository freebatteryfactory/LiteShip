[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [remotion/src](../README.md) / motionCssVars

# Function: motionCssVars()

> **motionCssVars**(`plan`, `frame`, `durationInFrames`): `Record`\<`string`, `string`\>

Defined in: [remotion/src/motion.ts:39](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/remotion/src/motion.ts#L39)

Fold a sampled motion frame into CSS custom properties for a composition's `style`,
mirroring `cssVarsFromState`. Formats each typed leaf through the SAME
`formatTypedValue` the browser floor and worker uniform payload use, so the value
Remotion paints is byte-identical to the live runtime's.

## Parameters

### plan

`RuntimeWritePlan`

### frame

`number`

### durationInFrames

`number`

## Returns

`Record`\<`string`, `string`\>
