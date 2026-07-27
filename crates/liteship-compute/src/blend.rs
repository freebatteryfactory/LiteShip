//! Blend weight normalization.
//!
//! Normalizes a weight array in-place so positive weights sum to 1.0.
//! Negative weights are clamped to 0.0.

/// Normalize weights in-place so positive values sum to 1.0.
///
/// - Negative weights are set to 0.0
/// - If total is 0.0, all weights remain 0.0
/// - Operates on the caller's buffer directly (no copy)
///
/// # Safety
/// Single-threaded WASM. Caller must ensure `weights_ptr` is valid for `len` floats.
#[no_mangle]
pub extern "C" fn blend_normalize(weights_ptr: *mut f32, len: u32) {
    let len = len as usize;
    if len == 0 {
        return;
    }

    // Pass 1: clamp negatives, compute sum.
    //
    // The sum and the reciprocal are computed in f64, mirroring the TS
    // fallback (JS number arithmetic) op-for-op so results are
    // bit-identical. An f32 reciprocal overflows to inf for subnormal
    // totals (e.g. a single 1.4e-45 weight) where f64 normalizes to 1.0 —
    // caught by the wasm-parity property suite.
    let mut total: f64 = 0.0;

    #[cfg(feature = "simd")]
    {
        // SIMD path — process 4 floats at a time
        // Note: requires wasm32 SIMD proposal support
        let chunks = len / 4;
        let remainder = len % 4;

        for i in 0..chunks {
            let base = i * 4;
            unsafe {
                let mut v0 = *weights_ptr.add(base);
                let mut v1 = *weights_ptr.add(base + 1);
                let mut v2 = *weights_ptr.add(base + 2);
                let mut v3 = *weights_ptr.add(base + 3);

                if v0 < 0.0 { v0 = 0.0; }
                if v1 < 0.0 { v1 = 0.0; }
                if v2 < 0.0 { v2 = 0.0; }
                if v3 < 0.0 { v3 = 0.0; }

                *weights_ptr.add(base) = v0;
                *weights_ptr.add(base + 1) = v1;
                *weights_ptr.add(base + 2) = v2;
                *weights_ptr.add(base + 3) = v3;

                total += v0 as f64 + v1 as f64 + v2 as f64 + v3 as f64;
            }
        }

        for i in (chunks * 4)..len {
            unsafe {
                let mut v = *weights_ptr.add(i);
                if v < 0.0 { v = 0.0; }
                *weights_ptr.add(i) = v;
                total += v as f64;
            }
        }
    }

    #[cfg(not(feature = "simd"))]
    {
        for i in 0..len {
            unsafe {
                let mut v = *weights_ptr.add(i);
                if v < 0.0 {
                    v = 0.0;
                    *weights_ptr.add(i) = v;
                }
                total += v as f64;
            }
        }
    }

    // Pass 2: normalize if total > 0 (f64 multiply, f32 store — same
    // rounding as the fallback's Float32Array assignment)
    if total > 0.0 {
        let inv = 1.0 / total;
        for i in 0..len {
            unsafe {
                *weights_ptr.add(i) = (*weights_ptr.add(i) as f64 * inv) as f32;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn normalize(weights: &mut [f32]) {
        blend_normalize(weights.as_mut_ptr(), weights.len() as u32);
    }

    #[test]
    fn positive_weights_sum_to_one() {
        let mut w = [1.0, 3.0, 4.0];
        normalize(&mut w);
        assert_eq!(w, [0.125, 0.375, 0.5]);
    }

    #[test]
    fn negative_weights_clamp_to_zero_before_normalizing() {
        let mut w = [-2.0, 1.0, 1.0];
        normalize(&mut w);
        assert_eq!(w, [0.0, 0.5, 0.5]);
    }

    #[test]
    fn all_zero_or_negative_stays_zero() {
        let mut w = [-1.0, 0.0, -0.5];
        normalize(&mut w);
        assert_eq!(w, [0.0, 0.0, 0.0]);
    }

    #[test]
    fn empty_slice_is_a_no_op() {
        let mut w: [f32; 0] = [];
        normalize(&mut w);
    }
}
