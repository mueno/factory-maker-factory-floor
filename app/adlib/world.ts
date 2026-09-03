// Adlib World Layer — Solaris pattern B, feasible on a static host (Codex Site).
//
// Among the three Solaris-style approaches (A: WebRTC + server GPU inference,
// B: fully on-device WebGPU, C: low-res streaming + client super-resolution),
// only B works when the web server is static hosting with no GPU backend.
// This module is that pattern: a real-time fluid "world" computed entirely on
// the visitor's GPU, where input is not an event handler but a physical signal —
// pointer motion injects momentum, app interactions bloom light, and a thinking
// brain stirs the field. Everything deterministic stays in the DOM app layer;
// this layer carries the organic pixel response.
//
// No WebGPU → createWorld resolves null and the page keeps its static skin.

const SIM_W = 320;
const SIM_H = 180;
const JACOBI_ITERATIONS = 18;
const MAX_SPLATS = 16;

export type WorldHandle = {
  pointer: (nx: number, ny: number, dx: number, dy: number) => void;
  pulse: (nx: number, ny: number, power: number, tone: 'cyan' | 'gold' | 'coral') => void;
  setBusy: (busy: boolean) => void;
  frames: () => number; // diagnostics: rendered frame count
  destroy: () => void;
};

type Splat = { x: number; y: number; vx: number; vy: number; r: number; g: number; b: number; radius: number };

const TONES = {
  cyan: [0.28, 0.78, 0.92],
  gold: [0.98, 0.78, 0.34],
  coral: [0.99, 0.45, 0.36],
} as const;

