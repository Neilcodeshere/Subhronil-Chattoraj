// Interactive WebGL project globe with curved discs, arcball controls, and
// camera motion. Includes lifecycle cleanup, image fallbacks, and keyboard
// navigation for integration with the portfolio.
import { mat4, quat, vec2, vec3 } from "gl-matrix";

const discVertShaderSource = `#version 300 es
uniform mat4 uWorldMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec3 uCameraPosition;
uniform vec4 uRotationAxisVelocity;
in vec3 aModelPosition;
in vec3 aModelNormal;
in vec2 aModelUvs;
in mat4 aInstanceMatrix;
out vec2 vUvs;
out float vAlpha;
flat out int vInstanceId;
#define PI 3.141593
void main() {
    vec4 worldPosition = uWorldMatrix * aInstanceMatrix * vec4(aModelPosition, 1.);
    vec3 centerPos = (uWorldMatrix * aInstanceMatrix * vec4(0., 0., 0., 1.)).xyz;
    float radius = length(centerPos.xyz);
    if (gl_VertexID > 0) {
        vec3 rotationAxis = uRotationAxisVelocity.xyz;
        float rotationVelocity = min(.15, uRotationAxisVelocity.w * 15.);
        vec3 stretchDir = normalize(cross(centerPos, rotationAxis));
        vec3 relativeVertexPos = normalize(worldPosition.xyz - centerPos);
        float strength = dot(stretchDir, relativeVertexPos);
        float invAbsStrength = min(0., abs(strength) - 1.);
        strength = rotationVelocity * sign(strength) * abs(invAbsStrength * invAbsStrength * invAbsStrength + 1.);
        worldPosition.xyz += stretchDir * strength;
    }
    worldPosition.xyz = radius * normalize(worldPosition.xyz);
    gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;
    vAlpha = smoothstep(0.5, 1., normalize(worldPosition.xyz).z) * .9 + .1;
    vUvs = aModelUvs;
    vInstanceId = gl_InstanceID;
}`;

