[**LiteShip**](../../../README.md)

***

[LiteShip](../../../modules.md) / [remotion/src](../README.md) / Provider

# Function: Provider()

> **Provider**(`props`): `ReactElement`

Defined in: [remotion/src/composition.ts:125](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/remotion/src/composition.ts#L125)

React context provider that makes precomputed frames available to
[useLiteshipState](useLiteshipState.md) anywhere in the subtree. Use this when you prefer
implicit frame lookup over threading the `frames` array through props.

## Parameters

### props

#### children

`ReactNode`

#### frames

readonly [`VideoFrameOutput`](../../../liteship/src/media/interfaces/VideoFrameOutput.md)[]

## Returns

`ReactElement`

## Example

```tsx
<Provider frames={frames}>
  <MyComposition />
</Provider>
```
