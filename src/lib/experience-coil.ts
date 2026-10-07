import { createAttribute, createProgram } from "./webgl";

// Curved, scroll-driven cards, recreated from Visuvate's
// Our Works section. Geometry and motion use the reference's world-space units.
export type CoilExperience = {
  role: string;
  organization: string;
  dates: string;
  category: string;
  description: string;
};

type CoilOptions = {
  items: readonly CoilExperience[];
  getProgress: () => number;
  onOpen: (index: number) => void;
  onUnavailable: () => void;
};

const CARD_VERTEX = `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 modelMatrix, viewMatrix, projectionMatrix;
  uniform float wind;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec2 outward = normalize(world.xz);
    world.xz += outward * world.y * world.y * 0.028;
    world.y -= sin(vUv.x * 3.1415) * wind * 30.0;
    world.xz -= outward * (vUv.y - 0.5) * wind * 20.0;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const CARD_FRAGMENT = `
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D map;
  uniform float opacity;
  void main() {
    vec2 halfSize = vec2(5.0, 3.75) * 0.5;
    vec2 d = abs(vUv * vec2(5.0, 3.75) - halfSize) - halfSize + 0.2;
    float distance = length(max(d, 0.0)) - 0.2;
    float alpha = 1.0 - smoothstep(-0.02, 0.02, distance);
    if (alpha < 0.01) discard;
    vec4 color = texture2D(map, vUv);
    gl_FragColor = vec4(color.rgb, color.a * alpha * opacity);
  }
