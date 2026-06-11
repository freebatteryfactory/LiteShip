// Runtime guard for the type-only package: a value import must fail with a
// teaching error instead of Node's bare ERR_PACKAGE_PATH_NOT_EXPORTED.
throw new Error(
  "@czap/_spine is type-only — it has no runtime exports. " +
    "Use `import type { ... } from '@czap/_spine'`; the runtime lives in @czap/core and the other @czap/* packages.",
);
