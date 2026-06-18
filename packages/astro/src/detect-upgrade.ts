/**
 * GPU probe upgrade -- replaces provisional tier with full detection.
 *
 * Runs after DOMContentLoaded (not render-blocking). Creates a throwaway
 * WebGL context, reads the GPU renderer string, classifies the GPU tier
 * using the same heuristics as `@czap/detect`, and updates the HTML element
 * attributes.
 *
 * @module
 */

/**
 * Inline script that performs full GPU tier detection.
 * Deferred to DOMContentLoaded to avoid blocking rendering.
 */
export const DETECT_UPGRADE_SCRIPT = `
(function(){
  if (window.__CZAP_OFF__) return;
  function writeDetectState(next) {
    var safe = Object.freeze(Object.assign({}, next));
    try {
      Object.defineProperty(window, '__CZAP_DETECT__', {
        value: safe,
        configurable: true,
        enumerable: false,
        writable: false
      });
    } catch (_) {
      try {
        window.__CZAP_DETECT__ = safe;
      } catch (_) {}
    }
  }

  function upgrade() {
    try {
      var h = document.documentElement;
      var tier = 1;
      var renderer = '';
      var webgpu = false;

      // WebGL renderer probe
      var c = document.createElement('canvas');
      var gl = c.getContext('webgl2') || c.getContext('webgl');
      if (gl) {
        var ext = gl.getExtension('WEBGL_debug_renderer_info');
        if (ext) {
          renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '';
        }
        // Classify GPU tier from renderer string. Mirrors classifyGPURenderer
        // (packages/detect/src/detect.ts) group-for-group in canonical
        // precedence (0 → 3 → 2 → 1, default 1). data-czap-tier AND the
        // now-CSS-keyed data-czap-motion both derive from this, so a looser
        // inline shortcut (e.g. any 'geforce' → tier 2) would over-classify a
        // desktop GTX that canonical settles at tier 1 and over-grant motion.
        // Head-inline can't import — keep these groups in lockstep. (\s* written
        // as " *" to survive the script-string; renderer strings use spaces.)
        var r = renderer.toLowerCase();
        if (/swiftshader|llvmpipe|software|virtualbox|vmware|microsoft basic/.test(r)) {
          tier = 0; // software
        } else if (/geforce.*rtx|radeon.*rx *[6-9][0-9]{2,}|apple.*m[3-9]|adreno.*[6-9][0-9]{2}|mali-g[7-9][0-9]|nvidia.*a[0-9]{3,}/.test(r)) {
          tier = 3; // high
        } else if (/adreno.*[4-5][0-9]{2}|mali-g[0-9]{2}|geforce.*[0-9]{3}m|geforce.*mx|radeon.*rx *[0-5][0-9]{2}|radeon.*vega|intel.*arc|apple.*m[12]/.test(r)) {
          tier = 2; // mid
        } else if (/intel.*hd|intel.*uhd|intel.*iris|mali-[gt][0-9]|adreno.*[0-3][0-9]{2}|powervr|apple gpu/.test(r)) {
          tier = 1; // integrated
        }
        // else: tier stays 1 (canonical defaults unmatched renderers to integrated)
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      }

      // WebGPU check
      if (typeof navigator !== 'undefined' && navigator.gpu) {
        webgpu = true;
      }

      // Compute final tier using GPU + cores + memory
      var cores = navigator.hardwareConcurrency || 2;
      var mem = navigator.deviceMemory || 4;
      var motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Mirror tierFromCapabilities (packages/detect/src/tiers.ts) branch for
      // branch — head-inline can't import, so this hand copy MUST stay lockstep
      // with canonical or it over/under-grants the capability tier (pinned by the
      // drift test in tests/unit/astro/detect-upgrade-event.test.ts).
      var capLevel;
      if (motion && tier <= 1) capLevel = 'static';
      else if (tier === 0) capLevel = 'styled';
      else if (tier === 1) capLevel = cores >= 4 && mem >= 4 ? 'reactive' : 'styled';
      else if (tier === 2) capLevel = motion ? 'reactive' : (cores >= 4 && mem >= 4 ? 'animated' : 'reactive');
      else if (webgpu && cores >= 4 && mem >= 4) capLevel = motion ? 'animated' : 'gpu';
      else if (motion) capLevel = 'reactive';
      else capLevel = 'animated';

      // Mirror motionTierFromCapabilities (packages/detect/src/tiers.ts) branch
      // for branch. data-czap-motion is now CSS-keyed, so an inline shortcut
      // that diverged from canonical (e.g. tier-2/3-core falling to 'physics'
      // where canonical settles 'animations') would hand clients motion the
      // rest of the stack gates lower. Head-inline can't import — keep lockstep.
      var motionTier;
      if (motion) motionTier = 'none';
      else if (tier === 0) motionTier = 'transitions';
      else if (tier === 1) motionTier = cores >= 4 ? 'animations' : 'transitions';
      else if (tier === 2) motionTier = cores >= 4 ? 'physics' : 'animations';
      else motionTier = webgpu ? 'compute' : 'physics';

      h.setAttribute('data-czap-tier', capLevel);
      // The motion capability TIER, in the same vocabulary EdgeTier emits
      // server-side (data-czap-motion). The probe already computes it; write it
      // so CSS keyed on [data-czap-motion="physics"/"none"] matches on
      // non-edge pages too (where EdgeTier never ran), and so the edge value is
      // refined by the real GPU probe just like data-czap-tier is. The
      // reduced-motion PREFERENCE lives separately on data-czap-reduced-motion.
      h.setAttribute('data-czap-motion', motionTier);
      // gpuTier (numeric) and webgpu (bool) are pure ENGINE state, not author
      // CSS keys — they ride czap:detect-ready + __CZAP_DETECT__ only, never the
      // DOM root (zero readers; keeps engine state off the DOM).
      h.removeAttribute('data-czap-tier-provisional');

      // Update a minimal runtime snapshot instead of exposing the full probe payload.
      writeDetectState({
        tier: capLevel,
        gpuTier: tier,
        webgpu: webgpu,
        motionTier: motionTier
      });

      // Single consolidated "detect settled" signal. __CZAP_DETECT__ and the
      // data-czap-* attributes are now final; consumers that need post-probe
      // values (gpuTier/webgpu) listen for this ONE event instead of polling or
      // racing setTimeout backstops. The detail carries the final payload so a
      // late listener can read it straight off the event.
      try {
        document.dispatchEvent(new CustomEvent('czap:detect-ready', {
          detail: { tier: capLevel, gpuTier: tier, webgpu: webgpu, motionTier: motionTier }
        }));
      } catch(_) {}
    } catch(e) {
      try { document.documentElement.setAttribute('data-czap-tier-probe-error', 'true'); } catch(_) {}
      // Still fire detect-ready (flagged) so listeners awaiting the probe never
      // hang on a thrown probe — the provisional tier stands.
      try {
        document.dispatchEvent(new CustomEvent('czap:detect-ready', { detail: { error: true } }));
      } catch(_) {}
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', upgrade);
  } else {
    upgrade();
  }
})();
`.trim();