`;

function wrapText(context: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && context.measureText(next).width > width) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function createCard(item: CoilExperience, index: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 768;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create experience artwork");
  const light = index % 3 === 1;
  const backgrounds = ["#241334", "#e9e0f3", "#16121e", "#39254a", "#e9e0f3", "#20172a"];
  const ink = light ? "#241432" : "#f6f0fa";
  const muted = light ? "#63516f" : "#bcaacb";
  context.fillStyle = backgrounds[index % backgrounds.length];
  context.fillRect(0, 0, 1024, 768);
  context.strokeStyle = light ? "#24143235" : "#e9d4ff35";
  context.lineWidth = 3;
  context.strokeRect(2, 2, 1020, 764);
  context.lineWidth = 1;
  context.beginPath(); context.moveTo(54, 100); context.lineTo(970, 100); context.stroke();
  context.fillStyle = muted;
  context.font = "22px monospace";
  context.fillText(item.category.toUpperCase(), 54, 64);
  context.textAlign = "right";
  context.fillText(String(index + 1).padStart(2, "0"), 970, 64);
  context.textAlign = "left";
  context.font = '500 27px "Manrope Variable"';
  context.fillText(item.organization, 54, 154);
  context.fillStyle = ink;
  context.font = '500 86px "Space Grotesk Variable"';
  const roleLines = wrapText(context, item.role, 890);
  roleLines.forEach((line, lineIndex) => context.fillText(line, 48, 263 + lineIndex * 88));
  context.fillStyle = muted;
  context.font = '400 29px "Manrope Variable"';
  const descriptionY = Math.max(446, 263 + roleLines.length * 88 + 15);
  wrapText(context, item.description, 886).forEach((line, lineIndex) => context.fillText(line, 54, descriptionY + lineIndex * 39));
  context.beginPath(); context.moveTo(54, 659); context.lineTo(970, 659); context.stroke();
  context.font = "23px monospace";
  context.fillText(item.dates, 54, 710);
  context.strokeStyle = ink;
  context.lineWidth = 3;
  context.beginPath(); context.moveTo(930, 717); context.lineTo(954, 693); context.lineTo(933, 693); context.moveTo(954, 693); context.lineTo(954, 714); context.stroke();
  return canvas;
}

export function createExperienceCoil(canvas: HTMLCanvasElement, options: CoilOptions) {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: false });
  if (!gl || !options.items.length) throw new Error("Experience WebGL unavailable");
  const disposals: (() => void)[] = [];
  try {
    const program = createProgram(gl, CARD_VERTEX, CARD_FRAGMENT);
    disposals.push(() => gl.deleteProgram(program));
    const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
    const radius = 7.7, thetaStart = Math.PI / 2 - 2.5 / radius, thetaEnd = thetaStart + 5 / radius;
    for (let row = 0; row <= 16; row++) {
      for (let column = 0; column <= 64; column++) {
        const theta = thetaStart + (5 / radius) * column / 64;
        positions.push(radius * Math.sin(theta), 1.875 - 3.75 * row / 16, radius * Math.cos(theta));
        uvs.push(column / 64, 1 - row / 16);
      }
    }
    for (let row = 0; row < 16; row++) {
      for (let column = 0; column < 64; column++) {
        const a = 65 * row + column, b = a + 65;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    for (const buffer of [createAttribute(gl, program, "position", new Float32Array(positions), 3), createAttribute(gl, program, "uv", new Float32Array(uvs), 2)]) disposals.push(() => gl.deleteBuffer(buffer));
    const indexBuffer = gl.createBuffer();
    disposals.push(() => gl.deleteBuffer(indexBuffer));
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    const uniform = (name: string) => gl.getUniformLocation(program, name);
    const modelLocation = uniform("modelMatrix"), projectionLocation = uniform("projectionMatrix"), windLocation = uniform("wind"), opacityLocation = uniform("opacity");
    const view = new Float32Array(16);
    view[0] = view[5] = view[10] = view[15] = 1;
    view[14] = -22;
    gl.uniformMatrix4fv(uniform("viewMatrix"), false, view);
    gl.uniform1i(uniform("map"), 0);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);
    const textures = options.items.map((item, index) => {
      const texture = gl.createTexture();
      disposals.push(() => gl.deleteTexture(texture));
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, createCard(item, index));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      return texture;
    });
    let width = 1, height = 1;
    const projection = new Float32Array(16);
    const resize = () => {
      width = canvas.clientWidth || 1;
      height = canvas.clientHeight || 1;
      const ratio = Math.min(devicePixelRatio || 1, 2, Math.sqrt(2_000_000 / (width * height)));
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      gl.viewport(0, 0, canvas.width, canvas.height);
      const f = 1 / Math.tan(Math.PI / 8);
      projection[0] = f / (width / height); projection[5] = f;
      projection[10] = (1000 + 0.1) / (0.1 - 1000); projection[11] = -1;
      projection[14] = 2 * 1000 * 0.1 / (0.1 - 1000);
      gl.uniformMatrix4fv(projectionLocation, false, projection);
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    disposals.push(() => resizeObserver.disconnect());
    const instances = Array.from({ length: 14 }, () => ({ index: 0, y: 0, angle: 0, opacity: 0, active: false }));
    const order = instances.map((_, index) => index);
    const matrix = new Float32Array(16);
    let progress = options.getProgress(), velocity = 0, frame = 0, previousTime = performance.now(), activeIndex = 0;
    let visible = true, disposed = false, lost = false, paused = false;
    const draw = (now: number) => {
      frame = 0;
      if (disposed || lost || paused || !visible || document.hidden) return;
      const delta = Math.min((now - previousTime) / 1000, 0.1);
      previousTime = now;
      const previousProgress = progress;
      progress += (options.getProgress() - progress) * (1 - Math.exp(-6 * delta));
      velocity = velocity * 0.8 + (progress - previousProgress) * 0.2;
      let closest = Infinity;
      instances.forEach((instance, index) => {
        const phase = index / 14 + progress;
        const turn = Math.floor(phase), fraction = phase - turn;
        instance.index = ((7 - index + 14 * turn) % textures.length + textures.length) % textures.length;
        instance.y = (fraction - 0.5) * 30;
        instance.angle = fraction * Math.PI * 3;
        const fade = fraction < 0.25 ? fraction / 0.25 : fraction > 0.75 ? (1 - fraction) / 0.25 : 1;
        instance.opacity = Math.sin(Math.PI / 2 * fade);
        instance.active = -Math.sin(instance.angle) > 0.55 && instance.opacity > 0.5;
        if (instance.active && Math.abs(instance.y) < closest) { closest = Math.abs(instance.y); activeIndex = instance.index; }
      });
      canvas.dataset.activeExperience = String(activeIndex);
      canvas.dataset.coilProgress = progress.toFixed(4);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniform1f(windLocation, velocity * 0.5);
      order.sort((a, b) => -Math.sin(instances[a].angle) + Math.sin(instances[b].angle));
      for (const index of order) {
        const instance = instances[index];
        if (instance.opacity <= 0.001) continue;
        const cos = Math.cos(instance.angle), sin = Math.sin(instance.angle);
        matrix.fill(0);
        matrix[0] = cos; matrix[2] = -sin; matrix[5] = 1; matrix[8] = sin; matrix[10] = cos; matrix[13] = instance.y; matrix[15] = 1;
        gl.bindTexture(gl.TEXTURE_2D, textures[instance.index]);
        gl.uniform1f(opacityLocation, instance.opacity);
        gl.uniformMatrix4fv(modelLocation, false, matrix);
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
      }
      frame = requestAnimationFrame(draw);
    };
    const resume = () => {
      if (!frame && !disposed && !lost && !paused && visible && !document.hidden) { previousTime = performance.now(); frame = requestAnimationFrame(draw); }
    };
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) resume();
      else { cancelAnimationFrame(frame); frame = 0; }
    });
    intersection.observe(canvas);
    disposals.push(() => intersection.disconnect());
    const visibilityChange = () => {
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
      else resume();
    };
    document.addEventListener("visibilitychange", visibilityChange);
    disposals.push(() => document.removeEventListener("visibilitychange", visibilityChange));
    const corners = [thetaStart, thetaEnd].flatMap((theta) => [1.875, -1.875].map((y) => [radius * Math.sin(theta), y, radius * Math.cos(theta)]));
    const project = (point: number[], y: number, angle: number) => {
      const cos = Math.cos(angle), sin = Math.sin(angle);
      let x = cos * point[0] + sin * point[2], z = -sin * point[0] + cos * point[2];
      const worldY = point[1] + y, expansion = worldY * worldY * 0.028, length = Math.hypot(x, z);
      x += x / length * expansion; z += z / length * expansion;
      const depth = 22 - z;
      return [(projection[0] * x / depth + 1) * width / 2, (1 - projection[5] * worldY / depth) * height / 2];
    };
    const hit = (event: PointerEvent | MouseEvent) => {
      const rect = canvas.getBoundingClientRect(), point = [event.clientX - rect.left, event.clientY - rect.top];
      for (const instance of [...instances].filter((item) => item.active).sort((a, b) => Math.sin(a.angle) - Math.sin(b.angle))) {
        const polygon = [corners[0], corners[2], corners[3], corners[1]].map((corner) => project(corner, instance.y, instance.angle));
        const crosses = polygon.map((a, index) => { const b = polygon[(index + 1) % 4]; return (b[0] - a[0]) * (point[1] - a[1]) - (b[1] - a[1]) * (point[0] - a[0]); });
        if (crosses.every((value) => value >= 0) || crosses.every((value) => value <= 0)) return instance.index;
      }
      return null;
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      canvas.style.cursor = hit(event) !== null ? "pointer" : "";
    };
    const leave = () => { canvas.style.cursor = ""; };
    let pointerDown: { x: number; y: number } | null = null;
    const down = (event: PointerEvent) => { pointerDown = { x: event.clientX, y: event.clientY }; };
    const click = (event: MouseEvent) => {
      if (pointerDown && Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 10) return;
      const index = hit(event);
      if (index !== null) { canvas.focus({ preventScroll: true }); options.onOpen(index); }
    };
    const contextLost = (event: Event) => { event.preventDefault(); lost = true; cancelAnimationFrame(frame); frame = 0; options.onUnavailable(); };
    for (const [name, listener] of [["pointermove", move], ["pointerleave", leave], ["pointerdown", down], ["click", click]] as const) {
      canvas.addEventListener(name, listener as EventListener);
      disposals.push(() => canvas.removeEventListener(name, listener as EventListener));
    }
    canvas.addEventListener("webglcontextlost", contextLost);
    disposals.push(() => canvas.removeEventListener("webglcontextlost", contextLost));
    resume();
    return {
      getActiveIndex: () => activeIndex,
      setPaused(value: boolean) { paused = value; if (paused) { cancelAnimationFrame(frame); frame = 0; } else resume(); },
      dispose() { disposed = true; cancelAnimationFrame(frame); for (const dispose of disposals.reverse()) dispose(); },
    };
  } catch (error) {
    for (const dispose of disposals.reverse()) dispose();
    throw error;
  }
}
