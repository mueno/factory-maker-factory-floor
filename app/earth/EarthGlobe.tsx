'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import type { EarthSceneState } from './science';
import { illustrativeSeaIceForYear, REGIONS, sceneScience } from './science';

type GlobeProps = {
  scene: EarthSceneState;
  onCapability?: (ready: boolean) => void;
};

export type EarthGlobeHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
};

type GlobeRuntime = {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  earth: THREE.Group;
  globe: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  nightShade: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  nightLights: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  clouds: THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhongMaterial>;
  evidence: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  ice: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  currentStreaks: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  currentParticles: CurrentParticle[];
  curves: THREE.CatmullRomCurve3[];
  currentSpeedFactor: number;
  targetQuaternion: THREE.Quaternion;
  targetDistance: number;
  frame: number;
  observer: ResizeObserver;
  destroy: () => void;
};

type CurrentPath = {
  points: number[][];
  scenarioSensitive?: boolean;
};

type CurrentParticle = {
  curveIndex: number;
  progress: number;
  speed: number;
  trail: number;
  scenarioSensitive: boolean;
};

function latLon(lat: number, lon: number, radius = 1) {
  const phi = THREE.MathUtils.degToRad(lat);
  const theta = THREE.MathUtils.degToRad(lon);
  // SphereGeometry maps increasing texture U eastward onto negative Z.
  // Keep geographic longitude aligned with the equirectangular texture
  // mapping x = (lon + 180) / 360 used by makeEarthTexture().
  return new THREE.Vector3(
    radius * Math.cos(phi) * Math.cos(theta),
    radius * Math.sin(phi),
    -radius * Math.cos(phi) * Math.sin(theta),
  );
}

