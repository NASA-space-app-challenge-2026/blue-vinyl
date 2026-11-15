// A year of lightning drawn on the globe, with the sunlight of the season (see tracks/domain/lightning-season.js).
//   - Sunlight: a faint warm band around the latitude the noon sun stands over, fading out toward the poles (by the
//     noon sun's height; day and night are left out, as a year plays in a minute), so the hemisphere having its summer
//     is the lit one. Nothing is darkened.
//   - Lines: the equator between the two hemispheres and the two tropics (the sun's reach), all dashed and faint.
//   - Bolt: the centre of the lightning in sight drawn as a bolt of lightning across the globe at that latitude, in the
//     colour of the hemisphere it is in: a jagged white-hot core in a glow, a fainter fork splitting off it here and
//     there, re-striking in a new shape BOLT.restrikeHz times a second and flashing as it does.
//   - Flashes: each a dim point of light in its hemisphere's colour (FLASH_COLOR: warm in the north, cool in the south)
//     that brightens in over FADE_IN_DAYS and fades out over VISIBLE_DAYS of data time, so the last days' lightning
//     hangs over the land as a glow, nothing popping, and the season shows in which colour fills the globe.
//   - A struck flash (one the music plays) appears only as it is heard (its `heardAt`; at its own time while the music
//     is not playing), flaring white and large, then stays brighter than the rest.

// The same three.js revision globe.gl@2.46.2 bundles, so the meshes fit its scene.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js';
import { Hemisphere, VISIBLE_DAYS, centreLat, seriesAt } from '../../tracks/domain/lightning-season.js';

const DAY_MS = 24 * 60 * 60 * 1000;
// The tropics, the furthest the noon sun goes from the equator.
const TROPIC_DEG = 23.44;
// Lifted above the map: the sunlight and lines just above, the flashes above them.
const ALTITUDE = Object.freeze({ sky: 0.002, flash: 0.004 });
const SPHERE_SEGMENTS = Object.freeze({ width: 128, height: 64 });
// Sunlight: full within `fullDeg` of the sun's latitude, gone beyond `noneDeg`; the light's colour and opacity.
const SUNLIGHT = Object.freeze({
  fullDeg: 20,
  noneDeg: 70,
  light: Object.freeze({ color: '#ffd27a', opacity: 0.12 }),
});
// Each line's colour, opacity and width (CSS px), dashed every DASH_DEG of longitude.
const LINE = Object.freeze({
  equator: Object.freeze({ color: '#ffffff', opacity: 0.45, widthPx: 1 }),
  tropic: Object.freeze({ color: '#ffffff', opacity: 0.3, widthPx: 0.75 }),
  centre: Object.freeze({ opacity: 0.9 }),
});
// The bolt: how far (degrees of latitude) its zigzag strays from the centre latitude, the zigzags' sizes (segments per
// degree of longitude, each a whole number of segments around the globe so the bolt meets itself behind it) and
// weights, its core's width and its glow's reach (CSS px), how bright the glow and the fork are against the core, how
// far the fork strays, and how often it re-strikes.
const BOLT = Object.freeze({
  jagDeg: 2,
  zigzags: Object.freeze([
    Object.freeze({ perDeg: 0.125, weight: 1 }),
    Object.freeze({ perDeg: 0.5, weight: 0.45 }),
    Object.freeze({ perDeg: 1.5, weight: 0.15 }),
  ]),
  coreWidthPx: 2,
  glowPx: 7,
  glow: 0.75,
  fork: 0.55,
  forkJag: 2.2,
  restrikeHz: 6,
});
const DASH_DEG = 4;
// A flash's size (CSS px) and its glow, a struck one's and the rest's, as it fades out over VISIBLE_DAYS of data time;
// the rest brighten in over FADE_IN_DAYS. A struck one flares FLARE times that size as it strikes and settles over
// FLARE_SEC (playing time), FLARE_WHITE of the way to white, so its hemisphere's colour still shows.
const FLASH_PX = 3.5;
const GLOW = Object.freeze({ struck: 0.9, rest: 0.4 });
const FADE_IN_DAYS = 1.5;
const FLARE = 5;
const FLARE_SEC = 0.45;
const FLARE_WHITE = 0.85;
const FLASH_COLOR = Object.freeze({ [Hemisphere.NORTH.key]: '#ffb347', [Hemisphere.SOUTH.key]: '#5fb4ff' });

