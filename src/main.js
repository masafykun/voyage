// VOYAGE — a scroll-driven cinematic voyage from the atmosphere to a galaxy.
// Scroll position maps to a normalised progress p (0..1) that drives the
// camera along a track and cross-fades five scenes.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import Lenis from 'lenis';

import { createStars, createWarp } from './stars.js';
import { createNebula, createGalaxy } from './clouds.js';
import { createPlanet } from './planet.js';
import './style.css';

// ---------- small math helpers ----------
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;

// Piecewise-linear track: stops = [[p, value], ...] sorted by p.
function track(p, stops){
  if (p <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++){
    if (p <= stops[i][0]){
      const [p0, v0] = stops[i - 1];
      const [p1, v1] = stops[i];
      return lerp(v0, v1, (p - p0) / (p1 - p0));
    }
  }
  return stops[stops.length - 1][1];
}

// ---------- renderer / scene / camera ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x02030a, 1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 600);
camera.position.set(0, 0, 16);

// ---------- build the world ----------
const stars = createStars(pixelRatio);
const warp = createWarp();
const nebula = createNebula(pixelRatio);
const galaxy = createGalaxy(pixelRatio);
const planet = createPlanet();
scene.add(stars, warp, nebula, galaxy, planet);

// ---------- post-processing ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.5,   // strength (driven each frame)
  0.7,   // radius
  0.55,  // threshold
);
composer.addPass(bloom);

// ---------- colour grading per chapter ----------
const COL_START = new THREE.Color(0x02030a);
const COL_NEBULA = new THREE.Color(0x0b0418);
const COL_WARP = new THREE.Color(0x01010a);
const COL_GALAXY = new THREE.Color(0x05060f);
const clearCol = new THREE.Color();

// ---------- camera track ----------
const Z_TRACK = [
  [0.00, 16],
  [0.18, 7],
  [0.40, -6],
  [0.62, -48],
  [0.82, -104],
  [1.00, -138],
];

// ---------- pointer parallax ----------
const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
window.addEventListener('pointermove', (e) => {
  pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
  pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
}, { passive: true });

// ---------- smooth scroll ----------
const lenis = new Lenis({ lerp: 0.08, wheelMultiplier: 0.9, smoothWheel: true });
window.__lenis = lenis; // exposed for debugging / scripted scroll capture

// ---------- overlay (chapters / rail / hint) ----------
const chapters = [...document.querySelectorAll('.chapter')].map((el) => ({
  el, center: parseFloat(el.dataset.center),
}));
const railDots = [...document.querySelectorAll('.rail .dot')];
const scrollHint = document.querySelector('.scrollhint');

function updateOverlay(p){
  let activeIndex = 0;
  let best = 1;
  chapters.forEach((c, i) => {
    const d = Math.abs(p - c.center);
    const op = clamp(1 - d / 0.11, 0, 1);
    const eased = op * op * (3 - 2 * op);
    c.el.style.opacity = eased.toFixed(3);
    c.el.style.transform = `translateY(${((1 - eased) * 26).toFixed(1)}px)`;
    if (d < best){ best = d; activeIndex = i; }
  });
  railDots.forEach((dot, i) => dot.classList.toggle('on', i === activeIndex));
  if (scrollHint) scrollHint.style.opacity = (1 - smoothstep(0.0, 0.035, p)).toFixed(3);
}

// ---------- resize ----------
function onResize(){
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloom.setSize(w, h);
}
window.addEventListener('resize', onResize);

// ---------- main loop ----------
const clock = new THREE.Clock();
function frame(time){
  lenis.raf(time);
  const t = clock.getElapsedTime();
  const p = lenis.limit > 0 ? clamp(lenis.scroll / lenis.limit, 0, 1) : 0;

  // pointer easing
  pointer.x = lerp(pointer.x, pointer.tx, 0.05);
  pointer.y = lerp(pointer.y, pointer.ty, 0.05);

  // derived scene parameters
  const warpAmt = smoothstep(0.64, 0.72, p) * (1 - smoothstep(0.82, 0.90, p));
  const nebulaOp = smoothstep(0.34, 0.46, p) * (1 - smoothstep(0.62, 0.72, p));
  const galaxyOp = smoothstep(0.70, 0.90, p);

  // camera along the track + parallax + a gentle rise toward the galaxy
  const camZ = track(p, Z_TRACK);
  const rise = smoothstep(0.6, 1.0, p);
  camera.position.x = pointer.x * 2.2;
  camera.position.y = lerp(0, 2.6, rise) - pointer.y * 1.4;
  camera.position.z = camZ;
  camera.lookAt(pointer.x * 1.2, lerp(0, 5.2, rise), camZ - 30);

  // uniforms
  stars.material.uniforms.uTime.value = t;
  stars.material.uniforms.uOpacity.value = 1 - warpAmt * 0.6;
  stars.rotation.y = t * 0.005;

  warp.material.uniforms.uWarp.value = warpAmt;

  nebula.material.uniforms.uTime.value = t;
  nebula.material.uniforms.uOpacity.value = nebulaOp * 0.36;

  galaxy.material.uniforms.uTime.value = t;
  galaxy.material.uniforms.uOpacity.value = galaxyOp * 0.6;

  planet.userData.surfMat.uniforms.uTime.value = t;
  planet.rotation.y = t * 0.03;

  // bloom + colour grade (ease bloom down inside the nebula to keep colour)
  bloom.strength = 0.42 + warpAmt * 0.6 + galaxyOp * 0.3 - nebulaOp * 0.14;
  if (p < 0.5) clearCol.copy(COL_START).lerp(COL_NEBULA, smoothstep(0.2, 0.5, p));
  else if (p < 0.75) clearCol.copy(COL_NEBULA).lerp(COL_WARP, smoothstep(0.5, 0.75, p));
  else clearCol.copy(COL_WARP).lerp(COL_GALAXY, smoothstep(0.75, 1.0, p));
  renderer.setClearColor(clearCol, 1);

  updateOverlay(p);
  composer.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
