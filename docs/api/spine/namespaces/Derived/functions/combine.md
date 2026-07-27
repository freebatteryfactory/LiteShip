[**LiteShip**](../../../../README.md)

***

[LiteShip](../../../../modules.md) / [\_spine](../../../README.md) / [Derived](../README.md) / combine

# Function: combine()

> **combine**\<`T`, `U`\>(`sources`, `combiner`): [`Derived`](../../../interfaces/Derived.md)\<`U`\> & [`AsyncOwnedResource`](../../../interfaces/AsyncOwnedResource.md)

Defined in: [\_spine/core.d.ts:688](https://github.com/freebatteryfactory/LiteShip/blob/main/packages/_spine/core.d.ts#L688)

## Type Parameters

### T

`T` *extends* readonly `unknown`[]

### U

`U`

## Parameters

### sources

\{ readonly \[K in string \| number \| symbol\]: Source\<T\[K\]\> \}

### combiner

(...`args`) => `U`

## Returns

[`Derived`](../../../interfaces/Derived.md)\<`U`\> & [`AsyncOwnedResource`](../../../interfaces/AsyncOwnedResource.md)