const WGSL = /* wgsl */ `
struct Params {
  texel: vec2f,
  aspect: f32,
  dt: f32,
  dissV: f32,
  dissD: f32,
  curl: f32,
  time: f32,
};
struct SplatItem { pos: vec2f, vel: vec2f, color: vec4f };
struct Splats { count: vec4u, items: array<SplatItem, ${MAX_SPLATS}> };

@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var velIn: texture_2d<f32>;
@group(0) @binding(3) var velOut: texture_storage_2d<rgba16float, write>;
@group(0) @binding(4) var dyeIn: texture_2d<f32>;
@group(0) @binding(5) var dyeOut: texture_storage_2d<rgba16float, write>;
@group(0) @binding(6) var<uniform> S: Splats;
@group(0) @binding(7) var scalarA: texture_2d<f32>;
@group(0) @binding(8) var scalarB: texture_2d<f32>;
@group(0) @binding(9) var scalarOut: texture_storage_2d<r32float, write>;

fn uvOf(gid: vec3u) -> vec2f { return (vec2f(gid.xy) + vec2f(0.5)) * P.texel; }
fn inBounds(gid: vec3u) -> bool { return gid.x < u32(${SIM_W}) && gid.y < u32(${SIM_H}); }

@compute @workgroup_size(8, 8)
fn advectVel(@builtin(global_invocation_id) gid: vec3u) {
  if (!inBounds(gid)) { return; }
  let uv = uvOf(gid);
  let vel = textureSampleLevel(velIn, samp, uv, 0.0).xy;
  let back = uv - vel * P.dt * P.texel;
  let next = textureSampleLevel(velIn, samp, back, 0.0).xy * P.dissV;
  textureStore(velOut, vec2i(gid.xy), vec4f(next, 0.0, 0.0));
}

@compute @workgroup_size(8, 8)
fn advectDye(@builtin(global_invocation_id) gid: vec3u) {
  if (!inBounds(gid)) { return; }
  let uv = uvOf(gid);
  let vel = textureSampleLevel(velIn, samp, uv, 0.0).xy;
  let back = uv - vel * P.dt * P.texel;
  let next = textureSampleLevel(dyeIn, samp, back, 0.0).rgb * P.dissD;
  textureStore(dyeOut, vec2i(gid.xy), vec4f(next, 1.0));
}

@compute @workgroup_size(8, 8)
fn splat(@builtin(global_invocation_id) gid: vec3u) {
  if (!inBounds(gid)) { return; }
  let uv = uvOf(gid);
  var vel = textureLoad(velIn, vec2i(gid.xy), 0).xy;
  var dye = textureLoad(dyeIn, vec2i(gid.xy), 0).rgb;
  for (var i = 0u; i < S.count.x; i = i + 1u) {
    let item = S.items[i];
    var d = uv - item.pos;
    d.x = d.x * P.aspect;
    let factor = exp(-dot(d, d) / max(item.color.w, 0.0005));
    vel = vel + item.vel * factor;
    dye = dye + item.color.rgb * factor;
  }
  textureStore(velOut, vec2i(gid.xy), vec4f(vel, 0.0, 0.0));
  textureStore(dyeOut, vec2i(gid.xy), vec4f(min(dye, vec3f(2.4)), 1.0));
}

@compute @workgroup_size(8, 8)
fn curl(@builtin(global_invocation_id) gid: vec3u) {
  if (!inBounds(gid)) { return; }
  let x = i32(gid.x); let y = i32(gid.y);
  let l = textureLoad(velIn, vec2i(max(x - 1, 0), y), 0).y;
  let r = textureLoad(velIn, vec2i(min(x + 1, ${SIM_W - 1}), y), 0).y;
  let b = textureLoad(velIn, vec2i(x, max(y - 1, 0)), 0).x;
  let t = textureLoad(velIn, vec2i(x, min(y + 1, ${SIM_H - 1})), 0).x;
  textureStore(scalarOut, vec2i(gid.xy), vec4f(0.5 * ((r - l) - (t - b)), 0.0, 0.0, 0.0));
}

@compute @workgroup_size(8, 8)
fn vorticity(@builtin(global_invocation_id) gid: vec3u) {
  if (!inBounds(gid)) { return; }
  let x = i32(gid.x); let y = i32(gid.y);
  let l = abs(textureLoad(scalarA, vec2i(max(x - 1, 0), y), 0).x);
  let r = abs(textureLoad(scalarA, vec2i(min(x + 1, ${SIM_W - 1}), y), 0).x);
  let b = abs(textureLoad(scalarA, vec2i(x, max(y - 1, 0)), 0).x);
  let t = abs(textureLoad(scalarA, vec2i(x, min(y + 1, ${SIM_H - 1})), 0).x);
  let c = textureLoad(scalarA, vec2i(x, y), 0).x;
  var force = vec2f(abs(t) - abs(b), abs(l) - abs(r));
  force = force / (length(force) + 0.0001);
  let vel = textureLoad(velIn, vec2i(gid.xy), 0).xy + force * c * P.curl * P.dt;
  textureStore(velOut, vec2i(gid.xy), vec4f(clamp(vel, vec2f(-40.0), vec2f(40.0)), 0.0, 0.0));
}

@compute @workgroup_size(8, 8)
fn divergence(@builtin(global_invocation_id) gid: vec3u) {
  if (!inBounds(gid)) { return; }
  let x = i32(gid.x); let y = i32(gid.y);
  let l = textureLoad(velIn, vec2i(max(x - 1, 0), y), 0).x;
  let r = textureLoad(velIn, vec2i(min(x + 1, ${SIM_W - 1}), y), 0).x;
  let b = textureLoad(velIn, vec2i(x, max(y - 1, 0)), 0).y;
  let t = textureLoad(velIn, vec2i(x, min(y + 1, ${SIM_H - 1})), 0).y;
  textureStore(scalarOut, vec2i(gid.xy), vec4f(0.5 * ((r - l) + (t - b)), 0.0, 0.0, 0.0));
}

// scalarA = pressure(read), scalarB = divergence
@compute @workgroup_size(8, 8)
fn jacobi(@builtin(global_invocation_id) gid: vec3u) {
  if (!inBounds(gid)) { return; }
  let x = i32(gid.x); let y = i32(gid.y);
  let l = textureLoad(scalarA, vec2i(max(x - 1, 0), y), 0).x;
  let r = textureLoad(scalarA, vec2i(min(x + 1, ${SIM_W - 1}), y), 0).x;
  let b = textureLoad(scalarA, vec2i(x, max(y - 1, 0)), 0).x;
  let t = textureLoad(scalarA, vec2i(x, min(y + 1, ${SIM_H - 1})), 0).x;
  let div = textureLoad(scalarB, vec2i(x, y), 0).x;
  textureStore(scalarOut, vec2i(gid.xy), vec4f((l + r + b + t - div) * 0.25, 0.0, 0.0, 0.0));
}

// scalarA = pressure(read)
@compute @workgroup_size(8, 8)
fn gradientSubtract(@builtin(global_invocation_id) gid: vec3u) {
  if (!inBounds(gid)) { return; }
  let x = i32(gid.x); let y = i32(gid.y);
  let l = textureLoad(scalarA, vec2i(max(x - 1, 0), y), 0).x;
  let r = textureLoad(scalarA, vec2i(min(x + 1, ${SIM_W - 1}), y), 0).x;
  let b = textureLoad(scalarA, vec2i(x, max(y - 1, 0)), 0).x;
  let t = textureLoad(scalarA, vec2i(x, min(y + 1, ${SIM_H - 1})), 0).x;
  let vel = textureLoad(velIn, vec2i(gid.xy), 0).xy - 0.5 * vec2f(r - l, t - b);
  textureStore(velOut, vec2i(gid.xy), vec4f(vel, 0.0, 0.0));
}

struct VSOut { @builtin(position) pos: vec4f, @location(0) uv: vec2f };

@vertex
fn fullscreen(@builtin(vertex_index) index: u32) -> VSOut {
  var out: VSOut;
  let x = f32(i32(index & 1u) * 4 - 1);
  let y = f32(i32(index >> 1u) * 4 - 1);
  out.pos = vec4f(x, y, 0.0, 1.0);
  out.uv = vec2f((x + 1.0) * 0.5, 1.0 - (y + 1.0) * 0.5);
  return out;
}

fn hash(p: vec2f) -> f32 {
  return fract(sin(dot(p, vec2f(127.1, 311.7)) + P.time) * 43758.5453);
}

@fragment
fn present(in: VSOut) -> @location(0) vec4f {
  let dye = textureSampleLevel(dyeIn, samp, in.uv, 0.0).rgb;
  // Deep-stage base, matching the Adlib cinematic palette.
  let base = mix(vec3f(0.024, 0.045, 0.10), vec3f(0.075, 0.13, 0.24), in.uv.y * 0.7 + in.uv.x * 0.15);
  var color = base + dye * vec3f(1.55, 1.6, 1.7);
  // Soft bloom on hot dye, gentle vignette, a breath of grain.
  color = color + dye * dye * 0.6;
  let centered = in.uv - vec2f(0.5, 0.42);
  color = color * (1.0 - dot(centered, centered) * 0.55);
  color = color + (hash(in.uv * 913.0) - 0.5) * 0.012;
  return vec4f(pow(max(color, vec3f(0.0)), vec3f(0.92)), 1.0);
}
`;

