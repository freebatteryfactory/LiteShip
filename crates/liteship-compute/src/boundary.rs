//! Batch boundary evaluation via binary search.
//!
//! Given sorted thresholds and a set of values, produces the index of the
//! matching state for each value. Zero allocation — writes to static buffer.

/// Maximum values the static buffer can hold.
const MAX_VALUES: usize = 4096;

/// Static output buffer for boundary evaluation results.
static mut BOUNDARY_BUF: [u32; MAX_VALUES] = [0; MAX_VALUES];

/// For each value, find the highest threshold index where value >= threshold.
///
/// Thresholds must be sorted ascending. Returns state index 0 if value is
/// below all thresholds, otherwise the index of the highest matching threshold.
///
/// Uses reverse linear scan (matching TypeScript `evaluateBoundary` semantics).
///
/// Returns a pointer to a static u32 buffer of length `values_len`.
///
/// # Safety
/// Single-threaded WASM — static buffer access is safe.
#[no_mangle]
pub extern "C" fn batch_boundary_eval(
    thresholds_ptr: *const f32,
    thresholds_len: u32,
    values_ptr: *const f32,
    values_len: u32,
) -> *const u32 {
    let thresholds_len = thresholds_len as usize;
    let values_len = (values_len as usize).min(MAX_VALUES);

    for vi in 0..values_len {
        let value = unsafe { *values_ptr.add(vi) };
        let mut state_idx: u32 = 0;

        // Reverse scan — matches evaluateBoundary semantics
        for ti in (0..thresholds_len).rev() {
            let threshold = unsafe { *thresholds_ptr.add(ti) };
            if value >= threshold {
                state_idx = ti as u32;
                break;
            }
        }

        unsafe {
            BOUNDARY_BUF[vi] = state_idx;
        }
    }

    core::ptr::addr_of!(BOUNDARY_BUF) as *const u32
}

#[cfg(test)]
mod tests {
    use super::*;

    extern crate std;
    use std::sync::Mutex;
    use std::vec::Vec;

    // BOUNDARY_BUF's "single-threaded WASM" safety contract does not hold in
    // cargo test's multithreaded harness — concurrent tests race the static
    // buffer. Serialize access.
    static BUF_LOCK: Mutex<()> = Mutex::new(());

    fn eval(thresholds: &[f32], values: &[f32]) -> Vec<u32> {
        let _guard = BUF_LOCK.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
        let ptr = batch_boundary_eval(
            thresholds.as_ptr(),
            thresholds.len() as u32,
            values.as_ptr(),
            values.len() as u32,
        );
        unsafe { core::slice::from_raw_parts(ptr, values.len()) }.to_vec()
    }

    #[test]
    fn below_all_thresholds_is_state_zero() {
        assert_eq!(eval(&[10.0, 20.0, 30.0], &[5.0]), [0]);
    }

    #[test]
    fn exact_threshold_selects_its_index() {
        assert_eq!(eval(&[10.0, 20.0, 30.0], &[20.0]), [1]);
    }

    #[test]
    fn above_all_selects_last_index() {
        assert_eq!(eval(&[10.0, 20.0, 30.0], &[99.0]), [2]);
    }

    #[test]
    fn duplicate_thresholds_select_highest_index() {
        // Reverse scan: the HIGHEST index whose threshold matches wins.
        assert_eq!(eval(&[10.0, 20.0, 20.0, 30.0], &[20.0]), [2]);
    }

    #[test]
    fn empty_thresholds_yield_state_zero() {
        assert_eq!(eval(&[], &[1.0, -1.0]), [0, 0]);
    }

    #[test]
    fn batch_evaluates_each_value_independently() {
        assert_eq!(eval(&[0.0, 50.0], &[-1.0, 0.0, 49.9, 50.0, 100.0]), [0, 0, 0, 1, 1]);
    }
}