const discFragShaderSource = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform int uItemCount;
uniform int uAtlasSize;
out vec4 outColor;
in vec2 vUvs;
in float vAlpha;
flat in int vInstanceId;
void main() {
    int itemIndex = vInstanceId % uItemCount;
    int cellsPerRow = uAtlasSize;
    int cellX = itemIndex % cellsPerRow;
    int cellY = itemIndex / cellsPerRow;
    vec2 cellSize = vec2(1.0) / vec2(float(cellsPerRow));
    vec2 cellOffset = vec2(float(cellX), float(cellY)) * cellSize;
    ivec2 texSize = textureSize(uTex, 0);
    float imageAspect = float(texSize.x) / float(texSize.y);
    float containerAspect = 1.0;
    float scale = max(imageAspect / containerAspect, containerAspect / imageAspect);
    vec2 st = vec2(vUvs.x, 1.0 - vUvs.y);
    st = (st - 0.5) * scale + 0.5;
    st = clamp(st, 0.0, 1.0);
    st = st * cellSize + cellOffset;
    outColor = texture(uTex, st);
    outColor.a *= vAlpha;
}`;

class Face {
  constructor(a, b, c) { this.a = a; this.b = b; this.c = c; }
}

class Vertex {
  constructor(x, y, z) {
    this.position = vec3.fromValues(x, y, z);
    this.normal = vec3.create();
    this.uv = vec2.create();
  }
}

class Geometry {
  constructor() { this.vertices = []; this.faces = []; }

  addVertex(...args) {
    for (let i = 0; i < args.length; i += 3) this.vertices.push(new Vertex(args[i], args[i + 1], args[i + 2]));
    return this;
  }

  addFace(...args) {
    for (let i = 0; i < args.length; i += 3) this.faces.push(new Face(args[i], args[i + 1], args[i + 2]));
    return this;
  }

  get lastVertex() { return this.vertices[this.vertices.length - 1]; }

  subdivide(divisions = 1) {
    const cache = {};
    let faces = this.faces;
    for (let div = 0; div < divisions; ++div) {
      const next = new Array(faces.length * 4);
      faces.forEach((face, index) => {
        const ab = this.getMidPoint(face.a, face.b, cache);
        const bc = this.getMidPoint(face.b, face.c, cache);
        const ca = this.getMidPoint(face.c, face.a, cache);
        const i = index * 4;
        next[i] = new Face(face.a, ab, ca);
        next[i + 1] = new Face(face.b, bc, ab);
        next[i + 2] = new Face(face.c, ca, bc);
        next[i + 3] = new Face(ab, bc, ca);
      });
      faces = next;
    }
    this.faces = faces;
    return this;
  }

  spherize(radius = 1) {
    this.vertices.forEach((vertex) => {
      vec3.normalize(vertex.normal, vertex.position);
      vec3.scale(vertex.position, vertex.normal, radius);
    });
    return this;
  }

  get data() {
    return {
      vertices: new Float32Array(this.vertices.flatMap((vertex) => Array.from(vertex.position))),
      indices: new Uint16Array(this.faces.flatMap((face) => [face.a, face.b, face.c])),
      uvs: new Float32Array(this.vertices.flatMap((vertex) => Array.from(vertex.uv))),
    };
  }

  getMidPoint(a, b, cache) {
    const key = a < b ? `k_${b}_${a}` : `k_${a}_${b}`;
    if (Object.hasOwn(cache, key)) return cache[key];
    const pa = this.vertices[a].position;
    const pb = this.vertices[b].position;
    const index = this.vertices.length;
    cache[key] = index;
    this.addVertex((pa[0] + pb[0]) * 0.5, (pa[1] + pb[1]) * 0.5, (pa[2] + pb[2]) * 0.5);
    return index;
  }
}

class IcosahedronGeometry extends Geometry {
  constructor() {
    super();
    const t = Math.sqrt(5) * 0.5 + 0.5;
    this.addVertex(
      -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, 0, 0, -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, t, 0, -1, t, 0, 1, -t, 0, -1, -t, 0, 1,
    ).addFace(
      0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1,
    );
  }
}

class DiscGeometry extends Geometry {
  constructor(steps = 4, radius = 1) {
    super();
    steps = Math.max(4, steps);
    const alpha = (2 * Math.PI) / steps;
    this.addVertex(0, 0, 0);
    vec2.set(this.lastVertex.uv, 0.5, 0.5);
    for (let i = 0; i < steps; ++i) {
      const x = Math.cos(alpha * i);
      const y = Math.sin(alpha * i);
      this.addVertex(radius * x, radius * y, 0);
      vec2.set(this.lastVertex.uv, x * 0.5 + 0.5, y * 0.5 + 0.5);
      if (i > 0) this.addFace(0, i, i + 1);
    }
    this.addFace(0, steps, 1);
  }
}

function createProgram(gl) {
  const program = gl.createProgram();
  const shaders = [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER].map((type, index) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, [discVertShaderSource, discFragShaderSource][index]);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(error || "Unable to compile the project globe shader");
    }
    gl.attachShader(program, shader);
    return shader;
  });
  const attributes = { aModelPosition: 0, aModelNormal: 1, aModelUvs: 2, aInstanceMatrix: 3 };
  Object.entries(attributes).forEach(([name, location]) => gl.bindAttribLocation(program, location, name));
  gl.linkProgram(program);
  shaders.forEach((shader) => { gl.detachShader(program, shader); gl.deleteShader(shader); });
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const error = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(error || "Unable to link the project globe shader");
  }
  return program;
}

class ArcballControl {
  isPointerDown = false;
  orientation = quat.create();
  pointerRotation = quat.create();
  rotationVelocity = 0;
  rotationAxis = vec3.fromValues(1, 0, 0);
  snapDirection = vec3.fromValues(0, 0, -1);
  snapTargetDirection = null;
  EPSILON = 0.1;
  IDENTITY_QUAT = quat.create();

  constructor(canvas, updateCallback) {
    this.canvas = canvas;
    this.updateCallback = updateCallback;
    this.pointerPos = vec2.create();
    this.previousPointerPos = vec2.create();
    this._rotationVelocity = 0;
    this._combinedQuat = quat.create();
    this.pointerId = null;
    this.onDown = (event) => {
      if (!event.isPrimary || event.button !== 0) return;
      const bounds = canvas.getBoundingClientRect();
      vec2.set(this.pointerPos, event.clientX - bounds.left, event.clientY - bounds.top);
      vec2.copy(this.previousPointerPos, this.pointerPos);
      this.isPointerDown = true;
      this.pointerId = event.pointerId;
      canvas.setPointerCapture(event.pointerId);
    };
    this.onUp = (event) => {
      if (event.pointerId !== this.pointerId) return;
      this.isPointerDown = false;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      this.pointerId = null;
    };
    this.onMove = (event) => {
      if (!this.isPointerDown || event.pointerId !== this.pointerId) return;
      const bounds = canvas.getBoundingClientRect();
      vec2.set(this.pointerPos, event.clientX - bounds.left, event.clientY - bounds.top);
    };
    canvas.addEventListener("pointerdown", this.onDown);
    canvas.addEventListener("pointerup", this.onUp);
    canvas.addEventListener("pointercancel", this.onUp);
    canvas.addEventListener("lostpointercapture", this.onUp);
    canvas.addEventListener("pointermove", this.onMove);
    canvas.style.touchAction = "none";
  }

  update(deltaTime, targetFrameDuration = 16) {
    const timeScale = deltaTime / targetFrameDuration + 0.00001;
    let angleFactor = timeScale;
    const snapRotation = quat.create();
    if (this.isPointerDown) {
      const intensity = 0.3 * timeScale;
      const amplification = 5 / timeScale;
      const mid = vec2.sub(vec2.create(), this.pointerPos, this.previousPointerPos);
      vec2.scale(mid, mid, intensity);
      if (vec2.sqrLen(mid) > this.EPSILON) {
        vec2.add(mid, this.previousPointerPos, mid);
        const a = vec3.normalize(vec3.create(), this.project(mid));
        const b = vec3.normalize(vec3.create(), this.project(this.previousPointerPos));
        vec2.copy(this.previousPointerPos, mid);
        angleFactor *= amplification;
        this.quatFromVectors(a, b, this.pointerRotation, angleFactor);
      } else {
        quat.slerp(this.pointerRotation, this.pointerRotation, this.IDENTITY_QUAT, Math.min(1, intensity));
      }
    } else {
      quat.slerp(this.pointerRotation, this.pointerRotation, this.IDENTITY_QUAT, Math.min(1, 0.1 * timeScale));
      if (this.snapTargetDirection) {
        const a = this.snapTargetDirection;
        const b = this.snapDirection;
        const distanceFactor = Math.max(0.1, 1 - vec3.squaredDistance(a, b) * 10);
        angleFactor *= 0.2 * distanceFactor;
        this.quatFromVectors(a, b, snapRotation, angleFactor);
      }
    }
    const combined = quat.multiply(quat.create(), snapRotation, this.pointerRotation);
    quat.multiply(this.orientation, combined, this.orientation);
    quat.normalize(this.orientation, this.orientation);
    quat.slerp(this._combinedQuat, this._combinedQuat, combined, Math.min(1, 0.8 * timeScale));
    quat.normalize(this._combinedQuat, this._combinedQuat);
    const rad = Math.acos(Math.max(-1, Math.min(1, this._combinedQuat[3]))) * 2;
    const s = Math.sin(rad / 2);
    let velocity = 0;
    if (s > 0.000001) {
      velocity = rad / (2 * Math.PI);
      vec3.set(this.rotationAxis, this._combinedQuat[0] / s, this._combinedQuat[1] / s, this._combinedQuat[2] / s);
    }
    this._rotationVelocity += (velocity - this._rotationVelocity) * Math.min(1, 0.5 * timeScale);
    this.rotationVelocity = this._rotationVelocity / timeScale;
    this.updateCallback(deltaTime);
  }

  quatFromVectors(a, b, out, factor = 1) {
    const axis = vec3.cross(vec3.create(), a, b);
    if (vec3.sqrLen(axis) < 0.00000001) { quat.identity(out); return; }
    vec3.normalize(axis, axis);
    const angle = Math.acos(Math.max(-1, Math.min(1, vec3.dot(a, b)))) * factor;
    quat.setAxisAngle(out, axis, angle);
  }

  project(position) {
    const r = 2;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const size = Math.max(w, h) - 1;
    const x = (2 * position[0] - w - 1) / size;
    const y = (2 * position[1] - h - 1) / size;
    const squared = x * x + y * y;
    const z = squared <= r * r / 2 ? Math.sqrt(r * r - squared) : r * r / Math.sqrt(squared);
    return vec3.fromValues(-x, y, z);
  }

  dispose() {
    this.canvas.removeEventListener("pointerdown", this.onDown);
    this.canvas.removeEventListener("pointerup", this.onUp);
    this.canvas.removeEventListener("pointercancel", this.onUp);
    this.canvas.removeEventListener("lostpointercapture", this.onUp);
    this.canvas.removeEventListener("pointermove", this.onMove);
    if (this.pointerId !== null && this.canvas.hasPointerCapture(this.pointerId)) this.canvas.releasePointerCapture(this.pointerId);
  }
}

/** @typedef {{ image: string, link: string, title: string, description: string }} MenuItem */

export class InfiniteGridMenu {
  TARGET_FRAME_DURATION = 1000 / 60;
  SPHERE_RADIUS = 2;
  smoothRotationVelocity = 0;
  movementActive = false;
  disposed = false;
  running = false;
  frame = 0;
  lastTime = 0;
  activeIndex = -1;
  buffers = [];
  camera = {
    matrix: mat4.create(), near: 0.1, far: 40, fov: Math.PI / 4, aspect: 1,
    position: vec3.fromValues(0, 0, 3), up: vec3.fromValues(0, 1, 0),
    matrices: { view: mat4.create(), projection: mat4.create() },
  };

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {MenuItem[]} items
   * @param {(index: number) => void} onActiveItemChange
   * @param {(moving: boolean) => void} onMovementChange
   * @param {() => void} onReady
   * @param {number} scale
   */
  constructor(canvas, items, onActiveItemChange, onMovementChange, onReady, scale = 1) {
    this.canvas = canvas;
    this.items = items;
    this.onActiveItemChange = onActiveItemChange;
    this.onMovementChange = onMovementChange;
    this.scaleFactor = scale;
    this.camera.position[2] = 3 * scale;
    const gl = canvas.getContext("webgl2", { antialias: true, alpha: true });
    if (!gl || !items.length) throw new Error("The project orbit requires WebGL 2 and at least one project");
    this.gl = gl;
    this.program = createProgram(gl);
    this.locations = {};
    for (const name of ["uWorldMatrix", "uViewMatrix", "uProjectionMatrix", "uCameraPosition", "uRotationAxisVelocity", "uTex", "uItemCount", "uAtlasSize"]) {
      this.locations[name] = gl.getUniformLocation(this.program, name);
    }
    this.discData = new DiscGeometry(56, 1).data;
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    this.createAttribute(this.discData.vertices, gl.getAttribLocation(this.program, "aModelPosition"), 3);
    this.createAttribute(this.discData.uvs, gl.getAttribLocation(this.program, "aModelUvs"), 2);
    const indexBuffer = gl.createBuffer();
    this.buffers.push(indexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.discData.indices, gl.STATIC_DRAW);
    const sphere = new IcosahedronGeometry().subdivide(1).spherize(this.SPHERE_RADIUS);
    this.instancePositions = sphere.vertices.map((vertex) => vertex.position);
    this.instanceCount = sphere.vertices.length;
    this.matricesArray = new Float32Array(this.instanceCount * 16);
    this.matrices = Array.from({ length: this.instanceCount }, (_, index) => new Float32Array(this.matricesArray.buffer, index * 16 * 4, 16));
    this.instanceBuffer = gl.createBuffer();
    this.buffers.push(this.instanceBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.matricesArray.byteLength, gl.DYNAMIC_DRAW);
    const location = gl.getAttribLocation(this.program, "aInstanceMatrix");
    for (let i = 0; i < 4; ++i) {
      gl.enableVertexAttribArray(location + i);
      gl.vertexAttribPointer(location + i, 4, gl.FLOAT, false, 16 * 4, i * 4 * 4);
      gl.vertexAttribDivisor(location + i, 1);
    }
    gl.bindVertexArray(null);
    this.worldMatrix = mat4.create();
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    this.atlasSize = Math.ceil(Math.sqrt(items.length));
    this.control = new ArcballControl(canvas, (deltaTime) => this.onControlUpdate(deltaTime));
    this.focusInstance(0);
    this.resize();
    this.animate(16);
    this.render();
    this.loadTexture(onReady);
  }

  createAttribute(data, location, size) {
    const gl = this.gl;
    const buffer = gl.createBuffer();
    this.buffers.push(buffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  }

  loadTexture(onReady) {
    const cellSize = 512;
    const atlas = document.createElement("canvas");
    atlas.width = atlas.height = this.atlasSize * cellSize;
    const ctx = atlas.getContext("2d");
    Promise.all(this.items.map((item) => new Promise((resolve) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = item.image;
    }))).then((images) => {
      if (this.disposed || this.gl.isContextLost()) return;
      images.forEach((image, index) => {
        const x = index % this.atlasSize * cellSize;
        const y = Math.floor(index / this.atlasSize) * cellSize;
        if (image) ctx.drawImage(image, x, y, cellSize, cellSize);
        else {
          ctx.fillStyle = "#241b31";
          ctx.fillRect(x, y, cellSize, cellSize);
          ctx.fillStyle = "#f1edf5";
          ctx.font = "bold 42px sans-serif";
          ctx.fillText(this.items[index].title.slice(0, 18), x + 24, y + cellSize / 2);
        }
      });
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
      gl.generateMipmap(gl.TEXTURE_2D);
      this.render();
      onReady();
    });
  }

  resize() {
    if (this.disposed) return;
    const canvas = this.canvas;
    const gl = this.gl;
    const dpr = Math.min(2, window.devicePixelRatio);
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    this.camera.aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    const height = this.SPHERE_RADIUS * 0.35;
    const distance = this.camera.position[2];
    this.camera.fov = this.camera.aspect > 1 ? 2 * Math.atan(height / distance) : 2 * Math.atan(height / this.camera.aspect / distance);
    mat4.perspective(this.camera.matrices.projection, this.camera.fov, this.camera.aspect, this.camera.near, this.camera.far);
    this.updateCameraMatrix();
    this.render();
  }

  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.lastTime = performance.now();
    this.frame = requestAnimationFrame((time) => this.run(time));
    this.canvas.dataset.animating = "true";
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frame);
    this.canvas.dataset.animating = "false";
    if (this.control) this.control.isPointerDown = false;
  }

  run(time) {
    if (!this.running || this.disposed) return;
    const deltaTime = Math.max(1, Math.min(32, time - this.lastTime));
    this.lastTime = time;
    this.animate(deltaTime);
    this.render();
    this.frame = requestAnimationFrame((nextTime) => this.run(nextTime));
  }

  animate(deltaTime) {
    this.control.update(deltaTime, this.TARGET_FRAME_DURATION);
    this.instancePositions.forEach((position, index) => {
      const p = vec3.transformQuat(vec3.create(), position, this.control.orientation);
      const s = Math.abs(p[2]) / this.SPHERE_RADIUS * 0.6 + 0.4;
      const scale = s * 0.25;
      const matrix = mat4.create();
      mat4.multiply(matrix, matrix, mat4.fromTranslation(mat4.create(), vec3.negate(vec3.create(), p)));
      mat4.multiply(matrix, matrix, mat4.targetTo(mat4.create(), [0, 0, 0], p, [0, 1, 0]));
      mat4.multiply(matrix, matrix, mat4.fromScaling(mat4.create(), [scale, scale, scale]));
      mat4.multiply(matrix, matrix, mat4.fromTranslation(mat4.create(), [0, 0, -this.SPHERE_RADIUS]));
      mat4.copy(this.matrices[index], matrix);
    });
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instanceBuffer);
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.matricesArray);
    this.smoothRotationVelocity = this.control.rotationVelocity;
  }

  render() {
    if (this.disposed || this.gl.isContextLost()) return;
    const gl = this.gl;
    const locations = this.locations;
    gl.useProgram(this.program);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(locations.uWorldMatrix, false, this.worldMatrix);
    gl.uniformMatrix4fv(locations.uViewMatrix, false, this.camera.matrices.view);
    gl.uniformMatrix4fv(locations.uProjectionMatrix, false, this.camera.matrices.projection);
    gl.uniform3fv(locations.uCameraPosition, this.camera.position);
    gl.uniform4f(locations.uRotationAxisVelocity, this.control.rotationAxis[0], this.control.rotationAxis[1], this.control.rotationAxis[2], this.smoothRotationVelocity * 1.1);
    gl.uniform1i(locations.uItemCount, this.items.length);
    gl.uniform1i(locations.uAtlasSize, this.atlasSize);
    gl.uniform1i(locations.uTex, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.bindVertexArray(this.vao);
    gl.drawElementsInstanced(gl.TRIANGLES, this.discData.indices.length, gl.UNSIGNED_SHORT, 0, this.instanceCount);
    gl.bindVertexArray(null);
  }

  updateCameraMatrix() {
    mat4.targetTo(this.camera.matrix, this.camera.position, [0, 0, 0], this.camera.up);
    mat4.invert(this.camera.matrices.view, this.camera.matrix);
  }

  onControlUpdate(deltaTime) {
    const timeScale = deltaTime / this.TARGET_FRAME_DURATION + 0.0001;
    let damping = 5 / timeScale;
    let cameraTargetZ = 3 * this.scaleFactor;
    const moving = this.control.isPointerDown || Math.abs(this.smoothRotationVelocity) > 0.01;
    if (moving !== this.movementActive) {
      this.movementActive = moving;
      this.onMovementChange(moving);
    }
    if (!this.control.isPointerDown) {
      const nearest = this.findNearestVertexIndex();
      const index = nearest % this.items.length;
      if (index !== this.activeIndex) { this.activeIndex = index; this.onActiveItemChange(index); }
      this.control.snapTargetDirection = vec3.normalize(vec3.create(), this.getVertexWorldPosition(nearest));
    } else {
      cameraTargetZ += this.control.rotationVelocity * 80 + 2.5;
      damping = 7 / timeScale;
    }
    this.camera.position[2] += (cameraTargetZ - this.camera.position[2]) / damping;
    this.updateCameraMatrix();
  }

  findNearestVertexIndex() {
    const inverse = quat.conjugate(quat.create(), this.control.orientation);
    const target = vec3.transformQuat(vec3.create(), this.control.snapDirection, inverse);
    let max = -Infinity;
    let nearest = 0;
    this.instancePositions.forEach((position, index) => {
      const dot = vec3.dot(target, position);
      if (dot > max) { max = dot; nearest = index; }
    });
    return nearest;
  }

  getVertexWorldPosition(index) {
    return vec3.transformQuat(vec3.create(), this.instancePositions[index], this.control.orientation);
  }

  focusInstance(index) {
    const position = vec3.normalize(vec3.create(), this.getVertexWorldPosition(index));
    const rotation = quat.rotationTo(quat.create(), position, this.control.snapDirection);
    quat.multiply(this.control.orientation, rotation, this.control.orientation);
    quat.normalize(this.control.orientation, this.control.orientation);
    quat.identity(this.control.pointerRotation);
    this.control.snapTargetDirection = vec3.clone(this.control.snapDirection);
    this.control.rotationVelocity = this.control._rotationVelocity = this.smoothRotationVelocity = 0;
    this.camera.position[2] = 3 * this.scaleFactor;
  }

  /** @param {"reset" | "next" | "prev"} kind */
  command(kind) {
    const nearest = this.findNearestVertexIndex();
    let index = 0;
    if (kind !== "reset") {
      const direction = kind === "next" ? 1 : -1;
      if (this.items.length === 1) index = (nearest + direction * 5 + this.instanceCount) % this.instanceCount;
      else {
        const project = (this.activeIndex + direction + this.items.length) % this.items.length;
        let best = -Infinity;
        for (let i = project; i < this.instanceCount; i += this.items.length) {
          const dot = vec3.dot(this.getVertexWorldPosition(i), this.control.snapDirection);
          if (dot > best) { best = dot; index = i; }
        }
      }
    }
    this.focusInstance(index);
    this.animate(16);
    this.render();
  }

  dispose() {
    this.stop();
    this.disposed = true;
    this.control?.dispose();
    const gl = this.gl;
    this.buffers.forEach((buffer) => gl.deleteBuffer(buffer));
    gl.deleteVertexArray(this.vao);
    gl.deleteTexture(this.texture);
    gl.deleteProgram(this.program);
  }
}
