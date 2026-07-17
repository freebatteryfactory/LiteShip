// Gate-canary fixture (scar S0.3). See a.ts and
// tests/unit/devops/gate-canaries.test.ts.
//
// The TYPECHECK canary rewrites the return-type annotation on `doubled` from
// number to string in its temp-dir copy to inject a TS2322 (number is not
// assignable to string). The canary asserts its injection token occurs exactly
// once and actually changed the source, so keep the declaration below verbatim.
import { seed } from './a.js';

export const doubled: number = seed * 2;
