// The smog over a box around a city, drawn on the globe (see tracks/domain/smog.js and docs/albums/smog.md), as nell-v2
// draws it, its edge faded out.
//   - Fog: one patch of the globe over the song's box whose shader reads each hour's pollution levels as a texture,
//     smoothly between cells (bicubic) and between hours, and draws a billowing fog that drifts, thin and pale where
//     the air is moderate and thick and brown where it is worst, the map clear underneath where the air is clean (fogOf,
//     the fog the music hears). It fades in over the song's first moments and out over its last, and out toward the
//     box's edge, round on the ground and ragged with the billows, so it has no edge where the data ends and the rest
//     of the globe is clear (user, 2026-11-15).
//   - Where the fog is thinning, a cold sheen runs through it, the front sweeping it out.
//   - The city: a dot and its name, so the fog has a place to cover and uncover.
// Only the hour's textures are uploaded, once an hour.

// The same three.js revision globe.gl@2.46.2 bundles, so the meshes fit its scene.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js';
import { svg } from '../../../shared/svg.js';
import { lastIndexAtOrBefore } from '../../tracks/domain/bird-track.js';
import { FOG, FOG_EDGE } from '../../tracks/domain/smog.js';

// Lifted above the map so the fog lies over it.
const ALTITUDE = 0.004;
// Vertices of the patch along each side: enough for the globe's curve under it.
const SEGMENTS = 48;
// The fog fades in over its song's first moments and out over its last (playback ms).
const FADE_MS = 1500;
// A city's dot radius and where its name sits above it (px).
const CITY = Object.freeze({ r: 2.5, nameDy: -7 });

const glsl = (v) => v.toFixed(4);

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragmentShader = `
uniform sampler2D uLevelA;
uniform sampler2D uLevelB;
uniform sampler2D uClearA;
uniform sampler2D uClearB;
uniform float uMix;
uniform vec2 uSize;
uniform vec2 uSpan;
uniform vec2 uGround;
uniform float uTime;
uniform vec2 uFog;
uniform float uFade;
varying vec2 vUv;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm(vec3 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += amp * noise(p);
    p *= 2.03;
    amp *= 0.5;
  }
  return sum;
}

// B-spline weights, and a texture read smoothly through four bilinear taps.
vec4 bspline(float v) {
  vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
  vec4 s = n * n * n;
  float x = s.x;
  float y = s.y - 4.0 * s.x;
  float z = s.z - 4.0 * s.y + 6.0 * s.x;
  return vec4(x, y, z, 6.0 - x - y - z) / 6.0;
}
float smoothRead(sampler2D tex, vec2 uv) {
  vec2 p = uv * uSize - 0.5;
  vec2 f = fract(p);
  p -= f;
  vec4 xw = bspline(f.x);
  vec4 yw = bspline(f.y);
  vec4 c = p.xxyy + vec2(-0.5, 1.5).xyxy;
  vec4 s = vec4(xw.xz + xw.yw, yw.xz + yw.yw);
  vec4 o = (c + vec4(xw.yw, yw.yw) / s) / uSize.xxyy;
  float a = texture2D(tex, o.xz).r;
  float b = texture2D(tex, o.yz).r;
  float d = texture2D(tex, o.xw).r;
  float e = texture2D(tex, o.yw).r;
  float sx = s.x / (s.x + s.y);
  float sy = s.z / (s.z + s.w);
  return mix(mix(e, d, sx), mix(b, a, sx), sy);
}

void main() {
  float level = mix(smoothRead(uLevelA, vUv), smoothRead(uLevelB, vUv), uMix);
  float clearing = mix(smoothRead(uClearA, vUv), smoothRead(uClearB, vUv), uMix);
  // Fog billowing and drifting over the box, its edges ragged.
  vec2 p = vUv * uSpan;
  vec2 drift = vec2(0.05, -0.02) * uTime;
  vec2 warp = vec2(fbm(vec3(p * 0.6 + drift, uTime * 0.03)), fbm(vec3(p * 0.6 + drift + 7.3, uTime * 0.03))) - 0.5;
  float billow = fbm(vec3(p * 1.4 + 1.6 * warp + drift, uTime * 0.05));
  float lv = level + (billow - 0.5) * 0.2;
  float fog = smoothstep(uFog.x, uFog.y, lv);
  // Lit from the northwest: brighter where the billows rise toward the light, shadowed behind them.
  float lit = fbm(vec3(p * 1.4 + 1.6 * warp + drift + vec2(-0.08, 0.08), uTime * 0.05)) - billow;
  float thick = smoothstep(0.5, 1.0, lv);
  vec3 color = mix(vec3(0.80, 0.79, 0.74), vec3(0.58, 0.46, 0.30), thick);
  color *= 0.82 + 0.35 * billow + 0.9 * lit;
  float alpha = fog * (0.72 + 0.28 * billow);
  // The cold sheen where the fog is thinning.
  vec3 sky = vec3(0.78, 0.92, 1.0);
  float sheen = smoothstep(0.03, 0.15, clearing) * billow;
  color = mix(color, sky, 0.5 * sheen);
  alpha = max(alpha, 0.35 * sheen);
  // Faded out toward the box's edge, round on the ground and ragged with the billows.
  float reach = length((vUv - 0.5) * uGround) / (0.5 * min(uGround.x, uGround.y)) + (billow - 0.5) * ${glsl(FOG_EDGE.ragged)};
  float edge = 1.0 - smoothstep(${glsl(FOG_EDGE.from)}, ${glsl(FOG_EDGE.to)}, reach);
  gl_FragColor = vec4(color, alpha * edge * uFade);
  #include <colorspace_fragment>
}`;