function loadColorTexture(path: string, anisotropy: number) {
  const texture = new THREE.TextureLoader().load(path);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

const EVIDENCE_VERTEX = `
varying vec3 vNormalLocal;
varying vec3 vPositionLocal;
void main() {
  vNormalLocal = normal;
  vPositionLocal = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const EVIDENCE_FRAGMENT = `
uniform float uMode;
uniform float uWarming;
uniform float uTime;
uniform float uStorybook;
varying vec3 vNormalLocal;
varying vec3 vPositionLocal;
void main() {
  float latitude = abs(normalize(vPositionLocal).y);
  float longitudeWave = sin(atan(vPositionLocal.z, vPositionLocal.x) * 5.0 + uTime * 0.08) * 0.5 + 0.5;
  vec3 cold = vec3(0.05, 0.65, 0.96);
  vec3 warm = vec3(1.0, 0.25, 0.08);
  float anomaly = clamp((uWarming - 1.0) / 4.8 + latitude * 0.42 + longitudeWave * 0.10, 0.0, 1.0);
  vec3 thermal = mix(cold, warm, anomaly);
  vec3 sea = mix(vec3(0.0, 0.72, 0.9), vec3(0.08, 0.2, 0.5), latitude);
  vec3 level = mix(vec3(0.0, 0.78, 0.84), vec3(0.98, 0.72, 0.22), latitude * 0.6);
  vec3 color = uMode < 1.5 ? thermal : (uMode < 2.5 ? sea : (uMode < 3.5 ? level : mix(thermal, sea, 0.45)));
  float fresnel = pow(1.0 - max(dot(normalize(vNormalLocal), vec3(0.0, 0.0, 1.0)), 0.0), 2.0);
  float alpha = (0.20 + fresnel * 0.16) * mix(1.0, 1.35, uStorybook);
  gl_FragColor = vec4(color, alpha);
}`;

const ICE_FRAGMENT = `
uniform float uThreshold;
uniform float uOpacity;
varying vec3 vPositionLocal;
void main() {
  float edge = smoothstep(uThreshold - 0.035, uThreshold + 0.018, normalize(vPositionLocal).y);
  if (edge < 0.02) discard;
  float texture = 0.96 + 0.04 * sin(vPositionLocal.x * 41.0) * sin(vPositionLocal.z * 37.0);
  gl_FragColor = vec4(vec3(0.72, 0.94, 1.0) * texture, edge * uOpacity);
}`;

const NIGHT_VERTEX = `
varying vec2 vUv;
varying vec3 vViewNormal;
void main() {
  vUv = uv;
  vViewNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const NIGHT_FRAGMENT = `
uniform sampler2D uNightMap;
uniform vec3 uLightDirection;
uniform float uIntensity;
varying vec2 vUv;
varying vec3 vViewNormal;
void main() {
  vec3 source = texture2D(uNightMap, vUv).rgb;
  float luminance = max(source.r, max(source.g, source.b));
  float nightSide = 1.0 - smoothstep(-0.14, 0.24, dot(normalize(vViewNormal), normalize(uLightDirection)));
  float alpha = nightSide * smoothstep(0.025, 0.24, luminance) * uIntensity;
  gl_FragColor = vec4(source * 3.1, alpha);
}`;

const NIGHT_SHADE_FRAGMENT = `
uniform vec3 uLightDirection;
varying vec3 vViewNormal;
void main() {
  float nightSide = 1.0 - smoothstep(-0.18, 0.26, dot(normalize(vViewNormal), normalize(uLightDirection)));
  gl_FragColor = vec4(0.004, 0.012, 0.028, nightSide * 0.90);
}`;

const ATMOSPHERE_VERTEX = `
varying vec3 vViewNormal;
void main() {
  vViewNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const ATMOSPHERE_FRAGMENT = `
uniform float uStrength;
varying vec3 vViewNormal;
void main() {
  float rim = pow(1.0 - abs(vViewNormal.z), 3.2);
  gl_FragColor = vec4(0.20, 0.74, 1.0, rim * uStrength);
}`;

function currentPaths(): CurrentPath[] {
  // Qualitative paths used to explain circulation on the globe. These are not
  // OSCAR velocity samples and the interface labels them as a conceptual view.
  return [
    { scenarioSensitive: true, points: [[10, -78], [23, -76], [34, -70], [42, -57], [49, -40], [56, -24], [62, -8]] },
    { scenarioSensitive: true, points: [[62, -8], [64, 2], [61, 13], [57, 24], [52, 33]] },
    { scenarioSensitive: true, points: [[58, -45], [51, -50], [43, -53], [34, -55], [25, -48]] },
    { points: [[18, 121], [24, 126], [31, 132], [35, 140], [40, 147], [44, 158], [42, 174]] },
    { points: [[42, 174], [43, -170], [45, -150], [46, -132], [45, -118]] },
    { points: [[55, 165], [49, 157], [43, 150], [39, 145], [35, 141]] },
    { points: [[-12, -38], [-22, -43], [-32, -48], [-42, -53], [-49, -48]] },
    { points: [[-38, 18], [-30, 12], [-20, 5], [-10, -2], [2, -6]] },
    { points: [[-33, 31], [-39, 42], [-43, 58], [-38, 72], [-31, 84]] },
    { points: [[-54, -176], [-55, -126], [-53, -76], [-51, -24], [-52, 30], [-54, 82], [-55, 132], [-54, 176]] },
    { points: [[9, -12], [8, -38], [7, -66], [8, -96], [7, -128], [6, -158]] },
    { points: [[-8, 154], [-7, 122], [-7, 91], [-6, 58], [-6, 25], [-7, -8]] },
  ];
}

function createRuntime(canvas: HTMLCanvasElement): GlobeRuntime {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const root = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.z = 4.8;
  root.add(new THREE.HemisphereLight(0x8feeff, 0x02050d, 1.45));
  const sun = new THREE.DirectionalLight(0xffe4b0, 3.2);
  sun.position.set(-3, 2, 5);
  root.add(sun);

  const starsGeometry = new THREE.BufferGeometry();
  const stars = new Float32Array(1200 * 3);
  for (let i = 0; i < 1200; i += 1) {
    const radius = 12 + Math.random() * 18;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    stars[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    stars[i * 3 + 1] = radius * Math.cos(phi);
    stars[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }
  starsGeometry.setAttribute('position', new THREE.BufferAttribute(stars, 3));
  root.add(new THREE.Points(starsGeometry, new THREE.PointsMaterial({ color: 0xaedfff, size: 0.025, transparent: true, opacity: 0.7 })));

  const earth = new THREE.Group();
  root.add(earth);
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const dayTexture = loadColorTexture('/earth/blue-marble-2048.png', anisotropy);
  const nightTexture = loadColorTexture('/earth/black-marble-2016-3600.jpg', anisotropy);
  const cloudTexture = loadColorTexture('/earth/clouds-2048.jpg', anisotropy);
  const roughnessTexture = new THREE.TextureLoader().load('/earth/blue-marble-land-roughness-2048.png');
  const bumpTexture = new THREE.TextureLoader().load('/earth/blue-marble-shaded-bump-2048.jpg');
  roughnessTexture.anisotropy = anisotropy;
  bumpTexture.anisotropy = anisotropy;
  const globeMaterial = new THREE.MeshStandardMaterial({
    map: dayTexture,
    roughnessMap: roughnessTexture,
    bumpMap: bumpTexture,
    bumpScale: 0.018,
    color: 0xffffff,
    roughness: 0.76,
    metalness: 0.025,
  });
  const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), globeMaterial);
  earth.add(globe);

  // Fixed presentation lighting: intentionally reveals the terminator and is
  // disclosed in the interface as unrelated to the current solar position.
  const presentationLight = new THREE.Vector3(0.72, 0.18, 0.18).normalize();
  const nightShade = new THREE.Mesh(
    new THREE.SphereGeometry(1.0015, 128, 96),
    new THREE.ShaderMaterial({
      vertexShader: NIGHT_VERTEX,
      fragmentShader: NIGHT_SHADE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      uniforms: { uLightDirection: { value: presentationLight } },
    }),
  );
  earth.add(nightShade);

  const nightLights = new THREE.Mesh(
    new THREE.SphereGeometry(1.003, 128, 96),
    new THREE.ShaderMaterial({
      vertexShader: NIGHT_VERTEX,
      fragmentShader: NIGHT_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uNightMap: { value: nightTexture },
        uLightDirection: { value: presentationLight },
        uIntensity: { value: 1.7 },
      },
    }),
  );
  earth.add(nightLights);

  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(1.005, 128, 96),
    new THREE.MeshPhongMaterial({
      map: cloudTexture,
      alphaMap: cloudTexture,
      color: 0xeaf7ff,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      blending: THREE.NormalBlending,
    }),
  );
  earth.add(clouds);

  const evidence = new THREE.Mesh(
    new THREE.SphereGeometry(1.012, 128, 96),
    new THREE.ShaderMaterial({
      vertexShader: EVIDENCE_VERTEX,
      fragmentShader: EVIDENCE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      uniforms: { uMode: { value: 4 }, uWarming: { value: 2 }, uTime: { value: 0 }, uStorybook: { value: 0 } },
    }),
  );
  earth.add(evidence);

  const ice = new THREE.Mesh(
    new THREE.SphereGeometry(1.024, 96, 64),
    new THREE.ShaderMaterial({
      vertexShader: EVIDENCE_VERTEX,
      fragmentShader: ICE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      uniforms: { uThreshold: { value: 0.84 }, uOpacity: { value: 0.86 } },
    }),
  );
  earth.add(ice);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.055, 96, 64),
    new THREE.ShaderMaterial({
      vertexShader: ATMOSPHERE_VERTEX,
      fragmentShader: ATMOSPHERE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      uniforms: { uStrength: { value: 0.52 } },
    }),
  );
  earth.add(atmosphere);
  const highAtmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.095, 96, 64),
    new THREE.ShaderMaterial({
      vertexShader: ATMOSPHERE_VERTEX,
      fragmentShader: ATMOSPHERE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      uniforms: { uStrength: { value: 0.18 } },
    }),
  );
  earth.add(highAtmosphere);

  const paths = currentPaths();
  const curves = paths.map((path) => new THREE.CatmullRomCurve3(
    path.points.map(([lat, lon]) => latLon(lat, lon, 1.023)),
    false,
    'catmullrom',
    0.28,
  ));
  const particleCount = 1680;
  const currentGeometry = new THREE.BufferGeometry();
  currentGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(particleCount * 2 * 3), 3));
  const currentColors = new Float32Array(particleCount * 2 * 3);
  const currentParticles: CurrentParticle[] = [];
  const cyan = new THREE.Color(0x61f7f0);
  const gold = new THREE.Color(0xffd47a);
  for (let i = 0; i < particleCount; i += 1) {
    const curveIndex = i % curves.length;
    const progress = ((i * 0.61803398875) + (curveIndex / curves.length)) % 1;
    const speed = 0.022 + ((i * 37) % 31) / 1500;
    const trail = 0.006 + ((i * 19) % 17) / 2100;
    currentParticles.push({
      curveIndex,
      progress,
      speed,
      trail,
      scenarioSensitive: Boolean(paths[curveIndex].scenarioSensitive),
    });
    const mix = ((i * 23) % 100) / 100;
    const head = cyan.clone().lerp(gold, mix);
    const tail = head.clone().multiplyScalar(0.16);
    currentColors.set([tail.r, tail.g, tail.b, head.r, head.g, head.b], i * 6);
  }
  currentGeometry.setAttribute('color', new THREE.BufferAttribute(currentColors, 3));
  const currentStreaks = new THREE.LineSegments(
    currentGeometry,
    new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  earth.add(currentStreaks);

  const targetQuaternion = new THREE.Quaternion();
  const observer = new ResizeObserver(() => {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
  observer.observe(canvas);

  const runtime: GlobeRuntime = {
    renderer, camera, earth, globe, nightShade, nightLights, clouds, evidence, ice,
    currentStreaks, currentParticles, curves, currentSpeedFactor: 1,
    targetQuaternion, targetDistance: 4.8, frame: 0, observer,
    destroy: () => {},
  };
  let raf = 0;
  let last = performance.now();
  const animate = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (reducedMotion) {
      runtime.earth.quaternion.copy(runtime.targetQuaternion);
      runtime.camera.position.z = runtime.targetDistance;
    } else {
      runtime.earth.quaternion.slerp(runtime.targetQuaternion, 1 - Math.pow(0.0004, dt));
      runtime.camera.position.z += (runtime.targetDistance - runtime.camera.position.z) * (1 - Math.pow(0.002, dt));
    }
    runtime.evidence.material.uniforms.uTime.value = reducedMotion ? 0 : now / 1000;
    if (!reducedMotion) runtime.clouds.rotation.y += dt * 0.012;
    const positions = runtime.currentStreaks.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < runtime.currentParticles.length; i += 1) {
      const particle = runtime.currentParticles[i];
      if (!reducedMotion) {
        const factor = particle.scenarioSensitive ? runtime.currentSpeedFactor : 1;
        const nextProgress = particle.progress + dt * particle.speed * factor;
        particle.progress = Number.isFinite(nextProgress) ? ((nextProgress % 1) + 1) % 1 : 0;
      }
      const curve = runtime.curves[particle.curveIndex];
      const headProgress = Math.min(0.999999, particle.progress);
      const tailProgress = Math.max(0, headProgress - particle.trail);
      const tail = curve.getPoint(tailProgress);
      const head = curve.getPoint(headProgress);
      positions.setXYZ(i * 2, tail.x, tail.y, tail.z);
      positions.setXYZ(i * 2 + 1, head.x, head.y, head.z);
    }
    positions.needsUpdate = true;
    renderer.render(root, camera);
    runtime.frame += 1;
    raf = requestAnimationFrame(animate);
  };
  raf = requestAnimationFrame(animate);
  runtime.destroy = () => {
    cancelAnimationFrame(raf);
    observer.disconnect();
    root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
      materials.forEach((material) => material.dispose());
    });
    dayTexture.dispose();
    nightTexture.dispose();
    cloudTexture.dispose();
    roughnessTexture.dispose();
    bumpTexture.dispose();
    renderer.dispose();
  };
  return runtime;
}

function applyScene(runtime: GlobeRuntime, scene: EarthSceneState) {
  const region = REGIONS[scene.region];
  const center = latLon(region.lat, region.lon).normalize();
  runtime.targetQuaternion.copy(new THREE.Quaternion().setFromUnitVectors(center, new THREE.Vector3(0, 0, 1)));
  runtime.targetDistance = region.distance;
  const science = sceneScience(scene);
  const modes = { temperature: 1, sea_ice: 2, currents: 2, sea_level: 3, coupled: 4 };
  runtime.evidence.material.uniforms.uMode.value = modes[scene.layer];
  runtime.evidence.material.uniforms.uWarming.value = science.temperature.best;
  runtime.evidence.material.uniforms.uStorybook.value = scene.style === 'storybook' ? 1 : 0;
  runtime.evidence.visible = scene.layer !== 'currents' || scene.style !== 'scientific';
  runtime.currentStreaks.visible = scene.layer === 'currents' || scene.layer === 'coupled';
  runtime.currentSpeedFactor = Math.max(0.42, 1 - science.amocDecline.best / 100);
  const extent = illustrativeSeaIceForYear(scene.year).extent;
  const capDegrees = 7 + Math.sqrt(Math.max(0.2, extent) / 7.05) * 20;
  runtime.ice.material.uniforms.uThreshold.value = Math.sin(THREE.MathUtils.degToRad(90 - capDegrees));
  runtime.ice.visible = scene.layer === 'sea_ice' || scene.layer === 'coupled';
  runtime.globe.material.roughness = scene.style === 'cinematic' ? 0.58 : 0.8;
  runtime.clouds.material.opacity = scene.style === 'scientific' ? 0.17 : scene.style === 'storybook' ? 0.34 : 0.27;
  runtime.nightLights.material.uniforms.uIntensity.value = scene.style === 'scientific' ? 0.9 : 1.25;
  runtime.currentStreaks.material.opacity = scene.style === 'scientific' ? 0.68 : 0.86;
  runtime.renderer.toneMappingExposure = scene.style === 'storybook' ? 1.3 : scene.style === 'scientific' ? 0.92 : 1.1;
}

const MIN_DISTANCE = 2.35;
const MAX_DISTANCE = 7.4;

function clampDistance(distance: number) {
  return THREE.MathUtils.clamp(distance, MIN_DISTANCE, MAX_DISTANCE);
}

export const EarthGlobe = forwardRef<EarthGlobeHandle, GlobeProps>(function EarthGlobe(
  { scene, onCapability },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<GlobeRuntime | null>(null);
  const initialSceneRef = useRef(scene);
  const latestSceneRef = useRef(scene);

  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      const runtime = runtimeRef.current;
      if (runtime) runtime.targetDistance = clampDistance(runtime.targetDistance - 0.65);
    },
    zoomOut: () => {
      const runtime = runtimeRef.current;
      if (runtime) runtime.targetDistance = clampDistance(runtime.targetDistance + 0.65);
    },
    resetView: () => {
      const runtime = runtimeRef.current;
      if (runtime) applyScene(runtime, latestSceneRef.current);
    },
  }), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const runtime = createRuntime(canvas);
      runtimeRef.current = runtime;
      applyScene(runtime, initialSceneRef.current);

      const points = new Map<number, { x: number; y: number }>();
      const startQuaternion = new THREE.Quaternion();
      let dragOrigin = { x: 0, y: 0 };
      let pinchOrigin = 0;
      let pinchDistance = runtime.targetDistance;

      const beginSinglePointer = (point: { x: number; y: number }) => {
        dragOrigin = point;
        startQuaternion.copy(runtime.targetQuaternion);
      };
      const distanceBetweenPointers = () => {
        const [first, second] = Array.from(points.values());
        return first && second ? Math.hypot(second.x - first.x, second.y - first.y) : 0;
      };
      const onPointerDown = (event: PointerEvent) => {
        try { canvas.setPointerCapture(event.pointerId); } catch { /* Synthetic and older pointer implementations may not support capture. */ }
        points.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (points.size === 1) beginSinglePointer({ x: event.clientX, y: event.clientY });
        if (points.size === 2) {
          pinchOrigin = distanceBetweenPointers();
          pinchDistance = runtime.targetDistance;
        }
        canvas.classList.add('is-grabbing');
      };
      const onPointerMove = (event: PointerEvent) => {
        if (!points.has(event.pointerId)) return;
        points.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (points.size >= 2) {
          const nextPinch = distanceBetweenPointers();
          if (pinchOrigin > 0) runtime.targetDistance = clampDistance(pinchDistance * (pinchOrigin / nextPinch));
          return;
        }
        const deltaX = event.clientX - dragOrigin.x;
        const deltaY = event.clientY - dragOrigin.y;
        const yaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), deltaX * 0.006);
        const pitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), deltaY * 0.006);
        runtime.targetQuaternion.copy(yaw.multiply(pitch).multiply(startQuaternion)).normalize();
      };
      const finishPointer = (event: PointerEvent) => {
        points.delete(event.pointerId);
        if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
        if (points.size === 1) beginSinglePointer(Array.from(points.values())[0]);
        if (points.size === 0) canvas.classList.remove('is-grabbing');
      };
      const onWheel = (event: WheelEvent) => {
        event.preventDefault();
        runtime.targetDistance = clampDistance(runtime.targetDistance + event.deltaY * 0.004);
      };
      const onKeyDown = (event: KeyboardEvent) => {
        const rotate = (axis: THREE.Vector3, radians: number) => {
          runtime.targetQuaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(axis, radians)).normalize();
        };
        if (event.key === 'ArrowLeft') rotate(new THREE.Vector3(0, 1, 0), -0.12);
        else if (event.key === 'ArrowRight') rotate(new THREE.Vector3(0, 1, 0), 0.12);
        else if (event.key === 'ArrowUp') rotate(new THREE.Vector3(1, 0, 0), -0.12);
        else if (event.key === 'ArrowDown') rotate(new THREE.Vector3(1, 0, 0), 0.12);
        else if (event.key === '+' || event.key === '=') runtime.targetDistance = clampDistance(runtime.targetDistance - 0.55);
        else if (event.key === '-' || event.key === '_') runtime.targetDistance = clampDistance(runtime.targetDistance + 0.55);
        else if (event.key === '0' || event.key === 'Home') applyScene(runtime, latestSceneRef.current);
        else return;
        event.preventDefault();
      };

      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerup', finishPointer);
      canvas.addEventListener('pointercancel', finishPointer);
      canvas.addEventListener('wheel', onWheel, { passive: false });
      canvas.addEventListener('keydown', onKeyDown);
      onCapability?.(true);
      return () => {
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', finishPointer);
        canvas.removeEventListener('pointercancel', finishPointer);
        canvas.removeEventListener('wheel', onWheel);
        canvas.removeEventListener('keydown', onKeyDown);
        runtime.destroy();
        runtimeRef.current = null;
      };
    } catch (error) {
      console.error('[terra-globe]', error);
      onCapability?.(false);
    }
  }, [onCapability]);

  useEffect(() => {
    latestSceneRef.current = scene;
    if (runtimeRef.current) applyScene(runtimeRef.current, scene);
  }, [scene]);

  return <canvas ref={canvasRef} className="terra-globe" aria-label="Three-dimensional Earth visualization" role="img" tabIndex={0} />;
});
