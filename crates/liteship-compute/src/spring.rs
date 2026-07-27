//! Spring physics curve sampling.
//!
//! Generates evenly-spaced samples of a spring easing function.
//! Writes to a static output buffer — zero allocation.

/// Maximum samples the static buffer can hold.
const MAX_SAMPLES: usize = 256;

/// Static output buffer for spring curve samples.
static mut SPRING_BUF: [f32; MAX_SAMPLES] = [0.0; MAX_SAMPLES];

/// Sample a spring easing at `samples` evenly-spaced points in [0, 1].
///
/// Returns a pointer to a static f32 buffer of length `samples + 1`.
/// The caller reads `samples + 1` floats from the returned pointer.
///
/// # Safety
/// Single-threaded WASM — static buffer access is safe.
#[no_mangle]
pub extern "C" fn spring_curve(
    stiffness: f32,
    damping: f32,
    mass: f32,
    samples: u32,
) -> *const f32 {
    let mass = if mass <= 0.0 { 1.0 } else { mass };
    let samples = (samples as usize).min(MAX_SAMPLES - 1);
    let omega = libm::sqrtf(stiffness / mass);
    let zeta = damping / (2.0 * libm::sqrtf(stiffness * mass));

    for i in 0..=samples {
        let t = i as f32 / samples as f32;
        let value = if t <= 0.0 {
            0.0
        } else if t >= 1.0 {
            1.0
        } else if zeta < 1.0 {
            // Underdamped
            let omega_d = omega * libm::sqrtf(1.0 - zeta * zeta);
            1.0 - libm::expf(-zeta * omega * t)
                * (libm::cosf(omega_d * t)
                    + (zeta * omega / omega_d) * libm::sinf(omega_d * t))
        } else if zeta == 1.0 {
            // Critically damped
            1.0 - (1.0 + omega * t) * libm::expf(-omega * t)
        } else {
            // Overdamped
            let s = libm::sqrtf(zeta * zeta - 1.0);
            let r1 = -omega * (zeta + s);
            let r2 = -omega * (zeta - s);
            let c1 = r2 / (r2 - r1);
            let c2 = -r1 / (r2 - r1);
            1.0 - (c1 * libm::expf(r1 * t) + c2 * libm::expf(r2 * t))
        };
        unsafe {
            SPRING_BUF[i] = value;
        }
    }

    core::ptr::addr_of!(SPRING_BUF) as *const f32
}

#[cfg(test)]
mod tests {
    use super::*;

    extern crate std;
    use std::sync::Mutex;
    use std::vec::Vec;

    // SPRING_BUF's "single-threaded WASM" safety contract does not hold in
    // cargo test's multithreaded harness — concurrent tests race the static
    // buffer (caught in CI as stale-garbage samples). Serialize access.
    static BUF_LOCK: Mutex<()> = Mutex::new(());

    fn curve(stiffness: f32, damping: f32, mass: f32, samples: u32) -> Vec<f32> {
        let _guard = BUF_LOCK.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
        let ptr = spring_curve(stiffness, damping, mass, samples);
        unsafe { core::slice::from_raw_parts(ptr, samples as usize + 1) }.to_vec()
    }

    #[test]
    fn endpoints_are_exact() {
        for &(k, c, m) in &[(170.0, 26.0, 1.0), (50.0, 5.0, 2.0), (300.0, 60.0, 1.0)] {
            let out = curve(k, c, m, 16);
            assert_eq!(out[0], 0.0, "t=0 must be exactly 0");
            assert_eq!(out[16], 1.0, "t=1 must be exactly 1");
        }
    }

    #[test]
    fn underdamped_overshoots_then_settles_near_one() {
        // zeta ≈ 0.19 — visibly oscillatory spring.
        let out = curve(170.0, 5.0, 1.0, 64);
        let max = out.iter().cloned().fold(f32::MIN, f32::max);
        assert!(max > 1.0, "underdamped spring must overshoot, max was {max}");
    }

    #[test]
    fn overdamped_never_exceeds_one() {
        // zeta ≈ 2.3 — heavily damped, monotonic approach.
        let out = curve(170.0, 60.0, 1.0, 64);
        for (i, v) in out.iter().enumerate() {
            assert!(*v <= 1.0 + 1e-6, "overdamped sample {i} exceeded 1: {v}");
        }
    }

    #[test]
    fn non_positive_mass_is_treated_as_one() {
        assert_eq!(curve(170.0, 26.0, 0.0, 16), curve(170.0, 26.0, 1.0, 16));
        assert_eq!(curve(170.0, 26.0, -3.0, 16), curve(170.0, 26.0, 1.0, 16));
    }

    #[test]
    fn samples_clamp_to_buffer_capacity() {
        // 4096 requested → clamped to 255 inner samples; index 255 readable.
        let _guard = BUF_LOCK.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
        let ptr = spring_curve(170.0, 26.0, 1.0, 4096);
        let out = unsafe { core::slice::from_raw_parts(ptr, 256) };
        assert_eq!(out[255], 1.0);
    }
}
