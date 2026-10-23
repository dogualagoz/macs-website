"use client"

// From GradFlow, animated WebGL gradients for React: https://gradflow.meerbahadin.dev
import { MutableRefObject, useEffect, useRef } from "react"

/** Values the host page can change every frame without re-rendering. */
export interface GlassFoldLive {
  /** Extra motion, 0 or more. Speed is multiplied by 1 + energy. */
  energy: number
  /** Overrides color3; the shader eases toward it. */
  color3?: string
  /** True stops drawing and keeps the last frame on screen. */
  paused?: boolean
  /** Set by GlassFold: call after clearing `paused` to resume drawing. */
  wake?: () => void
}

export interface GlassFoldProps {
  /** The body of each glass pane. */
  color1?: string
  /** The background. */
  color2?: string
  /** The lit edges. */
  color3?: string
  /** Animation speed. 0 freezes it. */
  speed?: number
  /** Higher values produce smaller folds. */
  scale?: number
  /** Film grain, 0 to 0.5. */
  noise?: number
  /** Mutable signal read on every frame. */
  live?: MutableRefObject<GlassFoldLive>
  className?: string
}

const VERTEX = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`

const FRAGMENT = `
  precision highp float;
  uniform float u_time;
  uniform vec3 u_color1;
  uniform vec3 u_color2;
  uniform vec3 u_color3;
  uniform float u_scale;
  uniform float u_noise;
  uniform vec2 u_resolution;
  varying vec2 vUv;

  float grain(vec2 st) {
    return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453);
  }
  vec2 centered(vec2 uv) {
    vec2 p = uv - 0.5;
    p.x *= u_resolution.x / max(u_resolution.y, 1.0);
    return p;
  }
  mat2 rot(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
  }
  vec3 shade(vec2 uv, float time) {
    vec2 q = rot(0.6) * centered(uv) * 2.0 * u_scale;
    float t = time * 0.6;
    float pixel = 2.0 * u_scale / max(u_resolution.y, 1.0);
    vec3 color = mix(u_color2, u_color2 * 0.45, clamp(length(centered(uv)) * 1.3, 0.0, 1.0));
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      float bend = mod(fi, 2.0) * 2.0 - 1.0;
      float crease = (fi - 2.5) * 0.4
                   + 0.26 * sin(q.x * (1.05 + 0.12 * fi) + fi * 1.9 + t * (0.25 + 0.05 * fi))
                   + 0.1 * bend * q.x * q.x;
      float s = q.y - crease;
      float pane = smoothstep(-pixel, pixel, s);
      float back = max(s, 0.0);
      float body = exp(-back * 1.7);
      float fresnel = exp(-back * 8.0);
      float rim = exp(-back * 80.0);
      float inner = exp(-pow((back - 0.045) / 0.014, 2.0));
      float bloom = exp(-abs(s) * 20.0);
      vec3 tint = mix(u_color1, u_color3, clamp(fresnel * 0.6 + 0.08 + 0.14 * sin(fi * 2.1 + q.x * 0.8 + t * 0.2), 0.0, 1.0));
      vec3 light = tint * pane * (body * 0.42 + fresnel * 0.4)
                 + u_color3 * (pane * (rim * 0.6 + inner * 0.12) + bloom * 0.1);
      color += light * (1.0 - color);
    }
    return clamp(color, 0.0, 1.0);
  }
  void main() {
    vec3 color = shade(vUv, u_time);
    if (u_noise > 0.001) {
      float g = grain(vUv * 200.0 + u_time * 0.1);
      color *= 1.0 - u_noise * 0.4 + u_noise * g * 0.4;
    }
    gl_FragColor = vec4(color, 1.0);
  }
