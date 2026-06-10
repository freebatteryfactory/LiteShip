// FPS + main-thread probe for the-fbf. Scrolls through the page while
// counting rAF ticks and long tasks. Run: node .fbf-perf.mjs [url]
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'https://freebatteryfactory.com'
const browser = await chromium.launch({ args: ['--enable-gpu'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

const measure = async (label, scroll) => {
  const res = await page.evaluate(async ({ scroll }) => {
    const longTasks = []
    const obs = new PerformanceObserver((l) => longTasks.push(...l.getEntries().map((e) => e.duration)))
    obs.observe({ entryTypes: ['longtask'] })

    let frames = 0
    let worst = 0
    let last = performance.now()
    let running = true
    const tick = (t) => {
      frames++
      worst = Math.max(worst, t - last)
      last = t
      if (running) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)

    const t0 = performance.now()
    if (scroll) {
      const max = document.documentElement.scrollHeight - innerHeight
      for (let i = 0; i <= 20; i++) {
        window.scrollTo(0, (max * i) / 20)
        await new Promise((r) => setTimeout(r, 150))
      }
    } else {
      await new Promise((r) => setTimeout(r, 3000))
    }
    const dt = performance.now() - t0
    running = false
    obs.disconnect()
    return {
      fps: Math.round((frames / dt) * 1000),
      worstFrameMs: Math.round(worst),
      longTasks: longTasks.length,
      longTaskMs: Math.round(longTasks.reduce((a, b) => a + b, 0)),
    }
  }, { scroll })
  console.log(`${label}: ${res.fps}fps  worst=${res.worstFrameMs}ms  longTasks=${res.longTasks} (${res.longTaskMs}ms)`)
}

await measure('idle @top      ', false)
await measure('scroll sweep   ', true)
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
await page.waitForTimeout(800)
await measure('idle @bottom   ', false)

// where the time goes: count active videos + canvas size
const facts = await page.evaluate(() => ({
  videosPlaying: [...document.querySelectorAll('video')].filter((v) => !v.paused).length,
  videosTotal: document.querySelectorAll('video').length,
  canvas: (() => { const c = document.getElementById('particles-canvas'); return c ? `${c.width}x${c.height}` : 'none' })(),
  tier: document.documentElement.getAttribute('data-czap-tier'),
  motion: (globalThis.__CZAP_DETECT__ || {}).motionTier,
  device: (globalThis.__CZAP_DETECT__ || {}).tier,
}))
console.log('facts:', JSON.stringify(facts))

await browser.close()
