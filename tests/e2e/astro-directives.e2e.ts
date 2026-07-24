// PROVES: INV-ADAPTIVE-CSS-BYTE-EQUAL
/**
 * End-to-end proof of the directive boot scanner against the REAL built
 * Astro example. The page uses only public `defineAdaptive().attrs()` plus
 * `plan().css`; this spec proves the scanner's runtime state marker drives the
 * matching CSS, two style identities cannot bleed, and hysteresis wins over a
 * stateless raw-width interpretation.
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

  test('attrs plus plan CSS follow runtime state without cross-definition bleed', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 800 });
    await page.goto('/astro-example/');

    const adaptives = page.locator('[data-liteship-directive~="adaptive"]');
    const alpha = page.locator('#adaptive-alpha');
    const beta = page.locator('#adaptive-beta');
    await expect(adaptives).toHaveCount(2);

    const columnCount = async (selector: '#adaptive-alpha' | '#adaptive-beta'): Promise<number> =>
      page.locator(selector).evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length);
    const owner = async (selector: '#adaptive-alpha' | '#adaptive-beta'): Promise<string> =>
      page
        .locator(selector)
        .evaluate((element) => getComputedStyle(element).getPropertyValue('--adaptive-owner').trim());
    const shadow = async (selector: '#adaptive-alpha' | '#adaptive-beta'): Promise<string> =>
      page.locator(selector).evaluate((element) => getComputedStyle(element).boxShadow);

    await expect(alpha).toHaveAttribute('data-liteship-state', 'full');
    await expect(beta).toHaveAttribute('data-liteship-state', 'full');
    expect(await columnCount('#adaptive-alpha')).toBe(3);
    expect(await columnCount('#adaptive-beta')).toBe(1);
    expect(await owner('#adaptive-alpha')).toBe('alpha');
    expect(await owner('#adaptive-beta')).toBe('beta');
    expect(await shadow('#adaptive-alpha')).toMatch(
      /^rgb\(255, 0, 0\) 0px 1px 2px(?: 0px)?, rgb\(0, 0, 255\) 0px 4px 8px(?: 0px)?$/,
    );

    await page.setViewportSize({ width: 900, height: 800 });
    await expect(alpha).toHaveAttribute('data-liteship-state', 'medium');
    await expect(beta).toHaveAttribute('data-liteship-state', 'medium');
    expect(await columnCount('#adaptive-alpha')).toBe(2);
    expect(await columnCount('#adaptive-beta')).toBe(2);

    // A stateless width evaluation chooses compact at 760, but the 40px
    // hysteresis band retains medium until the viewport drops below 748. CSS
    // must follow the runtime marker, not independently re-evaluate width.
    await page.setViewportSize({ width: 760, height: 800 });
    await expect(alpha).toHaveAttribute('data-liteship-state', 'medium');
    expect(await columnCount('#adaptive-alpha')).toBe(2);

    await page.setViewportSize({ width: 740, height: 800 });
    await expect(alpha).toHaveAttribute('data-liteship-state', 'compact');
    await expect(beta).toHaveAttribute('data-liteship-state', 'compact');
    expect(await columnCount('#adaptive-alpha')).toBe(1);
    expect(await columnCount('#adaptive-beta')).toBe(3);

    // The plain data-liteship-boundary div carries no directive marker and no
    // client:* attribute — the scanner must leave it alone.
    const plain = page.locator('[data-liteship-boundary]:not([data-liteship-directive])');
    await expect(plain).toHaveCount(1);
    await expect(plain).not.toHaveAttribute('data-liteship-state');
  });
});