function dataTexture(cols, rows) {
  const texture = new THREE.DataTexture(new Uint8Array(cols * rows), cols, rows, THREE.RedFormat, THREE.UnsignedByteType);
  texture.unpackAlignment = 1;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/** @param {{ globe: Object, setElements: (elements: Object[]) => void }} view */
export function createSmogLayer({ globe, setElements }) {
  const uniforms = {
    uLevelA: { value: null },
    uLevelB: { value: null },
    uClearA: { value: null },
    uClearB: { value: null },
    uMix: { value: 0 },
    uSize: { value: new THREE.Vector2() },
    uSpan: { value: new THREE.Vector2() },
    // The box's width and height on the ground (degrees of arc at its middle).
    uGround: { value: new THREE.Vector2() },
    uTime: { value: 0 },
    uFog: { value: new THREE.Vector2(FOG.from, FOG.full) },
    uFade: { value: 1 },
  };
  const mesh = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      // Drawn over the map's tiles, which bulge above the sphere between their vertices, from either side.
      depthTest: false,
      side: THREE.DoubleSide,
    }),
  );
  mesh.renderOrder = 1;
  mesh.visible = false;
  globe.scene().add(mesh);

  // The track drawn, and the hour its textures hold.
  let track = null;
  let hour = null;

  // Builds the patch over `next`'s box, its textures and its city.
  function setTrack(next, city) {
    track = next;
    hour = null;
    const { rows, cols, south, west, stepDeg } = next.field;
    // The patch spans the cells' outer edges, half a cell beyond their centres.
    const [s, w] = [south - stepDeg / 2, west - stepDeg / 2];
    const [latSpan, lonSpan] = [rows * stepDeg, cols * stepDeg];
    const position = [];
    const uv = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      for (let j = 0; j <= SEGMENTS; j++) {
        const [u, v] = [j / SEGMENTS, i / SEGMENTS];
        const { x, y, z } = globe.getCoords(s + v * latSpan, w + u * lonSpan, ALTITUDE);
        position.push(x, y, z);
        uv.push(u, v);
      }
    }
    const index = [];
    for (let i = 0; i < SEGMENTS; i++) {
      for (let j = 0; j < SEGMENTS; j++) {
        const a = i * (SEGMENTS + 1) + j;
        index.push(a, a + 1, a + SEGMENTS + 1, a + 1, a + SEGMENTS + 2, a + SEGMENTS + 1);
      }
    }
    mesh.geometry.dispose();
    mesh.geometry = new THREE.BufferGeometry();
    mesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
    mesh.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    mesh.geometry.setIndex(index);
    mesh.geometry.computeBoundingSphere();
    for (const key of ['uLevelA', 'uLevelB', 'uClearA', 'uClearB']) {
      uniforms[key].value?.dispose();
      uniforms[key].value = dataTexture(cols, rows);
    }
    uniforms.uSize.value.set(cols, rows);
    uniforms.uSpan.value.set(lonSpan, latSpan);
    uniforms.uGround.value.set(lonSpan * Math.cos(((s + latSpan / 2) * Math.PI) / 180), latSpan);
    setElements([cityElement(city)]);
  }

  // Loads hour `i` and the next into the textures.
  function upload(i) {
    const { levels, clearing } = track.field;
    for (const [key, frame] of [
      ['uLevelA', levels[i]],
      ['uLevelB', levels[i + 1]],
      ['uClearA', clearing[i]],
      ['uClearB', clearing[i + 1]],
    ]) {
      uniforms[key].value.image.data.set(frame);
      uniforms[key].value.needsUpdate = true;
    }
    hour = i;
  }

  /**
   * Draws `next`'s smog at playback `time` (ms into the song), with its city, or nothing when it is null.
   *
   * @param {import('../../tracks/domain/smog.js').SmogTrack | null} next
   * @param {number} time
   * @param {{ name: string, lat: number, lon: number } | null} city
   */
  function render(next, time, city) {
    if (!next) {
      if (!track) return;
      track = null;
      mesh.visible = false;
      setElements([]);
      return;
    }
    if (next !== track) setTrack(next, city);
    const { t } = next;
    const i = Math.min(Math.max(0, lastIndexAtOrBefore(t, time)), t.length - 2);
    if (i !== hour) upload(i);
    uniforms.uMix.value = Math.min(1, Math.max(0, (time - t[i]) / (t[i + 1] - t[i])));
    uniforms.uTime.value = performance.now() / 1000;
    uniforms.uFade.value = Math.max(0, Math.min(1, (time - t[0]) / FADE_MS, (t.at(-1) - time) / FADE_MS));
    mesh.visible = true;
  }

  return { render };
}

// A city's dot and name, at the city.
function cityElement(city) {
  const el = document.createElement('div');
  el.className = 'smog-city';
  el.append(
    svg('svg', { width: 1, height: 1 }, [
      svg('circle', { class: 'smog-city-dot', r: CITY.r }),
      Object.assign(svg('text', { class: 'smog-city-name', y: CITY.nameDy }), { textContent: city.name }),
    ]),
  );
  return { el, lat: city.lat, lng: city.lon };
}
