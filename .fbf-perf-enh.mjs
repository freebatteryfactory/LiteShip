import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:8788', { waitUntil: 'networkidle' })
await page.evaluate(() => document.documentElement.setAttribute('data-czap-tier', 'enhanced'))
await page.waitForTimeout(1000)
const measure = async (label, scroll) => {
  const res = await page.evaluate(async ({ scroll }) => {
    let frames = 0; let running = true
    const tick = () => { frames++; if (running) requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
    const t0 = performance.now()
    if (scroll) {
      const max = document.documentElement.scrollHeight - innerHeight
      for (let i = 0; i <= 20; i++) { window.scrollTo(0, (max * i) / 20); await new Promise((r) => setTimeout(r, 150)) }
    } else await new Promise((r) => setTimeout(r, 3000))
    const dt = performance.now() - t0; running = false
    return Math.round((frames / dt) * 1000)
  }, { scroll })
  console.log(`${label}: ${res}fps`)
}
await measure('enhanced idle @top   ', false)
await measure('enhanced scroll sweep', true)
await page.waitForTimeout(800)
await measure('enhanced idle @bottom', false)
await browser.close()
