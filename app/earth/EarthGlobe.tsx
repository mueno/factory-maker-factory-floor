'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { feature } from 'topojson-client';
import countries from 'world-atlas/countries-110m.json';
import type { EarthSceneState } from './science';
import { illustrativeSeaIceForYear, REGIONS, sceneScience } from './science';

type GlobeProps = {
  scene: EarthSceneState;
  onCapability?: (ready: boolean) => void;
  ariaLabel?: string;
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
  evidence: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  ice: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  currentPoints: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  curves: THREE.CatmullRomCurve3[];
  currentTubes: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>[];
  targetQuaternion: THREE.Quaternion;
  targetDistance: number;
  frame: number;
  observer: ResizeObserver;
  destroy: () => void;
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

function makeEarthTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const ocean = ctx.createLinearGradient(0, 0, 0, canvas.height);
  ocean.addColorStop(0, '#071a35');
  ocean.addColorStop(0.5, '#062846');
  ocean.addColorStop(1, '#071a35');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const atlas = feature(
    countries as unknown as Parameters<typeof feature>[0],
    (countries as unknown as { objects: { countries: Parameters<typeof feature>[1] } }).objects.countries,
  ) as GeoJSON.FeatureCollection;

  const point = ([lon, lat]: number[]) => [
    ((lon + 180) / 360) * canvas.width,
    ((90 - lat) / 180) * canvas.height,
  ];
  const drawRing = (ring: number[][]) => {
    ring.forEach((coordinate, index) => {
      const [x, y] = point(coordinate);
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
  };

  ctx.fillStyle = '#153f4b';
  ctx.strokeStyle = 'rgba(101, 230, 225, .48)';
  ctx.lineWidth = 1.1;
  for (const item of atlas.features) {
    const geometry = item.geometry;
    if (!geometry || (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')) continue;
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    ctx.beginPath();
    for (const polygon of polygons) for (const ring of polygon) drawRing(ring as number[][]);
    ctx.fill('evenodd');
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
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
  float texture = 0.84 + 0.16 * sin(vPositionLocal.x * 41.0) * sin(vPositionLocal.z * 37.0);
  gl_FragColor = vec4(vec3(0.72, 0.94, 1.0) * texture, edge * uOpacity);
}`;

function currentCurves() {
  const paths = [
    [[7, -42], [18, -55], [30, -70], [40, -62], [49, -42], [57, -22], [64, 4]],
    [[-5, -25], [-18, -10], [-35, 15], [-48, 35], [-42, 70], [-20, 92], [3, 112]],
    [[12, 132], [26, 138], [36, 145], [43, 158], [39, 178], [32, -164]],
  ];
  return paths.map((path) => new THREE.CatmullRomCurve3(path.map(([lat, lon]) => latLon(lat, lon, 1.035)), true, 'catmullrom', 0.35));
}

function createRuntime(canvas: HTMLCanvasElement): GlobeRuntime {
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
  const texture = makeEarthTexture();
  const globeMaterial = new THREE.MeshStandardMaterial({
    map: texture ?? undefined,
    color: texture ? 0xffffff : 0x123c54,
    roughness: 0.72,
    metalness: 0.04,
    emissive: new THREE.Color(0x061326),
    emissiveIntensity: 0.48,
  });
  const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), globeMaterial);
  earth.add(globe);

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
    new THREE.SphereGeometry(1.065, 96, 64),
    new THREE.MeshBasicMaterial({ color: 0x50d9ff, side: THREE.BackSide, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending }),
  );
  earth.add(atmosphere);

  const curves = currentCurves();
  const currentTubes: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>[] = [];
  for (const curve of curves) {
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 140, 0.006, 6, true),
      new THREE.MeshBasicMaterial({ color: 0x5af3eb, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending }),
    );
    currentTubes.push(tube);
    earth.add(tube);
  }
  const currentGeometry = new THREE.BufferGeometry();
  currentGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(150 * 3), 3));
  const currentPoints = new THREE.Points(currentGeometry, new THREE.PointsMaterial({ color: 0xffda7a, size: 0.035, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending }));
  earth.add(currentPoints);

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
    renderer, camera, earth, globe, evidence, ice, currentPoints, curves, currentTubes,
    targetQuaternion, targetDistance: 4.8, frame: 0, observer,
    destroy: () => {},
  };
  let raf = 0;
  let last = performance.now();
  const animate = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    runtime.earth.quaternion.slerp(runtime.targetQuaternion, 1 - Math.pow(0.0004, dt));
    runtime.camera.position.z += (runtime.targetDistance - runtime.camera.position.z) * (1 - Math.pow(0.002, dt));
    runtime.evidence.material.uniforms.uTime.value = now / 1000;
    const positions = runtime.currentPoints.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i += 1) {
      const curve = runtime.curves[i % runtime.curves.length];
      const progress = (i / positions.count * runtime.curves.length + now / 9500) % 1;
      const pointOnCurve = curve.getPointAt(progress);
      positions.setXYZ(i, pointOnCurve.x, pointOnCurve.y, pointOnCurve.z);
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
    texture?.dispose();
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
  runtime.currentPoints.visible = scene.layer === 'currents' || scene.layer === 'coupled';
  runtime.currentTubes.forEach((tube) => { tube.visible = scene.layer === 'currents' || scene.layer === 'coupled'; });
  const extent = illustrativeSeaIceForYear(scene.year).extent;
  const capDegrees = 7 + Math.sqrt(Math.max(0.2, extent) / 7.05) * 20;
  runtime.ice.material.uniforms.uThreshold.value = Math.sin(THREE.MathUtils.degToRad(90 - capDegrees));
  runtime.ice.visible = scene.layer === 'sea_ice' || scene.layer === 'coupled';
  runtime.globe.material.roughness = scene.style === 'cinematic' ? 0.58 : 0.8;
  runtime.renderer.toneMappingExposure = scene.style === 'storybook' ? 1.3 : scene.style === 'scientific' ? 0.92 : 1.1;
}

const MIN_DISTANCE = 2.35;
const MAX_DISTANCE = 7.4;

function clampDistance(distance: number) {
  return THREE.MathUtils.clamp(distance, MIN_DISTANCE, MAX_DISTANCE);
}

export const EarthGlobe = forwardRef<EarthGlobeHandle, GlobeProps>(function EarthGlobe(
  { scene, onCapability, ariaLabel = 'Interactive three-dimensional Earth visualization' },
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

  return <canvas ref={canvasRef} className="terra-globe" aria-label={ariaLabel} role="img" tabIndex={0} />;
});