export async function createWorld(canvas: HTMLCanvasElement): Promise<WorldHandle | null> {
  try {
    if (typeof navigator === 'undefined' || !navigator.gpu) return null;
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return null;
    const device = await adapter.requestDevice();
    const context = canvas.getContext('webgpu');
    if (!context) return null;
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: 'opaque' });

    device.addEventListener('uncapturederror', (event) => {
      console.error('[adlib-world]', (event as GPUUncapturedErrorEvent).error.message);
    });
    void device.lost.then((info) => { if (info.reason !== 'destroyed') console.error('[adlib-world] device lost:', info.message); });
    const shaderModule = device.createShaderModule({ code: WGSL });
    void shaderModule.getCompilationInfo().then((info) => {
      for (const message of info.messages) {
        if (message.type === 'error') console.error(`[adlib-world] WGSL ${message.lineNum}:${message.linePos} ${message.message}`);
      }
    });
    const texture = (textureFormat: GPUTextureFormat) => device.createTexture({
      size: { width: SIM_W, height: SIM_H },
      format: textureFormat,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_DST,
    });
    const vel = [texture('rgba16float'), texture('rgba16float')];
    const dye = [texture('rgba16float'), texture('rgba16float')];
    const scalar = [texture('r32float'), texture('r32float'), texture('r32float')]; // pressure ping/pong + divergence-or-curl
    const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear', addressModeU: 'clamp-to-edge', addressModeV: 'clamp-to-edge' });

    const paramsBuffer = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const splatBuffer = device.createBuffer({ size: 16 + MAX_SPLATS * 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

    const layout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT, sampler: {} },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'float' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, storageTexture: { format: 'rgba16float' } },
        { binding: 4, visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
        { binding: 5, visibility: GPUShaderStage.COMPUTE, storageTexture: { format: 'rgba16float' } },
        { binding: 6, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        { binding: 7, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'unfilterable-float' } },
        { binding: 8, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'unfilterable-float' } },
        { binding: 9, visibility: GPUShaderStage.COMPUTE, storageTexture: { format: 'r32float' } },
      ],
    });
    const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [layout] });
    const compute = (entryPoint: string) => device.createComputePipeline({ layout: pipelineLayout, compute: { module: shaderModule, entryPoint } });
    const pipelines = {
      advectVel: compute('advectVel'),
      advectDye: compute('advectDye'),
      splat: compute('splat'),
      curl: compute('curl'),
      vorticity: compute('vorticity'),
      divergence: compute('divergence'),
      jacobi: compute('jacobi'),
      gradientSubtract: compute('gradientSubtract'),
    };
    const renderPipeline = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: { module: shaderModule, entryPoint: 'fullscreen' },
      fragment: { module: shaderModule, entryPoint: 'present', targets: [{ format }] },
      primitive: { topology: 'triangle-list' },
    });

    // One bind group per (velIn, velOut, dyeIn, dyeOut, scalarA, scalarB, scalarOut) combination used.
    const groupCache = new Map<string, GPUBindGroup>();
    const group = (vi: number, vo: number, di: number, doo: number, sa: number, sb: number, so: number) => {
      const key = `${vi}${vo}${di}${doo}${sa}${sb}${so}`;
      let cached = groupCache.get(key);
      if (cached) return cached;
      cached = device.createBindGroup({
        layout,
        entries: [
          { binding: 0, resource: { buffer: paramsBuffer } },
          { binding: 1, resource: sampler },
          { binding: 2, resource: vel[vi].createView() },
          { binding: 3, resource: vel[vo].createView() },
          { binding: 4, resource: dye[di].createView() },
          { binding: 5, resource: dye[doo].createView() },
          { binding: 6, resource: { buffer: splatBuffer } },
          { binding: 7, resource: scalar[sa].createView() },
          { binding: 8, resource: scalar[sb].createView() },
          { binding: 9, resource: scalar[so].createView() },
        ],
      });
      groupCache.set(key, cached);
      return cached;
    };

    const splats: Splat[] = [];
    let frameCount = 0;
    let busy = false;
    let destroyed = false;
    let time = 0;
    let velRead = 0;
    let dyeRead = 0;

    const resize = () => {
      const ratio = Math.min(1.5, window.devicePixelRatio || 1);
      const width = Math.max(2, Math.floor(canvas.clientWidth * ratio));
      const height = Math.max(2, Math.floor(canvas.clientHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const splatData = new ArrayBuffer(16 + MAX_SPLATS * 32);
    const splatU32 = new Uint32Array(splatData);
    const splatF32 = new Float32Array(splatData);

    const frame = () => {
      if (destroyed) return;
      if (document.visibilityState === 'hidden' || canvas.clientWidth === 0) {
        requestAnimationFrame(frame);
        return;
      }
      time += 1 / 60;
      // A thinking brain stirs the field with slow ambient currents.
      if (busy && splats.length < 4) {
        const angle = time * 1.7;
        splats.push({
          x: 0.5 + Math.cos(angle) * 0.27, y: 0.45 + Math.sin(angle * 1.3) * 0.2,
          vx: Math.cos(angle + 1.6) * 3.5, vy: Math.sin(angle + 1.6) * 3.5,
          r: TONES.cyan[0] * 0.045, g: TONES.cyan[1] * 0.045, b: TONES.cyan[2] * 0.045, radius: 0.004,
        });
      }
      device.queue.writeBuffer(paramsBuffer, 0, new Float32Array([
        1 / SIM_W, 1 / SIM_H, SIM_W / SIM_H, 1, // texel, aspect, dt
        0.988, 0.972, 6.0, time,                 // dissV, dissD, curl, time
      ]));
      const count = Math.min(MAX_SPLATS, splats.length);
      splatU32.fill(0);
      splatU32[0] = count;
      for (let index = 0; index < count; index += 1) {
        const item = splats[index];
        const offset = 4 + index * 8;
        splatF32[offset] = item.x; splatF32[offset + 1] = item.y;
        splatF32[offset + 2] = item.vx; splatF32[offset + 3] = item.vy;
        splatF32[offset + 4] = item.r; splatF32[offset + 5] = item.g; splatF32[offset + 6] = item.b;
        splatF32[offset + 7] = Math.max(0.0006, item.radius);
      }
      splats.length = 0;
      device.queue.writeBuffer(splatBuffer, 0, splatData);

      const encoder = device.createCommandEncoder();
      const dispatch = (pipeline: GPUComputePipeline, bindGroup: GPUBindGroup) => {
        const pass = encoder.beginComputePass();
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(Math.ceil(SIM_W / 8), Math.ceil(SIM_H / 8));
        pass.end();
      };
      // Scalar slots: 0/1 = pressure ping-pong, 2 = curl-then-divergence.
      // Dummy scalar bindings are chosen so no texture is ever bound as both
      // sampled and storage inside one pass (WebGPU usage-scope rule).
      // advect velocity: vel[read] -> vel[1-read]
      dispatch(pipelines.advectVel, group(velRead, 1 - velRead, dyeRead, 1 - dyeRead, 0, 0, 1));
      velRead = 1 - velRead;
      // splat: reads vel/dye, writes the other pair
      dispatch(pipelines.splat, group(velRead, 1 - velRead, dyeRead, 1 - dyeRead, 0, 0, 1));
      velRead = 1 - velRead; dyeRead = 1 - dyeRead;
      // curl -> scalar[2], vorticity reads it back into velocity
      dispatch(pipelines.curl, group(velRead, 1 - velRead, dyeRead, 1 - dyeRead, 0, 0, 2));
      dispatch(pipelines.vorticity, group(velRead, 1 - velRead, dyeRead, 1 - dyeRead, 2, 0, 1));
      velRead = 1 - velRead;
      // divergence -> scalar[2]
      dispatch(pipelines.divergence, group(velRead, 1 - velRead, dyeRead, 1 - dyeRead, 0, 0, 2));
      // pressure solve on scalar[0]/[1] against divergence scalar[2]
      let pressureRead = 0;
      for (let iteration = 0; iteration < JACOBI_ITERATIONS; iteration += 1) {
        dispatch(pipelines.jacobi, group(velRead, 1 - velRead, dyeRead, 1 - dyeRead, pressureRead, 2, 1 - pressureRead));
        pressureRead = 1 - pressureRead;
      }
      dispatch(pipelines.gradientSubtract, group(velRead, 1 - velRead, dyeRead, 1 - dyeRead, pressureRead, 2, 1 - pressureRead));
      velRead = 1 - velRead;
      // advect dye with the projected velocity
      dispatch(pipelines.advectDye, group(velRead, 1 - velRead, dyeRead, 1 - dyeRead, 0, 0, 1));
      dyeRead = 1 - dyeRead;

      const view = context.getCurrentTexture().createView();
      const render = encoder.beginRenderPass({ colorAttachments: [{ view, loadOp: 'clear', storeOp: 'store', clearValue: { r: 0.02, g: 0.04, b: 0.1, a: 1 } }] });
      render.setPipeline(renderPipeline);
      render.setBindGroup(0, group(velRead, 1 - velRead, dyeRead, 1 - dyeRead, 0, 0, 1));
      render.draw(3);
      render.end();
      device.queue.submit([encoder.finish()]);
      frameCount += 1;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);

    const push = (item: Splat) => { if (splats.length < MAX_SPLATS) splats.push(item); };
    return {
      pointer: (nx, ny, dx, dy) => {
        const speed = Math.hypot(dx, dy);
        if (speed < 0.0004) return;
        const power = Math.min(1, speed * 26);
        push({
          x: nx, y: ny, vx: dx * 160, vy: dy * 160,
          r: 0.05 + TONES.cyan[0] * 0.12 * power,
          g: 0.08 + TONES.cyan[1] * 0.12 * power,
          b: 0.11 + TONES.cyan[2] * 0.14 * power,
          radius: 0.003,
        });
      },
      pulse: (nx, ny, power, tone) => {
        const [r, g, b] = TONES[tone];
        const strength = Math.max(0.2, Math.min(1.6, power));
        push({ x: nx, y: ny, vx: 0, vy: -8 * strength, r: r * 0.5 * strength, g: g * 0.5 * strength, b: b * 0.5 * strength, radius: 0.008 * strength });
        push({ x: nx, y: ny, vx: 6 * strength, vy: 4 * strength, r: r * 0.2, g: g * 0.2, b: b * 0.2, radius: 0.02 * strength });
      },
      setBusy: (next) => { busy = next; },
      frames: () => frameCount,
      destroy: () => {
        destroyed = true;
        observer.disconnect();
        for (const t of [...vel, ...dye, ...scalar]) t.destroy();
        paramsBuffer.destroy();
        splatBuffer.destroy();
        device.destroy();
      },
    };
  } catch {
    return null; // any init failure = graceful fallback to the static skin
  }
}