const glsl = (v) => v.toFixed(4);
const rgb = (hex) => new THREE.Color(hex);

const skyVertexShader = `
varying vec3 vPos;
void main() {
  vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// Latitude and longitude from the globe's own axes (uNorth, and uLon0 and uLon90 on the equator), so the lines follow
// globe.gl's frame whatever it is.
const skyFragmentShader = `
uniform vec3 uNorth;
uniform vec3 uLon0;
uniform vec3 uLon90;
uniform float uSun;
uniform float uPixelRatio;
uniform vec3 uLight;
uniform vec3 uEquatorColor;
uniform vec3 uTropicColor;
uniform float uCentre;
uniform float uCentreShown;
uniform vec3 uCentreColor;
uniform float uTime;
varying vec3 vPos;

float hash(float n) {
  return fract(sin(n) * 43758.5453);
}

// Random heights in -1..1 joined by straight segments, perDeg segments per degree of longitude, the same every lap
// round the globe.
float zigzag(float lon, float perDeg, float seed) {
  float x = (lon + 180.0) * perDeg;
  float laps = 360.0 * perDeg;
  float i = floor(x);
  float a = hash(mod(i, laps) + seed);
  float b = hash(mod(i + 1.0, laps) + seed);
  return mix(a, b, fract(x)) * 2.0 - 1.0;
}

// A bolt's offset from the centre latitude (degrees) at lon.
float bolt(float lon, float seed, float jag) {
  return jag * (${BOLT.zigzags.map((z, k) => `${glsl(z.weight)} * zigzag(lon, ${glsl(z.perDeg)}, seed + ${glsl(17 * k)})`).join(' + ')});
}

// How far (CSS px) the point at lat, lon lies from a bolt: in latitude (.x), for the glow, and across the bolt (.y),
// for its core, shortened where the bolt runs steep (a degree of longitude is cos(lat) of a degree of latitude on the
// globe) so the core keeps its width.
vec2 fromBolt(float lat, float lon, float seed, float jag) {
  float at = uCentre + bolt(lon, seed, jag);
  float slope = (bolt(lon + 0.05, seed, jag) - bolt(lon - 0.05, seed, jag)) / 0.1 / max(cos(radians(lat)), 0.05);
  float px = abs(lat - at) / (max(fwidth(lat), 1e-6) / uPixelRatio);
  return vec2(px, px / sqrt(1.0 + slope * slope));
}

float line(float lat, float at, float widthPx) {
  float w = fwidth(lat);
  float reach = 0.5 * widthPx * uPixelRatio * w;
  return 1.0 - smoothstep(reach, reach + w, abs(lat - at));
}

void over(inout vec4 c, vec3 color, float alpha) {
  c.rgb = mix(c.rgb, color, alpha);
  c.a = alpha + c.a * (1.0 - alpha);
}

