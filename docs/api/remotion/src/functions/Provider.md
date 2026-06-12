[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [remotion/src](../README.md) / Provider

# Function: Provider()

> **Provider**(`props`): `unknown`

Defined in: [remotion/src/composition.ts:123](https://github.com/heyoub/LiteShip/blob/main/packages/remotion/src/composition.ts#L123)

React context provider that makes precomputed frames available to
[useCzapState](useCzapState.md) anywhere in the subtree. Use this when you prefer
implicit frame lookup over threading the `frames` array through props.

## Parameters

### props

#### children

`unknown`

#### frames

readonly [`VideoFrameOutput`](https://github.com/heyoub/LiteShip/blob/main/docs/api/core/src/interfaces/VideoFrameOutput.md)[]

## Returns

`unknown`

## Example

```tsx
<Provider frames={frames}>
  <MyComposition />
</Provider>
```
