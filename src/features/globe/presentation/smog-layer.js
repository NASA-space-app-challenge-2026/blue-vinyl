// The smog over a city, drawn on the globe (see tracks/domain/smog.js and docs/albums/smog.md), after nell-v2's.
//   - Fog: one patch of the globe over the box around the city, its cells' fog (fogOf) from one day to the next
//     blended as the day passes, smooth between cells, stirred by slowly drifting noise. Clear air leaves the map
//     showing; the thicker the fog, the thicker and dirtier it covers the map. It fades out at the box's edge.
//   - The city: a small ring where it is.
//   - Swings, on the step they sound on: as the smog rolls in the map darkens for a moment; as it clears, the clear
//     places flash bright. Both fade over SWING_FADE_SEC of playing.

// The same three.js revision globe.gl@2.46.2 bundles, so the meshes fit its scene.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js';

// Lifted just above the map.
const ALTITUDE = 0.002;
// The patch's mesh: this many segments each way.
const SEGMENTS = 48;
// The fog's colours, thin to thick, and how much it covers the map at its thickest.
const FOG = Object.freeze({ thin: '#cfc8b4', thick: '#8a7350', opacity: 0.92 });
// The share of the box's width over which the fog fades out at its edges.
const EDGE = 0.08;
// The drifting noise: its scale (cycles over the box), its speed (box widths a second) and how much it thins or thickens.
const NOISE = Object.freeze({ scale: 5, speed: 0.02, depth: 0.35 });
// The city's ring: its radius and width as shares of the box's height.
const RING = Object.freeze({ radius: 0.012, width: 0.004, color: '#ffffff', opacity: 0.85 });
// A swing's moment: how dark the map goes, how bright the clear places flash, and how long either fades (s).
const SWING = Object.freeze({ dark: 0.55, flash: 0.7, flashColor: '#fff6d8' });
export const SWING_FADE_SEC = 1.2;

const glsl = (v) => v.toFixed(4);

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragmentShader = `
uniform sampler2D uFrom;
uniform sampler2D uTo;
uniform float uAlong;
uniform float uTime;
uniform vec2 uCity;
// The box's width on the ground over its height.
uniform float uAspect;
uniform float uDark;
uniform float uFlash;
uniform vec3 uThin;
uniform vec3 uThick;
uniform vec3 uRing;
uniform vec3 uFlashColor;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void over(inout vec4 c, vec3 color, float alpha) {
  c.rgb = mix(c.rgb, color, alpha);
  c.a = alpha + c.a * (1.0 - alpha);
}

void main() {
  float fog = mix(texture2D(uFrom, vUv).r, texture2D(uTo, vUv).r, uAlong);
  vec2 drift = vec2(uTime * ${glsl(NOISE.speed)}, uTime * ${glsl(NOISE.speed * 0.6)});
  float stir = 0.65 * noise(vUv * ${glsl(NOISE.scale)} + drift) + 0.35 * noise(vUv * ${glsl(NOISE.scale * 2.3)} - drift);
  fog = clamp(fog * (1.0 + ${glsl(NOISE.depth)} * (2.0 * stir - 1.0)), 0.0, 1.0);
  float edge = smoothstep(0.0, ${glsl(EDGE)}, min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)));
  vec4 c = vec4(mix(uThin, uThick, fog), ${glsl(FOG.opacity)} * smoothstep(0.0, 1.0, fog) * edge);
  // The map darkens as the smog rolls in, and the clear places flash as it clears.
  over(c, vec3(0.0), ${glsl(SWING.dark)} * uDark * edge);
  over(c, uFlashColor, uFlash * (1.0 - fog) * edge);
  float ring = 1.0 - smoothstep(0.0, ${glsl(RING.width)}, abs(length((vUv - uCity) * vec2(uAspect, 1.0)) - ${glsl(RING.radius)}));
  over(c, uRing, ${glsl(RING.opacity)} * ring);
  gl_FragColor = c;
  #include <colorspace_fragment>
}`;

