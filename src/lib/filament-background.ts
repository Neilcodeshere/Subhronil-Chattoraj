import { createAttribute, createProgram } from "./webgl";

// Visuvate's filament field, shared by the hero and experience section.
// A single sharp sample replaces the soft five-tap filter; full CSS-pixel
// resolution and restrained grain keep the strands clear on large displays.
const VERTEX = `
  attribute vec2 position;
  void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const FRAGMENT = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif
  uniform vec2 resolution, pointer;
  uniform float time, presence;
  float grainHash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  vec3 palette(float value) {
    float f = clamp(value, 0.0, 1.0) * 3.0;
    vec3 color = mix(vec3(0.0), vec3(0.24, 0.09, 0.42), smoothstep(0.0, 1.0, f));
    color = mix(color, vec3(0.49, 0.27, 0.78), smoothstep(0.0, 1.0, f - 1.0));
    return mix(color, vec3(0.88, 0.78, 1.0), smoothstep(0.0, 1.0, f - 2.0));
  }
  vec3 shade(vec2 p) {
    vec2 q = p * 2.44;
    float field = 0.0;
    float weight = 0.55;
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      q += vec2(sin(q.y * (1.7 + fi * 0.09) + time * (0.35 + fi * 0.04) + 1.0),
                cos(q.x * (1.5 + fi * 0.11) - time * (0.28 + fi * 0.03))) * 0.269;
      field += weight / (0.06 + abs(sin(q.x + q.y + fi * 0.72)));
      weight *= 0.62;
      q = q.yx * vec2(-1.08, 1.04);
    }
    return palette(1.0 - exp(-field * 0.0292));
  }
  void main() {
    vec2 p = (gl_FragCoord.xy - resolution * 0.5) / min(resolution.x, resolution.y);
    vec2 cursor = pointer * resolution * 0.5 / min(resolution.x, resolution.y);
    vec2 delta = p - cursor;
    float distance = length(delta);
    float mask = presence * (1.0 - smoothstep(0.0, 0.46, distance));
    p -= delta / max(distance, 0.0001) * sin(distance / 0.46 * 18.0 - time * 5.0) * mask * 0.45 * 0.07;
    p = p * 1.26 + 0.204 * vec2(sin(time * 0.31), cos(time * 0.23));
    vec3 color = shade(p);
    color = (color - 0.5) * 1.005 + 0.5;
    float luma = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(luma), color, 1.45);
    color += (grainHash(gl_FragCoord.xy + vec2(17.0, 31.0)) - 0.5) * 0.012;
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  }
`;

export function createFilamentBackground(canvas: HTMLCanvasElement, animated: boolean) {
  const gl = canvas.getContext("webgl", { antialias: false });
  if (!gl) throw new Error("Filament WebGL unavailable");
  const disposals: (() => void)[] = [];
  try {
    const program = createProgram(gl, VERTEX, FRAGMENT);
    disposals.push(() => gl.deleteProgram(program));
    const buffer = createAttribute(gl, program, "position", new Float32Array([-1, -1, 3, -1, -1, 3]), 2);
    disposals.push(() => gl.deleteBuffer(buffer));
    const resolutionLocation = gl.getUniformLocation(program, "resolution"), timeLocation = gl.getUniformLocation(program, "time"), pointerLocation = gl.getUniformLocation(program, "pointer"), presenceLocation = gl.getUniformLocation(program, "presence");
    let width = 1, height = 1, frame = 0, previousTime = performance.now(), previousDraw = -Infinity, elapsed = 0;
    let visible = false, paused = false, disposed = false, lost = false, dirty = true;
    let pointerX = 0, pointerY = 0, pointerPresence = 0, targetX = 0, targetY = 0, targetPresence = 0;
    const draw = (now: number) => {
      frame = 0;
      if (disposed || lost || paused || !visible || document.hidden) return;
      const delta = Math.min((now - previousTime) / 1000, 0.1);
      previousTime = now;
      if (animated) elapsed += delta;
      const ease = 1 - Math.exp(-12 * delta);
      pointerX += (targetX - pointerX) * ease;
      pointerY += (targetY - pointerY) * ease;
      pointerPresence += (targetPresence - pointerPresence) * ease;
      if (dirty || now - previousDraw >= 1000 / 30) {
        previousDraw = now;
        dirty = false;
        gl.uniform1f(timeLocation, elapsed * 0.86);
        gl.uniform2f(pointerLocation, pointerX, pointerY);
        gl.uniform1f(presenceLocation, animated ? pointerPresence : 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        canvas.dataset.renderer = "ready";
      }
      if (animated) frame = requestAnimationFrame(draw);
      else canvas.dataset.animating = "false";
    };
    const resume = () => {
      if (frame || disposed || lost || paused || !visible || document.hidden) return;
      previousTime = performance.now();
      canvas.dataset.animating = String(animated);
      frame = requestAnimationFrame(draw);
    };
    const stop = () => { cancelAnimationFrame(frame); frame = 0; canvas.dataset.animating = "false"; };
    const resize = () => {
      width = canvas.clientWidth || 1;
      height = canvas.clientHeight || 1;
      // Never upscale a low-resolution canvas. Use native CSS pixels at a
      // minimum, with extra density up to 2x when the pixel budget allows it.
      const ratio = Math.max(1, Math.min(devicePixelRatio || 1, 2, Math.sqrt(4_000_000 / (width * height))));
      const nextWidth = Math.round(width * ratio), nextHeight = Math.round(height * ratio);
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth; canvas.height = nextHeight;
        dirty = true;
      }
      gl.viewport(0, 0, nextWidth, nextHeight);
      gl.uniform2f(resolutionLocation, nextWidth, nextHeight);
      resume();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    disposals.push(() => resizeObserver.disconnect());
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) { dirty = true; resume(); }
      else stop();
    });
    intersection.observe(canvas);
    disposals.push(() => intersection.disconnect());
    const visibilityChange = () => { if (document.hidden) stop(); else { dirty = true; resume(); } };
    document.addEventListener("visibilitychange", visibilityChange);
    disposals.push(() => document.removeEventListener("visibilitychange", visibilityChange));
    const host = canvas.parentElement!;
    const move = (event: PointerEvent) => {
      if (!animated || event.pointerType !== "mouse") return;
      const rect = canvas.getBoundingClientRect();
      targetX = (event.clientX - rect.left) / width * 2 - 1;
      targetY = 1 - (event.clientY - rect.top) / height * 2;
      targetPresence = 1;
    };
    const leave = () => { targetPresence = 0; };
    host.addEventListener("pointermove", move, { passive: true });
    host.addEventListener("pointerleave", leave);
    disposals.push(() => { host.removeEventListener("pointermove", move); host.removeEventListener("pointerleave", leave); });
    const contextLost = (event: Event) => { event.preventDefault(); lost = true; stop(); canvas.dataset.renderer = "fallback"; };
    canvas.addEventListener("webglcontextlost", contextLost);
    disposals.push(() => canvas.removeEventListener("webglcontextlost", contextLost));
    resize();
    return {
      setPaused(value: boolean) { paused = value; if (paused) stop(); else { dirty = true; resume(); } },
      dispose() { disposed = true; stop(); for (const dispose of disposals.reverse()) dispose(); },
    };
  } catch (error) {
    for (const dispose of disposals.reverse()) dispose();
    throw error;
  }
}