void main() {
  vec3 n = normalize(vPos);
  float lat = degrees(asin(clamp(dot(n, uNorth), -1.0, 1.0)));
  float lon = degrees(atan(dot(n, uLon90), dot(n, uLon0)));
  float lit = 1.0 - smoothstep(${glsl(SUNLIGHT.fullDeg)}, ${glsl(SUNLIGHT.noneDeg)}, abs(lat - uSun));
  // A faint warm light where the sun shines.
  vec4 c = vec4(uLight, ${glsl(SUNLIGHT.light.opacity)} * lit);
  float dash = step(0.5, fract(lon / ${glsl(DASH_DEG)}));
  over(c, uEquatorColor, ${glsl(LINE.equator.opacity)} * line(lat, 0.0, ${glsl(LINE.equator.widthPx)}) * dash);
  float tropics = max(line(lat, ${glsl(TROPIC_DEG)}, ${glsl(LINE.tropic.widthPx)}), line(lat, ${glsl(-TROPIC_DEG)}, ${glsl(LINE.tropic.widthPx)}));
  over(c, uTropicColor, ${glsl(LINE.tropic.opacity)} * tropics * dash);
  // The bolt, re-striking in a new shape every 1/restrikeHz s, flashing bright as it strikes and settling.
  float strike = floor(uTime * ${glsl(BOLT.restrikeHz)});
  float flash = 0.55 + 0.45 * exp(-3.0 * fract(uTime * ${glsl(BOLT.restrikeHz)})) * (0.6 + 0.4 * hash(strike * 1.7));
  float seed = hash(strike) * 1000.0;
  vec2 boltPx = fromBolt(lat, lon, seed, ${glsl(BOLT.jagDeg)});
  vec2 forkPx = fromBolt(lat, lon, seed + 101.0, ${glsl(BOLT.jagDeg * BOLT.forkJag)});
  // The fork shows only on some stretches of the bolt.
  float forkShown = smoothstep(0.0, 0.5, zigzag(lon, 0.04, seed + 7.0));
  float core = 1.0 - smoothstep(${glsl(BOLT.coreWidthPx / 2)}, ${glsl(BOLT.coreWidthPx / 2 + 1)}, boltPx.y);
  float forkCore = forkShown * (1.0 - smoothstep(0.4, 1.4, forkPx.y));
  float glow = ${glsl(BOLT.glow)} * (exp(-boltPx.x / ${glsl(BOLT.glowPx)}) + forkShown * ${glsl(BOLT.fork)} * exp(-forkPx.x / ${glsl(BOLT.glowPx / 2)}));
  float shown = uCentreShown * ${glsl(LINE.centre.opacity)} * flash;
  over(c, uCentreColor, shown * min(1.0, glow));
  over(c, mix(uCentreColor, vec3(1.0), 0.8), shown * max(core, ${glsl(BOLT.fork)} * forkCore));
  gl_FragColor = c;
  #include <colorspace_fragment>
}`;

const flashVertexShader = `
attribute float aShow;
attribute float aNorth;
attribute float aStruck;
uniform float uNow;
uniform float uMsPerSec;
uniform float uPixelRatio;
varying float vFlare;
varying float vAlpha;
varying float vNorth;
void main() {
  vNorth = aNorth;
  float age = uNow - aShow;
  float fade = 1.0 - age / ${glsl(VISIBLE_DAYS * DAY_MS)};
  bool shown = age >= 0.0 && fade > 0.0;
  float fadeIn = mix(smoothstep(0.0, ${glsl(FADE_IN_DAYS * DAY_MS)}, age), 1.0, aStruck);
  float glow = mix(${glsl(GLOW.rest)}, ${glsl(GLOW.struck)}, aStruck);
  vFlare = shown ? aStruck * exp(-age / uMsPerSec / ${glsl(FLARE_SEC)}) : 0.0;
  vAlpha = shown ? max(vFlare, glow * fade * fadeIn) : 0.0;
  gl_PointSize = shown ? ${glsl(FLASH_PX)} * (1.0 + ${glsl(FLARE - 1)} * vFlare) * uPixelRatio : 0.0;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// A soft round point in its hemisphere's colour, white-hot as a struck one strikes.
const flashFragmentShader = `
uniform vec3 uNorthColor;
uniform vec3 uSouthColor;
varying float vFlare;
varying float vAlpha;
varying float vNorth;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  if (r > 1.0) discard;
  float soft = smoothstep(1.0, 0.2, r);
  vec3 color = mix(mix(uSouthColor, uNorthColor, vNorth), vec3(1.0), ${glsl(FLARE_WHITE)} * vFlare);
  gl_FragColor = vec4(color, vAlpha * soft);
  #include <colorspace_fragment>
}`;

/** @param {Object} globe the globe.gl instance */
export function createLightningLayer(globe) {
  const unit = (lat, lng) => new THREE.Vector3().copy(globe.getCoords(lat, lng, 0)).normalize();
  const sky = {
    uNorth: { value: unit(90, 0) },
    uLon0: { value: unit(0, 0) },
    uLon90: { value: unit(0, 90) },
    uSun: { value: 0 },
    uPixelRatio: { value: 1 },
    uLight: { value: rgb(SUNLIGHT.light.color) },
    uEquatorColor: { value: rgb(LINE.equator.color) },
    uTropicColor: { value: rgb(LINE.tropic.color) },
    uCentre: { value: 0 },
    uCentreShown: { value: 0 },
    uCentreColor: { value: rgb(FLASH_COLOR.north) },
    uTime: { value: 0 },
  };
  const skyMesh = new THREE.Mesh(
    new THREE.SphereGeometry(globe.getGlobeRadius() * (1 + ALTITUDE.sky), SPHERE_SEGMENTS.width, SPHERE_SEGMENTS.height),
    new THREE.ShaderMaterial({
      uniforms: sky,
      vertexShader: skyVertexShader,
      fragmentShader: skyFragmentShader,
      transparent: true,
      depthWrite: false,
      // The map's tiles bulge through a sphere this close in places; its far side is culled anyway.
      depthTest: false,
    }),
  );
  skyMesh.renderOrder = 1;
  skyMesh.visible = false;
  globe.scene().add(skyMesh);

  const flash = {
    uNow: { value: 0 },
    uMsPerSec: { value: 1 },
    uPixelRatio: { value: 1 },
    uNorthColor: { value: rgb(FLASH_COLOR.north) },
    uSouthColor: { value: rgb(FLASH_COLOR.south) },
  };
  const points = new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.ShaderMaterial({
      uniforms: flash,
      vertexShader: flashVertexShader,
      fragmentShader: flashFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  points.renderOrder = 2;
  points.visible = false;
  globe.scene().add(points);

  // The season whose flashes are drawn, the time they are measured from (so they fit a float), and its struck ones.
  let season = null;
  let origin = 0;
  let struck = [];

  function setSeason(next) {
    season = next;
    origin = next.t[0];
    const { t, lat, lon } = next.flashes;
    const position = new Float32Array(3 * t.length);
    for (let i = 0; i < t.length; i++) {
      const { x, y, z } = globe.getCoords(lat[i], lon[i], ALTITUDE.flash);
      position.set([x, y, z], 3 * i);
    }
    const geometry = points.geometry;
    geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geometry.setAttribute('aShow', new THREE.BufferAttribute(Float32Array.from(t, (ti) => ti - origin), 1));
    geometry.setAttribute('aNorth', new THREE.BufferAttribute(Float32Array.from(lat, (l) => (Hemisphere.NORTH.has(l) ? 1 : 0)), 1));
    geometry.setAttribute('aStruck', new THREE.BufferAttribute(Float32Array.from(next.flashes.struck), 1));
    geometry.computeBoundingSphere();
    struck = [];
    for (let i = 0; i < t.length; i++) if (next.flashes.struck[i]) struck.push(i);
  }

  // Each struck flash appears when the music struck it, else at its own time.
  function updateShow() {
    const { t, heardAt } = season.flashes;
    const show = points.geometry.getAttribute('aShow');
    let changed = false;
    for (const i of struck) {
      const at = (Number.isNaN(heardAt[i]) ? t[i] : heardAt[i]) - origin;
      if (show.array[i] === Math.fround(at)) continue;
      show.array[i] = at;
      changed = true;
    }
    if (changed) show.needsUpdate = true;
  }

  /**
   * Draws `next` at data `time`, or nothing when it is null.
   *
   * @param {import('../../tracks/domain/lightning-season.js').LightningSeason | null} next
   * @param {number} time
   * @param {number} msPerSec data time the track plays a second
   */
  function render(next, time, msPerSec) {
    skyMesh.visible = points.visible = Boolean(next);
    if (!next) return;
    if (next !== season) setSeason(next);
    updateShow();
    const pixelRatio = globe.renderer().getPixelRatio();
    sky.uSun.value = seriesAt(season, season.sun, time);
    const centre = centreLat(season, time);
    sky.uCentreShown.value = centre === null ? 0 : 1;
    if (centre !== null) {
      sky.uCentre.value = centre;
      sky.uCentreColor.value.set(Hemisphere.NORTH.has(centre) ? FLASH_COLOR.north : FLASH_COLOR.south);
    }
    sky.uPixelRatio.value = pixelRatio;
    sky.uTime.value = performance.now() / 1000;
    flash.uNow.value = time - origin;
    flash.uMsPerSec.value = msPerSec;
    flash.uPixelRatio.value = pixelRatio;
  }

  return { render };
}
