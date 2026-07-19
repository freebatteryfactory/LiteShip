/**
 * End-to-end proof of the directive boot scanner against the REAL built
 * Astro example (deferred from the 0.1.4 dogfood wave). The integration
 * test (tests/integration/astro/test.ts) asserts the build emits the
 * `data-liteship-directive` marker and the bootstrap script; this spec proves
 * the part that was inert downstream: a real browser loads the built page,
 * the scanner activates the Satellite element, and `data-liteship-state`
 * tracks viewport.width across its boundary thresholds (0/768/1280 →
 * compact/medium/full).
 *
 * Skips with a message when the astro example has not been built — the
 * gauntlet runs the integration build before the e2e lane, so CI always
 * exercises it.
 */
import { test, expect } from '@playwright/test';
import { astroExampleNotBuilt } from '../helpers/capabilities.js';

// Single-sourced in the canonical capability symbol table (same dist index.html) so the
// capability-gate linker can prove this guard derives from the `astro-example-not-built` probe.
const built = !astroExampleNotBuilt;

test.describe('astro directive boot (built example)', () => {
  test.skip(!built, 'astro example not built — run: pnpm exec tsx tests/integration/astro/test.ts');

  test('the boot scanner activates the Satellite and data-liteship-state tracks viewport.width', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 800 });
    await page.goto('/astro-example/');

    const satellite = page.locator('[data-liteship-directive~="satellite"]');
    await expect(satellite).toHaveCount(1);

    // Activation is the regression: 0.1.4 shipped this exact page shape inert.
    await expect(satellite).toHaveAttribute('data-liteship-state', 'full');

    await page.setViewportSize({ width: 900, height: 800 });
    await expect(satellite).toHaveAttribute('data-liteship-state', 'medium');

    await page.setViewportSize({ width: 500, height: 800 });
    await expect(satellite).toHaveAttribute('data-liteship-state', 'compact');

    // The plain data-liteship-boundary div carries no directive marker and no
    // client:* attribute — the scanner must leave it alone.
    const plain = page.locator('[data-liteship-boundary]:not([data-liteship-directive])');
    await expect(plain).toHaveCount(1);
    await expect(plain).not.toHaveAttribute('data-liteship-state');
  });
});
