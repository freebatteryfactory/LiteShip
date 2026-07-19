[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [remotion/src](../README.md) / Provider

# Function: Provider()

> **Provider**(`props`): `ReactElement`

Defined in: [remotion/src/composition.ts:124](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/remotion/src/composition.ts#L124)

React context provider that makes precomputed frames available to
[useLiteshipState](useLiteshipState.md) anywhere in the subtree. Use this when you prefer
implicit frame lookup over threading the `frames` array through props.

## Parameters

### props

#### children

`ReactNode`

#### frames

readonly [`VideoFrameOutput`](https://github.com/freebatteryfactory/LiteShip/blob/main/docs/api/core/src/interfaces/VideoFrameOutput.md)[]

## Returns

`ReactElement`

## Example

```tsx
<Provider frames={frames}>
  <MyComposition />
</Provider>
```