`

type Vec3 = [number, number, number]

function hexToVec3(hex: string): Vec3 {
  const h = hex.replace("#", "")
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h
  const n = parseInt(full, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

function approach(current: Vec3, target: Vec3, k: number) {
  for (let i = 0; i < 3; i++) current[i] += (target[i] - current[i]) * k
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("GlassFold shader:", gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

export function GlassFold({
  color1 = "#1e3cc8",
  color2 = "#06081e",
  color3 = "#96d7ff",
  speed = 0.5,
  scale = 1,
  noise = 0.12,
  live,
  className,
}: GlassFoldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const props = useRef({ color1, color2, color3, speed, scale, noise, live })
  props.current = { color1, color2, color3, speed, scale, noise, live }
  const repaint = useRef<(() => void) | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false })
    if (!gl) {
      console.warn("GlassFold: WebGL unavailable; using the background color.")
      return
    }

    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX)
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT)
    const program = gl.createProgram()
    if (!vertex || !fragment || !program) {
      if (vertex) gl.deleteShader(vertex)
      if (fragment) gl.deleteShader(fragment)
      if (program) gl.deleteProgram(program)
      return
    }
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("GlassFold program:", gl.getProgramInfoLog(program))
      gl.deleteProgram(program)
      return
    }
    gl.useProgram(program)
    const buffer = gl.createBuffer()
    if (!buffer) {
      gl.deleteProgram(program)
      return
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, "position")
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    const uniform = (name: string) => gl.getUniformLocation(program, name)
    const u = {
      time: uniform("u_time"), color1: uniform("u_color1"),
      color2: uniform("u_color2"), color3: uniform("u_color3"),
      scale: uniform("u_scale"), noise: uniform("u_noise"),
      resolution: uniform("u_resolution"),
    }
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const initial = props.current
    const shown = {
      color1: hexToVec3(initial.color1),
      color2: hexToVec3(initial.color2),
      color3: hexToVec3(initial.live?.current.color3 ?? initial.color3),
    }
    let energy = 0
    let elapsed = 0
    let last: number | null = null
    let frame = 0
    let lost = false
    let drawn = false

    const draw = (now: number) => {
      const p = props.current
      const signal = p.live?.current
      const dt = last === null ? 0 : Math.min((now - last) / 1000, 0.1)
      // Colors and energy ease in; the first frame and reduced motion jump.
      const k = dt === 0 || motion.matches ? 1 : 1 - Math.exp(-dt * 2.5)
      approach(shown.color1, hexToVec3(p.color1), k)
      approach(shown.color2, hexToVec3(p.color2), k)
      approach(shown.color3, hexToVec3(signal?.color3 ?? p.color3), k)
      energy += ((signal?.energy ?? 0) - energy) * k
      if (!motion.matches) elapsed += dt * p.speed * (1 + energy)
      last = now
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      gl.viewport(0, 0, width, height)
      gl.uniform1f(u.time, elapsed)
      gl.uniform3fv(u.color1, shown.color1)
      gl.uniform3fv(u.color2, shown.color2)
      gl.uniform3fv(u.color3, shown.color3)
      gl.uniform1f(u.scale, p.scale)
      gl.uniform1f(u.noise, p.noise)
      gl.uniform2f(u.resolution, width, height)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      canvas.style.opacity = "1"
      drawn = true
    }
    const loop = (now: number) => {
      frame = 0
      if (lost || document.hidden) return
      // The first frame always draws, so a paused canvas still shows the pattern.
      if (drawn && props.current.live?.current.paused) return
      draw(now)
      if (!motion.matches && props.current.speed !== 0) frame = requestAnimationFrame(loop)
    }
    const restart = () => {
      cancelAnimationFrame(frame)
      last = null
      if (!lost && !document.hidden) frame = requestAnimationFrame(loop)
    }
    const onContextLost = () => {
      lost = true
      cancelAnimationFrame(frame)
      canvas.style.opacity = "0"
      console.warn("GlassFold: WebGL context lost; using the background color.")
    }
    repaint.current = restart
    const signal = props.current.live?.current
    if (signal) signal.wake = restart
    const observer = new ResizeObserver(restart)
    observer.observe(canvas)
    motion.addEventListener("change", restart)
    document.addEventListener("visibilitychange", restart)
    canvas.addEventListener("webglcontextlost", onContextLost)
    restart()

    return () => {
      if (signal && signal.wake === restart) signal.wake = undefined
      repaint.current = null
      cancelAnimationFrame(frame)
      observer.disconnect()
      motion.removeEventListener("change", restart)
      document.removeEventListener("visibilitychange", restart)
      canvas.removeEventListener("webglcontextlost", onContextLost)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
    }
  }, [])

  useEffect(() => {
    repaint.current?.()
  }, [color1, color2, color3, speed, scale, noise])

  return (
    <canvas ref={canvasRef} aria-hidden="true" className={className}
      style={{ display: "block", width: "100%", height: "100%", opacity: 0 }} />
  )
}
