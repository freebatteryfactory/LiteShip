/**
 * Ambient module declaration for the `remotion` peer dependency -- users bring
 * their own; this minimal stub covers the two hooks this package calls.
 *
 * React is NOT stubbed here (it was, minimally, until 0.8.0): a fake
 * `declare module 'react'` can never carry `ReactNode`/`ReactElement` without
 * colliding with a consumer's real `@types/react` (type aliases don't merge),
 * which forced `Provider` into JSX-unusable `unknown` typings. The package now
 * compiles against the real `@types/react` (a types-only devDependency; react
 * itself remains a peer), so the emitted declarations reference the real types
 * every React consumer already has.
 */

declare module 'remotion' {
  export function useCurrentFrame(): number;
  export function useVideoConfig(): {
    fps: number;
    width: number;
    height: number;
    durationInFrames: number;
  };
}