/** @param {Object} globe the globe.gl instance */
export function createSmogLayer(globe) {
  const uniforms = {
    uFrom: { value: null },
    uTo: { value: null },
    uAlong: { value: 0 },
    uTime: { value: 0 },
    uCity: { value: new THREE.Vector2(0.5, 0.5) },
    uAspect: { value: 1 },
    uDark: { value: 0 },
    uFlash: { value: 0 },
    uThin: { value: new THREE.Color(FOG.thin) },
    uThick: { value: new THREE.Color(FOG.thick) },
    uRing: { value: new THREE.Color(RING.color) },
    uFlashColor: { value: new THREE.Color(SWING.flashColor) },
  };
  const mesh = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, depthTest: false }),
  );
  mesh.renderOrder = 1;
  mesh.visible = false;
  globe.scene().add(mesh);

  // The grid drawn, its two days' textures and the day they hold.
  let grid = null;
  let textures = [];
  let shownDay = null;

  function setGrid(next, city) {
    grid = next;
    const { rows, cols, box } = next;
    // The patch spans the cells' outer edges, half a cell beyond their centres.
    const south = box.south - box.stepDeg / 2;
    const west = box.west - box.stepDeg / 2;
    const height = rows * box.stepDeg;
    const width = cols * box.stepDeg;
    const position = [];
    const uv = [];
    for (let j = 0; j <= SEGMENTS; j++) {
      for (let i = 0; i <= SEGMENTS; i++) {
        const { x, y, z } = globe.getCoords(south + (height * j) / SEGMENTS, west + (width * i) / SEGMENTS, ALTITUDE);
        position.push(x, y, z);
        uv.push(i / SEGMENTS, j / SEGMENTS);
      }
    }
    const index = [];
    for (let j = 0; j < SEGMENTS; j++) {
      for (let i = 0; i < SEGMENTS; i++) {
        const a = j * (SEGMENTS + 1) + i;
        index.push(a, a + 1, a + SEGMENTS + 1, a + 1, a + SEGMENTS + 2, a + SEGMENTS + 1);
      }
    }
    mesh.geometry.dispose();
    mesh.geometry = new THREE.BufferGeometry();
    mesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
    mesh.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    mesh.geometry.setIndex(index);
    mesh.geometry.computeBoundingSphere();
    for (const texture of textures) texture.dispose();
    textures = [0, 1].map(() => {
      const texture = new THREE.DataTexture(new Uint8Array(rows * cols), cols, rows, THREE.RedFormat, THREE.UnsignedByteType);
      texture.magFilter = texture.minFilter = THREE.LinearFilter;
      texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
      return texture;
    });
    [uniforms.uFrom.value, uniforms.uTo.value] = textures;
    uniforms.uCity.value.set((city.lon - west) / width, (city.lat - south) / height);
    uniforms.uAspect.value = (width / height) * Math.cos((city.lat * Math.PI) / 180);
    shownDay = null;
  }

  // Puts `day`'s fog and the next day's in the textures.
  function showDay(day) {
    if (day === shownDay) return;
    shownDay = day;
    const last = grid.fog.length - 1;
    textures[0].image.data.set(grid.fog[Math.min(day, last)]);
    textures[1].image.data.set(grid.fog[Math.min(day + 1, last)]);
    for (const texture of textures) texture.needsUpdate = true;
  }

  /**
   * Draws `next`'s fog `day` days (fractional) into its year, or nothing when it is null.
   *
   * @param {{ grid: import('../../tracks/domain/smog.js').SmogGrid, city: { lat: number, lon: number } } | null} next
   * @param {number} day
   * @param {{ smog: number, clear: number }} swing how far the last swing's darkening (smog) and flash (clear) still
   *   show, 0 to 1 (see swingGlowAt)
   */
  function render(next, day, swing) {
    mesh.visible = Boolean(next);
    if (!next) return;
    if (next.grid !== grid) setGrid(next.grid, next.city);
    const whole = Math.max(0, Math.floor(day));
    showDay(whole);
    uniforms.uAlong.value = Math.min(1, Math.max(0, day - whole));
    uniforms.uTime.value = performance.now() / 1000;
    uniforms.uDark.value = swing.smog;
    uniforms.uFlash.value = SWING.flash * swing.clear;
  }

  return { render };
}
