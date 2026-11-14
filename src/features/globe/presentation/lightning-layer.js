// A year of lightning drawn on the globe, with the sunlight of the season (see tracks/domain/lightning-season.js).
//   - Sunlight: the globe lies in shadow except a warm band around the latitude the noon sun stands over, brightest
//     there and darkening toward the poles (by the noon sun's height; day and night are left out, as a year plays in a
//     minute), so the hemisphere having its summer is the lit one.
//   - Lines: the equator between the two hemispheres, flaring wider, brighter and in the colour of the hemisphere taking
//     the lead as the lead changes hands, then settling over CROSSING_GLOW_SEC; the two tropics dashed (the sun's
//     reach); and the centre of the lightning in sight, in the colour of the hemisphere it is in.
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
// Sunlight: full within `fullDeg` of the sun's latitude, shadow beyond `noneDeg`; the shadow's and the light's colour
// and opacity.
const SUNLIGHT = Object.freeze({
  fullDeg: 20,
  noneDeg: 70,
  shadow: Object.freeze({ color: '#000000', opacity: 0.6 }),
  light: Object.freeze({ color: '#ffd27a', opacity: 0.12 }),
});
// Each line's colour, opacity and width (CSS px); the tropics dashed every DASH_DEG of longitude.
const LINE = Object.freeze({
  equator: Object.freeze({ color: '#ffffff', opacity: 0.6, widthPx: 1.5 }),
  tropic: Object.freeze({ color: '#ffffff', opacity: 0.4, widthPx: 1 }),
  centre: Object.freeze({ opacity: 0.9, widthPx: 3 }),
});
const DASH_DEG = 4;
// How long (playing time) the equator's flare at a change of lead takes to settle, and how much wider it flares.
const CROSSING_GLOW_SEC = 1.2;
const CROSSING_WIDEN = 3;
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
uniform vec3 uShadow;
uniform vec3 uLight;
uniform vec3 uLineColors[2];
uniform float uLineOpacities[2];
uniform float uLineWidths[2];
uniform float uCentre;
uniform float uCentreShown;
uniform vec3 uCentreColor;
varying vec3 vPos;

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
  // Shadow fading out toward the sun's latitude, and a faint warm light laid over where it shines.
  vec4 c = vec4(uShadow, ${glsl(SUNLIGHT.shadow.opacity)} * (1.0 - lit));
  over(c, uLight, ${glsl(SUNLIGHT.light.opacity)} * lit);
  float dash = step(0.5, fract(lon / ${glsl(DASH_DEG)}));
  over(c, uLineColors[0], uLineOpacities[0] * line(lat, 0.0, uLineWidths[0]));
  float tropics = max(line(lat, ${glsl(TROPIC_DEG)}, uLineWidths[1]), line(lat, ${glsl(-TROPIC_DEG)}, uLineWidths[1]));
  over(c, uLineColors[1], uLineOpacities[1] * tropics * dash);
  over(c, uCentreColor, uCentreShown * ${glsl(LINE.centre.opacity)} * line(lat, uCentre, ${glsl(LINE.centre.widthPx)}));
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

const LINES = [LINE.equator, LINE.tropic];

/** @param {Object} globe the globe.gl instance */
export function createLightningLayer(globe) {
  const unit = (lat, lng) => new THREE.Vector3().copy(globe.getCoords(lat, lng, 0)).normalize();
  const sky = {
    uNorth: { value: unit(90, 0) },
    uLon0: { value: unit(0, 0) },
    uLon90: { value: unit(0, 90) },
    uSun: { value: 0 },
    uPixelRatio: { value: 1 },
    uShadow: { value: rgb(SUNLIGHT.shadow.color) },
    uLight: { value: rgb(SUNLIGHT.light.color) },
    uLineColors: { value: LINES.map((l) => rgb(l.color)) },
    uLineOpacities: { value: LINES.map((l) => l.opacity) },
    uLineWidths: { value: LINES.map((l) => l.widthPx) },
    uCentre: { value: 0 },
    uCentreShown: { value: 0 },
    uCentreColor: { value: rgb(FLASH_COLOR.north) },
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

  // Flares the equator as the last change of lead at or before `time` comes and settles.
  function flareEquator(time, msPerSec) {
    const last = season.crossings.findLast((c) => c.time <= time);
    const glow = last ? Math.exp(-(time - last.time) / msPerSec / CROSSING_GLOW_SEC) : 0;
    const { equator } = LINE;
    sky.uLineOpacities.value[0] = equator.opacity + (1 - equator.opacity) * glow;
    sky.uLineWidths.value[0] = equator.widthPx * (1 + CROSSING_WIDEN * glow);
    const lead = last?.north ? FLASH_COLOR.north : FLASH_COLOR.south;
    sky.uLineColors.value[0].set(equator.color).lerp(rgb(lead), glow);
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
    flareEquator(time, msPerSec);
    const centre = centreLat(season, time);
    sky.uCentreShown.value = centre === null ? 0 : 1;
    if (centre !== null) {
      sky.uCentre.value = centre;
      sky.uCentreColor.value.set(Hemisphere.NORTH.has(centre) ? FLASH_COLOR.north : FLASH_COLOR.south);
    }
    sky.uPixelRatio.value = pixelRatio;
    flash.uNow.value = time - origin;
    flash.uMsPerSec.value = msPerSec;
    flash.uPixelRatio.value = pixelRatio;
  }

  return { render };
}
