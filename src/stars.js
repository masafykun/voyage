// Background starfield (dots) + the warp streak layer.
import * as THREE from 'three';
import { starVert, starFrag, warpVert, warpFrag } from './shaders.js';

// Deterministic pseudo-random so the scene is identical on every load.
function mulberry32(seed){
  return function(){
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createStars(pixelRatio){
  const COUNT = 6000;
  const rand = mulberry32(1337);
  const positions = new Float32Array(COUNT * 3);
  const scales = new Float32Array(COUNT);
  const twinkle = new Float32Array(COUNT);

  // Far shell centred on the travel mid-point so stars wrap the whole journey.
  const center = new THREE.Vector3(0, 0, -60);
  for (let i = 0; i < COUNT; i++){
    const r = 150 + rand() * 230;
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);
    positions[i * 3]     = center.x + r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = center.y + r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = center.z + r * Math.cos(phi);
    scales[i] = 0.4 + rand() * rand() * 2.2;
    twinkle[i] = rand();
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
  geo.setAttribute('aTwinkle', new THREE.BufferAttribute(twinkle, 1));

  const mat = new THREE.ShaderMaterial({
    vertexShader: starVert,
    fragmentShader: starFrag,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: 2.2 },
      uPixelRatio: { value: pixelRatio },
      uColor: { value: new THREE.Color(0xbfd2ff) },
      uOpacity: { value: 1 },
    },
  });

  return new THREE.Points(geo, mat);
}

// Warp streaks live in a tube around the z-axis so the camera always has
// streaks nearby as it travels. Each "star" is one short LineSegment whose
// tail is pushed back in +z by the warp uniform.
export function createWarp(){
  const COUNT = 4200;
  const rand = mulberry32(7);
  const positions = new Float32Array(COUNT * 2 * 3); // 2 verts per segment
  const stretch = new Float32Array(COUNT * 2);

  for (let i = 0; i < COUNT; i++){
    const radius = 2 + Math.pow(rand(), 0.6) * 34;
    const angle = rand() * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const z = 20 - rand() * 160; // spread across the whole travel corridor
    const o = i * 6;
    positions[o]     = x; positions[o + 1] = y; positions[o + 2] = z; // head
    positions[o + 3] = x; positions[o + 4] = y; positions[o + 5] = z; // tail
    stretch[i * 2] = 0;
    stretch[i * 2 + 1] = 1;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aStretch', new THREE.BufferAttribute(stretch, 1));

  const mat = new THREE.ShaderMaterial({
    vertexShader: warpVert,
    fragmentShader: warpFrag,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uWarp: { value: 0 },
      uStreak: { value: 14 },
      uColor: { value: new THREE.Color(0x9fc4ff) },
    },
  });

  return new THREE.LineSegments(geo, mat);
}
