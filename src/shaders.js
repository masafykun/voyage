// VOYAGE — GLSL shader sources for the scroll-driven space voyage.
// All shaders are authored as plain strings consumed by THREE.ShaderMaterial.

// Ashima webgl-noise: 3D simplex noise. Reused by the planet surface fbm.
export const snoise = /* glsl */ `
vec3 mod289(vec3 x){return x - floor(x * (1.0/289.0)) * 289.0;}
vec4 mod289(vec4 x){return x - floor(x * (1.0/289.0)) * 289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

// ---------- Background star dots ----------
export const starVert = /* glsl */ `
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
attribute float aScale;
attribute float aTwinkle;
varying float vTw;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float tw = 0.6 + 0.4 * sin(uTime * 1.5 + aTwinkle * 6.2831);
  vTw = tw;
  float dist = max(-mv.z, 1.0);
  gl_PointSize = uSize * aScale * uPixelRatio * (260.0 / dist) * tw;
  gl_Position = projectionMatrix * mv;
}
`;

export const starFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vTw;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  a *= a;
  gl_FragColor = vec4(uColor * (0.7 + vTw * 0.6), a * uOpacity);
}
`;

// ---------- Warp streaks (LineSegments) ----------
export const warpVert = /* glsl */ `
uniform float uWarp;     // 0..1 streak length factor
uniform float uStreak;   // base streak length in world units
attribute float aStretch; // 0 at head, 1 at tail
varying float vS;
void main(){
  vS = aStretch;
  vec3 p = position;
  p.z += aStretch * uWarp * uStreak;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

export const warpFrag = /* glsl */ `
uniform float uWarp;
uniform vec3 uColor;
varying float vS;
void main(){
  // bright at head, fading toward the tail
  float a = (1.0 - vS) * uWarp;
  gl_FragColor = vec4(uColor, a);
}
`;

// ---------- Nebula / galaxy point clouds (shared shader) ----------
export const cloudVert = /* glsl */ `
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
uniform float uSpin;     // radians/sec around Y (galaxy spin); 0 for nebula
uniform float uDrift;    // gentle positional drift amplitude
attribute float aScale;
attribute vec3 aColor;
attribute float aSeed;
varying vec3 vColor;
varying float vFade;
void main(){
  vColor = aColor;
  vec3 p = position;
  float a = uTime * uSpin;
  float c = cos(a), s = sin(a);
  p.xz = mat2(c, -s, s, c) * p.xz;
  p += uDrift * vec3(
    sin(uTime * 0.10 + aSeed * 6.28),
    cos(uTime * 0.13 + aSeed * 6.28),
    sin(uTime * 0.07 + aSeed * 6.28)
  );
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float dist = max(-mv.z, 1.0);
  gl_PointSize = min(uSize * aScale * uPixelRatio * (300.0 / dist), 150.0 * uPixelRatio);
  // Fade points that are very close so flying through the cloud never
  // collapses into a screen-filling white sprite.
  vFade = smoothstep(1.5, 14.0, dist);
  gl_Position = projectionMatrix * mv;
}
`;

export const cloudFrag = /* glsl */ `
uniform float uOpacity;
varying vec3 vColor;
varying float vFade;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  a = pow(a, 1.6);
  gl_FragColor = vec4(vColor, a * uOpacity * vFade);
}
`;

// ---------- Planet surface ----------
export const planetVert = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormalW;
varying vec3 vObj;
void main(){
  vObj = position;
  vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const planetFrag = snoise + /* glsl */ `
uniform vec3 uSunDir;
uniform float uTime;
varying vec3 vWorld;
varying vec3 vNormalW;
varying vec3 vObj;

float fbm(vec3 p){
  float f = 0.0, amp = 0.5;
  for(int i = 0; i < 5; i++){
    f += amp * snoise(p);
    p *= 2.03;
    amp *= 0.5;
  }
  return f;
}

void main(){
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorld);

  float n = fbm(vObj * 1.5);
  float land = smoothstep(0.04, 0.22, n);
  vec3 ocean = vec3(0.015, 0.09, 0.26);
  vec3 landc = mix(vec3(0.04, 0.16, 0.11), vec3(0.22, 0.20, 0.09), smoothstep(0.1, 0.6, n));
  vec3 surf = mix(ocean, landc, land);

  // swirling clouds
  float cl = fbm(vObj * 2.2 + vec3(uTime * 0.02, 0.0, 0.0));
  surf = mix(surf, vec3(0.9), smoothstep(0.35, 0.7, cl) * 0.35);

  float ndl = dot(N, normalize(uSunDir));
  float day = smoothstep(-0.18, 0.4, ndl);
  vec3 col = surf * (0.04 + day * 1.15);

  // night-side faint glow
  col += vec3(0.02, 0.05, 0.12) * (1.0 - day);

  // atmospheric fresnel rim, strongest on the day terminator
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col += vec3(0.18, 0.5, 0.95) * fres * (0.25 + day * 1.1);

  gl_FragColor = vec4(col, 1.0);
}
`;

// ---------- Atmosphere shell ----------
export const atmoVert = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormalW;
void main(){
  vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const atmoFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying vec3 vWorld;
varying vec3 vNormalW;
void main(){
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - max(dot(normalize(vNormalW), V), 0.0), 2.4);
  gl_FragColor = vec4(uColor, fres * uOpacity);
}
`;
