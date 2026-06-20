// The home planet: a glowing marble with a procedural surface, an additive
// atmosphere shell, and a bright sun placed just off its limb for a
// "sunrise from orbit" opening shot.
import * as THREE from 'three';
import {
  planetVert, planetFrag, atmoVert, atmoFrag,
} from './shaders.js';

export function createPlanet(){
  const group = new THREE.Group();
  const sunDir = new THREE.Vector3(0.7, 0.25, 0.6).normalize();

  // --- surface ---
  const surfMat = new THREE.ShaderMaterial({
    vertexShader: planetVert,
    fragmentShader: planetFrag,
    uniforms: {
      uSunDir: { value: sunDir },
      uTime: { value: 0 },
    },
  });
  const surface = new THREE.Mesh(new THREE.SphereGeometry(3, 96, 96), surfMat);
  group.add(surface);

  // --- atmosphere shell (back faces, additive) ---
  const atmoMat = new THREE.ShaderMaterial({
    vertexShader: atmoVert,
    fragmentShader: atmoFrag,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(0x4aa6ff) },
      uOpacity: { value: 1 },
    },
  });
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(3.35, 64, 64), atmoMat);
  group.add(atmosphere);

  // --- sun (bloom does the flaring) ---
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff2d0 }),
  );
  sun.position.set(7.5, 2.4, -6);
  group.add(sun);

  group.position.set(0, -1.4, -2);

  group.userData = { surfMat, atmoMat };
  return group;
}
