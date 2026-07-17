// Gate-canary fixture (scar S0.3). Consumed only by
// tests/unit/devops/gate-canaries.test.ts, which copies this directory into an
// isolated temp dir and runs `tsc --build` against the copy. These files are
// never part of any repo typecheck project — do not add them to a tsconfig
// include, and do not "fix up" the deliberate injection point in b.ts.
export const seed: number = 21;
