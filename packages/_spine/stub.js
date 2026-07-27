// Runtime guard for the type-only package: a value import must fail with a
// teaching error instead of Node's bare ERR_PACKAGE_PATH_NOT_EXPORTED.
throw new Error(
  "@liteship/_spine is type-only — it has no runtime exports. " +
    "Use `import type { ... } from '@liteship/_spine'`; the runtime lives in @liteship/core and the other @liteship/* packages.",
);
