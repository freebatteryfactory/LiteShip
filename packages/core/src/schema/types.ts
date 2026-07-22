/** Shared type-level schema utilities. @module */

/** Flatten branded intersections for clean IDE hints. */
export type Prettify<T> = { [K in keyof T]: T[K] } & {};

/** Require at least one selected key of `T`. */
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  { [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>> }[Keys];

/** Recursively make arrays and object properties readonly. */
export type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends Record<string, unknown>
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;
