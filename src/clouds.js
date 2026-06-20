// Nebula cloud and spiral galaxy — both built from additive point clouds
// driven by the shared cloud shader.
import * as THREE from 'three';
import { cloudVert, cloudFrag } from './shaders.js';

function mulberry32(seed){
  return function(){
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cloudMaterial(pixelRatio, size, spin, drift){
  return new THREE.ShaderMaterial({
    vertexShader: cloudVert,
    fragmentShader: cloudFrag,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: size },
      uPixelRatio: { value: pixelRatio },
      uSpin: { value: spin },
      uDrift: { value: drift },
      uOpacity: { value: 0 },
    },
  });
}

// A clumpy, drifting nebula the camera flies through mid-journey.
export function createNebula(pixelRatio){
  const COUNT = 7000;
  const rand = mulberry32(99);
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const scales = new Float32Array(COUNT);
  const seeds = new Float32Array(COUNT);

  // Three colour anchors blended by depth/noise for a magenta→violet→cyan cloud.
  const c1 = new THREE.Color(0xff4d8d); // magenta
  const c2 = new THREE.Color(0x7a4dff); // violet
  const c3 = new THREE.Color(0x33d0ff); // cyan
  const tmp = new THREE.Color();
  // Offset from the camera's straight z-path so the bright dense core passes
  // to the side — you fly past the heart of the cloud rather than into it.
  const center = new THREE.Vector3(11, 4, -46);

  for (let i = 0; i < COUNT; i++){
    // clump via biased gaussian-ish radius
    const r = Math.pow(rand(), 0.5) * 34;
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);
    const flat = 0.55; // squash along z to feel like a sheet of gas
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi) * flat;
    positions[i * 3]     = center.x + x;
    positions[i * 3 + 1] = center.y + y;
    positions[i * 3 + 2] = center.z + z;

    const t = rand();
    if (t < 0.5) tmp.copy(c1).lerp(c2, t * 2.0);
    else tmp.copy(c2).lerp(c3, (t - 0.5) * 2.0);
    const bright = 0.4 + rand() * 0.6;
    colors[i * 3]     = tmp.r * bright;
    colors[i * 3 + 1] = tmp.g * bright;
    colors[i * 3 + 2] = tmp.b * bright;

    scales[i] = 1.2 + rand() * rand() * 4.5;
    seeds[i] = rand();
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  return new THREE.Points(geo, cloudMaterial(pixelRatio, 2.4, 0.0, 0.6));
}

// A face-leaning logarithmic-spiral galaxy: the destination.
export function createGalaxy(pixelRatio){
  const COUNT = 20000;
  const ARMS = 4;
  const rand = mulberry32(424242);
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const scales = new Float32Array(COUNT);
  const seeds = new Float32Array(COUNT);

  const core = new THREE.Color(0xfff0c4); // warm core
  const mid = new THREE.Color(0xff8a5c);  // amber
  const edge = new THREE.Color(0x5aa9ff); // blue arms
  const tmp = new THREE.Color();
  // Geometry is built around the local origin so that both the shader spin and
  // the object tilt rotate about the galaxy's centre; placement is done via
  // points.position below.
  const RADIUS = 62;

  for (let i = 0; i < COUNT; i++){
    const t = Math.pow(rand(), 0.7);     // radial position, denser core
    const radius = t * RADIUS;
    const arm = Math.floor(rand() * ARMS);
    const armAngle = (arm / ARMS) * Math.PI * 2;
    const spin = radius * 0.09;           // logarithmic-ish winding
    const scatter = (Math.pow(rand(), 2) - 0.5) * (0.6 + t * 0.9);
    const angle = armAngle + spin + scatter;

    const thickness = (1 - t) * 7 + 1;
    const y = (rand() - 0.5) * 2 * thickness * (0.25 + (1 - t) * 0.5);

    positions[i * 3]     = Math.cos(angle) * radius;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(angle) * radius;

    if (t < 0.35) tmp.copy(core).lerp(mid, t / 0.35);
    else tmp.copy(mid).lerp(edge, (t - 0.35) / 0.65);
    const bright = 0.32 + (1 - t) * 0.38 + rand() * 0.22;
    colors[i * 3]     = tmp.r * bright;
    colors[i * 3 + 1] = tmp.g * bright;
    colors[i * 3 + 2] = tmp.b * bright;

    scales[i] = 0.6 + rand() * 2.0 + (1 - t) * 0.7;
    seeds[i] = rand();
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  const points = new THREE.Points(geo, cloudMaterial(pixelRatio, 2.2, 0.05, 0.0));
  // Place the galaxy far down the corridor and tilt it for a dramatic 3/4 view.
  points.position.set(0, 6, -240);
  points.rotation.x = -0.5;
  points.rotation.z = 0.15;
  return points;
}
