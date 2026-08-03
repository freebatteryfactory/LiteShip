//! liteship-compute — zero-allocation WASM compute kernels.
//!
//! C-ABI exports for spring physics, boundary evaluation, and blend
//! normalization. No wasm_bindgen. No std. Static output buffers.
//!
//! Target output: 2-8 KB wasm32-unknown-unknown.

#![no_std]
// Every raw-pointer operation states its own justification, even inside an
// `unsafe fn`. Without this, the pinned Clippy arm reports each explicit
// `unsafe` block in an `unsafe fn` body as `unused_unsafe`, and the crate
// would have to drop exactly the annotations that make the FFI boundary
// auditable. This is also the Rust 2024 default, so the crate is ready for it.
#![deny(unsafe_op_in_unsafe_fn)]

mod blend;
mod boundary;
mod spring;

// Re-export C-ABI functions at crate root for flat WASM exports.
pub use blend::blend_normalize;
pub use boundary::batch_boundary_eval;
pub use spring::spring_curve;

/// Panic handler — required for no_std.
///
/// `not(test)` is load-bearing: under `cargo test` the lib is compiled with
/// `cfg(test)`, which drops this handler so the std-linked test harness can
/// supply its own. That is also why this crate is checked per-target rather
/// than with `--all-targets` — see `deriveRustWasmQualificationArms`.
#[cfg(not(test))]
#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    core::arch::wasm32::unreachable()
}
