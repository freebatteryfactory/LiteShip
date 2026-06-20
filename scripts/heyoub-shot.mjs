// Headless render debugger for heyoub.dev's GPU shader cast.
// Loads the live dev page in chromium (software WebGL), reports the resolved
// tier + any shader/console errors, then screenshots the scene WITH the CSS
// fallback gradient neutralized — so a black shot means the shader isn't
// rendering, and a lava shot means it is.
import { chromium } from 'playwright'

const URL = process.argv[2] ?? 'http://localhost:4321/'
const OUT = process.argv[3] ?? '/tmp/scene-shot.png'

const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
  ],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

const logs = []
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))

await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(3500) // boot directive + render a few frames

const diag = await page.evaluate(() => {
  const html = document.documentElement
  const c = document.querySelector('.scene-canvas')
  let gl = null
  try { gl = c && c.getContext('webgl2') } catch {}
  return {
    tier: html.getAttribute('data-czap-tier'),
    design: html.getAttribute('data-czap-design'),
    motionTier: window.__CZAP_DETECT__ && window.__CZAP_DETECT__.motionTier,
    hasCanvas: !!c,
    shaderType: c && c.getAttribute('data-czap-shader-type'),
    shaderSrc: c && c.getAttribute('data-czap-shader-src'),
    canvasSize: c ? `${c.width}x${c.height} (client ${c.clientWidth}x${c.clientHeight})` : null,
    hasGL2: !!gl,
  }
})

// Compile the fragment shader manually to surface its info log (the runtime
// swallows compile failures via Diagnostics, not console).
const shaderCheck = await page.evaluate(async (src) => {
  const cv0 = document.querySelector('.scene-canvas')
  const bound = cv0 && cv0.getAttribute('data-czap-directive-bound')
  const directive = cv0 && cv0.getAttribute('data-czap-directive')
  const VS = `#version 300 es
precision mediump float;
in vec2 a_position; out vec2 v_uv;
void main(){ v_uv = a_position*0.5+0.5; gl_Position = vec4(a_position,0.0,1.0); }`
  const res = await fetch(src)
  const frag = await res.text()
  const cv = document.createElement('canvas')
  const gl = cv.getContext('webgl2')
  if (!gl) return { bound, directive, ok: false, why: 'no webgl2' }
  const mk = (type, srcText) => { const s = gl.createShader(type); gl.shaderSource(s, srcText); gl.compileShader(s); return s }
  const vs = mk(gl.VERTEX_SHADER, VS)
  const fs = mk(gl.FRAGMENT_SHADER, frag)
  const fragOk = gl.getShaderParameter(fs, gl.COMPILE_STATUS)
  const vertOk = gl.getShaderParameter(vs, gl.COMPILE_STATUS)
  const prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog)
  const linkOk = gl.getProgramParameter(prog, gl.LINK_STATUS)
  return {
    bound, directive, fragOk, vertOk, linkOk,
    fragLog: fragOk ? null : gl.getShaderInfoLog(fs),
    vertLog: vertOk ? null : gl.getShaderInfoLog(vs),
    linkLog: linkOk ? null : gl.getProgramInfoLog(prog),
  }
}, '/shaders/scene.frag')
console.log('=== FRAGMENT COMPILE ===')
console.log(JSON.stringify(shaderCheck, null, 2))

// Manually render the shader (bypassing the tier gate) to verify the VISUAL
// independent of the directive. Returns a PNG data URL of the actual pixels.
const manual = await page.evaluate(async (src) => {
  const VS = `#version 300 es
precision mediump float;
in vec2 a_position; out vec2 v_uv;
void main(){ v_uv = a_position*0.5+0.5; gl_Position = vec4(a_position,0.0,1.0); }`
  const frag = await (await fetch(src)).text()
  const cv = document.createElement('canvas')
  cv.width = 1280; cv.height = 800
  const gl = cv.getContext('webgl2', { preserveDrawingBuffer: true })
  const mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); return sh }
  const p = gl.createProgram()
  gl.attachShader(p, mk(gl.VERTEX_SHADER, VS)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, frag)); gl.linkProgram(p); gl.useProgram(p)
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(p, 'a_position'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  const U = (n, ...v) => { const l = gl.getUniformLocation(p, n); if (!l) return; v.length === 1 ? gl.uniform1f(l, v[0]) : gl.uniform2f(l, v[0], v[1]) }
  // 'arrival' mood (top of page), mid-animation.
  U('u_resolution', 1280, 800); U('u_time', 2.4); U('u_state', 0.0); U('u_scroll', 0.0)
  U('u_distortAmp', 1.0); U('u_rotSpeed', 1.0); U('u_orbOpacity', 0.32); U('u_emissive', 0.55); U('u_gridOpacity', 0.07)
  gl.viewport(0, 0, 1280, 800); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 6)
  return cv.toDataURL('image/png')
}, '/shaders/scene.frag')
if (manual && manual.startsWith('data:image/png')) {
  const { writeFileSync } = await import('node:fs')
  writeFileSync('/tmp/scene-manual.png', Buffer.from(manual.split(',')[1], 'base64'))
  console.log('=== manual shader render → /tmp/scene-manual.png ===')
}

// Neutralize the CSS fallback so the screenshot shows ONLY the canvas output.
await page.evaluate(() => {
  const s = document.querySelector('.scene')
  if (s) s.style.background = '#000'
})
await page.waitForTimeout(600)
await page.screenshot({ path: OUT, clip: { x: 0, y: 0, width: 1280, height: 800 } })

console.log('=== DIAGNOSTICS ===')
console.log(JSON.stringify(diag, null, 2))
console.log('=== CONSOLE (' + logs.length + ') ===')
console.log(logs.slice(0, 40).join('\n'))
console.log('=== screenshot ===', OUT)

await browser.close()
