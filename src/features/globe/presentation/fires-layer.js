// Wildfire on the globe as it looks from orbit at night: land burned black, a fire front glowing along its edge with
// flames licking out past it, embers flickering inside and, while it burns hard, smoke lit orange from below and
// sparks streaming east on the westerlies.
//
// Track 1 (Burned Acres): each year's large MTBS fires where they burned. Their scars, the year's area, show in full on
// the bar's first beat, with the year's note; through the bar each fire flares up as hot as its acres in the order
// they started, with its pluck, then burns down to its scar, and the year's scars give way to the next year's.
// Track 2 (2020 Fire Season): each large FEDS fire where it burned, its scar as large as the fire has grown, its front
// and smoke as bright as the VIIRS pixels newly burning that day.
// In both, a scar is in proportion to its fire's area, far larger than life so it reads on a record label.
//
// Track 1 holds up to about 1,600 fires at once (2011's 824 lit while 2010's fade), so the fires are drawn as one
// instanced mesh per cap size, and the shader skips the work, or the fragment, wherever the fire adds nothing.

// The same three.js revision globe.gl@2.46.2 bundles, so the meshes fit its scene.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js';
import { fireHeat } from '../../tracks/domain/wildfire-series.js';

// Under the storm's clouds (0.008), above the ice.
const ALTITUDE = 0.006;
// Changes ease in with this time constant, so a new year or day spreads the fire instead of jumping.
const EASE_SEC = Object.freeze({ fade: 0.2 });
// Track 2: a day's scar and heat ease in with a time constant of this share of its beat, so they are 95% there by the
// next day, as its notes are.
const DAY_EASE_SHARE = 1 / 3;
const MAX_FRAME_SEC = 0.1;

// The scar's radius is EXAGGERATION times a circle of the fire's area; each fire's mesh reaches up to FIRE_CAP radians,
// room for its smoke.
const EXAGGERATION = 5;
const EARTH_RADIUS_KM = 6371;
const FIRE_CAP = 0.14;
// Track 1 draws hundreds of fires a year, most of them small, so each gets the smallest of these caps that holds its
// scar, flames and smoke, rather than FIRE_CAP for all.
const CAP_SIZES = Object.freeze([0.03, 0.06, 0.1, FIRE_CAP]);
// Track 1: a fire of this area (300,000 acres) flares at full heat; heat goes with the square root of area below it.
const FULL_HEAT_KM2 = 1214;
// Track 1: once lit, a fire flares up within FLARE_SEC and burns down with this time constant, leaving its scar.
const FLARE_SEC = 0.05;
const BURN_SEC = 0.35;

// Each fire's scar, heat, visibility and seed.
const vertexShader = `
attribute vec4 aFire;
varying vec3 vPos;
varying vec4 vFire;
void main() {
  vPos = position;
  vFire = aFire;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}`;

const common = `
uniform float uTime;
uniform float uCap;
varying vec3 vPos;
varying vec4 vFire;

// A different offset on each axis: p.x * p.y * p.z * (p.x + p.y + p.z) is the same for any order of the axes, so with
// one offset for all the noise, and every fire's edge, came out mirrored across the diagonal.
float hash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.71, 0.37));
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

// Fire's light from dull red through orange to a yellow-white core.
vec3 fireLight(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 red = vec3(0.55, 0.06, 0.02);
  vec3 orange = vec3(1.0, 0.42, 0.06);
  vec3 yellow = vec3(1.0, 0.86, 0.45);
  return t < 0.5 ? mix(red, orange, t * 2.0) : mix(orange, yellow, t * 2.0 - 1.0);
}

// Burned ground: near black with a little red, darker than the map, so only the fire's light shows colour.
const vec3 CHAR = vec3(0.03, 0.022, 0.02);
const vec3 CHAR_WARM = vec3(0.085, 0.032, 0.02);
const vec3 SMOKE = vec3(0.5, 0.48, 0.46);

// Premultiplied: the scar and smoke cover the map, the light adds to it.
vec4 compose(float charA, float smokeA, vec3 light, float d, float visible) {
  vec3 rgb = charA > 0.0 ? mix(CHAR, CHAR_WARM, noise(vPos * 0.9)) * charA : vec3(0.0);
  float a = charA;
  rgb = SMOKE * smokeA + rgb * (1.0 - smokeA);
  a = smokeA + a * (1.0 - smokeA);
  // Faded out before the mesh's rim, so no edge shows where it ends.
  float rim = smoothstep(uCap, uCap * 0.8, d);
  return vec4(rgb + light, a) * visible * rim;
}

// Under half an 8-bit step: a term this faint changes no pixel, so it is not worked out.
const float EPS = 0.002;
// How many widths out a bell of this peak, exp(-x^2) * amp, stays above EPS.
float reachOf(float amp) {
  return sqrt(log(max(amp, EPS) / EPS));
}
`;

// The cap is centred on +Y with east along +X, so vPos.xz is the place in radians from the centre (east, south).
const fireShader = `
${common}
void main() {
  float scarSize = vFire.x;
  float heat = vFire.y;
  float visible = vFire.z;
  float seed = vFire.w;
  vec2 p = normalize(vPos).xz;
  float d = length(p);
  float scale = max(scarSize, 0.0015);
  vec2 q = p / scale;
  // Every light term is at most its peak times heat * visible.
  float hv = heat * visible;

  // Bounds that need no noise: the ragged edge lies within 0.7 to 1.3 scales of the centre, so the scar, front, flames
  // and halo are within coreR of it, and the smoke and sparks downwind are at most smokeMax and sparkMax.
  float frontWidth = 0.22 * scale + 0.0012;
  float frontReach = reachOf(1.3 * hv) * frontWidth;
  float flameReach = scale * (0.25 + 0.9 * heat) + 0.003;
  float haloWidth = scale * 1.3 + 0.003;
  float coreR = max(1.3 * scale + max(hv * 1.1 > EPS ? flameReach : 0.0, frontReach), reachOf(0.14 * hv) * haloWidth);
  float alongLo = max(p.x - 0.65 * scale, 0.0);
  float alongHi = p.x - 0.35 * scale;
  float widthHi = 0.003 + 0.22 * max(alongHi, 0.0) + 0.6 * scale;
  float crossWind = p.y * p.y / (widthHi * widthHi);
  float smokeMax = alongHi > -0.004 ? 0.2 * hv * exp(-alongLo / (0.02 + 0.04 * heat) - crossWind) : 0.0;
  float sparkMax = alongHi > -0.003 ? 1.4 * hv * exp(-alongLo / (0.008 + 0.02 * heat) - crossWind / 0.6) : 0.0;
  if (d > coreR && smokeMax < EPS && sparkMax < EPS) discard;

  // A ragged edge rather than a circle.
  float edge = scale * (1.0 + 0.6 * (fbm(vec3(q * 1.8, seed)) - 0.5));
  float scar = scarSize > 0.0 ? smoothstep(edge, edge * 0.82, d) : 0.0;
  float past = d - edge;
  bool atFront = abs(past) < frontReach;
  bool inFlames = hv * 1.1 > EPS && past > 0.0 && past < flameReach;
  float front = 0.0;
  float flames = 0.0;
  float tip = 0.0;
  if (atFront || inFlames) {
    // Only stretches of the perimeter burn at a time, wandering slowly round it.
    float burning = smoothstep(0.38, 0.62, fbm(vec3(q * 1.3, uTime * 0.12 + seed * 2.0)));
    if (atFront) {
      float flicker = 0.5 + 1.0 * noise(vec3(q * 4.0, uTime * 2.4 + seed));
      front = exp(-pow(past / frontWidth, 2.0)) * heat * flicker * (0.25 + 0.75 * burning);
    }
    if (inFlames) {
      // Flames lick outward past the edge in ragged tongues that run out from the fire, yellow at the root, red at
      // the tip.
      vec2 dir = p / max(d, 1e-5);
      float tongues = fbm(vec3(dir * 2.5 + seed, past / scale * 3.0 - uTime * 3.2));
      float reach = (scale * (0.25 + 0.9 * heat) + 0.003) * tongues * (0.3 + 0.7 * burning);
      tip = clamp(past / max(reach, 1e-5), 0.0, 1.0);
      flames = (1.0 - tip) * (1.0 - tip) * heat * smoothstep(0.25, 0.6, tongues);
    }
  }
  float embers = scar > 0.0 && hv * 0.8 > EPS
    ? scar * heat * smoothstep(0.6, 0.85, fbm(vec3(q * 5.0, uTime * 0.9 + seed)))
    : 0.0;
  float halo = heat * 0.16 * exp(-d * d / pow(haloWidth, 2.0));
  float glow = front + 0.9 * embers + halo;
  vec3 light = fireLight(0.2 + 0.8 * min(1.0, front + embers)) * glow * 0.85
    + fireLight(1.0 - 0.8 * tip) * flames * 1.1;
  // Smoke streams east (+x), widening downwind.
  float along = p.x - edge * 0.5;
  float width = 0.003 + 0.22 * max(along, 0.0) + 0.6 * scale;
  float plume = smoothstep(-0.004, 0.012, along) * exp(-max(along, 0.0) / (0.02 + 0.04 * heat))
    * exp(-p.y * p.y / (width * width));
  float smoke = 0.0;
  if (0.2 * hv * plume > EPS) {
    float puffs = fbm(vec3(p.x * 70.0 - uTime * 0.5, p.y * 70.0, seed + 3.0));
    smoke = 0.2 * heat * plume * smoothstep(0.3, 0.8, puffs);
    // The smoke's underside lit by the fire, near it.
    light += vec3(1.0, 0.42, 0.12) * smoke * heat * 0.9 * exp(-max(along, 0.0) / 0.006);
  }
  // Sparks carried east on the wind, twinkling out as they go.
  vec2 drift = (p - vec2(uTime * 0.007, 0.0)) * 130.0;
  vec2 cell = floor(drift);
  float h = hash(vec3(cell, seed));
  float spot = smoothstep(0.5, 0.0, length(fract(drift) - 0.5));
  float sparkZone = smoothstep(-0.003, 0.003, along) * exp(-max(along, 0.0) / (0.008 + 0.02 * heat))
    * exp(-p.y * p.y / (width * width * 0.6));
  float sparks = step(0.95, h) * spot * sparkZone * heat * (0.4 + 0.6 * sin(uTime * 9.0 + h * 60.0));
  light += fireLight(0.85) * max(sparks, 0.0) * 1.4;
  gl_FragColor = compose(0.8 * scar, smoke, light, d, visible);
  #include <colorspace_fragment>
}`;

function capMaterial(cap, time) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: time, uCap: { value: cap } },
    vertexShader,
    fragmentShader: fireShader,
    transparent: true,
    depthWrite: false,
    // Drawn over the map tiles, which bulge above the sphere (as the storm is); hidden on the far side instead.
    depthTest: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });
}

const ease = (value, target, dt, tau) => target + (value - target) * Math.exp(-dt / tau);
const seedOf = (text) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7) / 9.7;
const scarOf = (areaKm2) => (areaKm2 > 0 ? (EXAGGERATION * Math.sqrt(areaKm2 / Math.PI)) / EARTH_RADIUS_KM : 0);
// The smallest cap that holds a fire's scar, the flames past its edge and, when it burns hot, its smoke.
const capOf = (scar, heat) => CAP_SIZES.find((cap) => cap >= 2.6 * scar + 0.012 + 0.12 * heat) ?? FIRE_CAP;

/**
 * @typedef {Object} FireEntry
 * @property {number} cap the cap size it is drawn with
 * @property {number[]} matrix turns the cap to sit where the fire burned
 * @property {THREE.Vector3} up
 * @property {number} seed
 * @property {boolean} shown
 * @property {number} scar shown now, eased toward `target.scar`
 * @property {number} heat
 * @property {number} fade 0 to 1, eased toward `target.fade`
 * @property {{ scar: number, heat: number, fade: number }} target
 * @property {number} [igniteAt] Track 1: the track time (s) the fire is lit
 * @property {number} [peakHeat] Track 1: how hot it flares
 */

/**
 * @param {{ globe: Object }} view
 */
export function createFiresLayer({ globe }) {
  const radius = globe.getGlobeRadius() * (1 + ALTITUDE);
  const group = new THREE.Group();
  group.renderOrder = 1;
  globe.scene().add(group);

  // A cap (centred on +Y) turned to sit on lat/lon with its +X pointing east.
  function fireAt(fireid, lat, lon, cap) {
    const at = (la, lo) => {
      const { x, y, z } = globe.getCoords(la, lo, 0);
      return new THREE.Vector3(x, y, z);
    };
    const up = at(lat, lon).normalize();
    const east = at(lat, lon + 0.5).sub(at(lat, lon)).normalize();
    east.sub(up.clone().multiplyScalar(east.dot(up))).normalize();
    const south = new THREE.Vector3().crossVectors(east, up);
    const matrix = new THREE.Matrix4().makeBasis(east, up, south).elements;
    return { cap, matrix, up, seed: seedOf(fireid), shown: false };
  }

  const time = { value: 0 };
  // One instanced mesh per cap size, its instances refilled each frame with the fires drawn.
  const batches = new Map(
    CAP_SIZES.map((cap) => {
      const shape = new THREE.SphereGeometry(radius, Math.round(64 * Math.sqrt(cap / FIRE_CAP)) + 8, 24, 0, 2 * Math.PI, 0, cap);
      return [cap, { cap, shape, material: capMaterial(cap, time), mesh: null, count: 0 }];
    }),
  );

  // Room for at least `size` fires, keeping those already written.
  function grow(batch, size) {
    const old = batch.mesh;
    const capacity = Math.max(64, 2 ** Math.ceil(Math.log2(size)));
    const geometry = batch.shape.clone();
    const attribute = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    attribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('aFire', attribute);
    const mesh = new THREE.InstancedMesh(geometry, batch.material, capacity);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.renderOrder = 1;
    if (old) {
      mesh.instanceMatrix.array.set(old.instanceMatrix.array);
      attribute.array.set(old.geometry.getAttribute('aFire').array);
      group.remove(old);
      old.geometry.dispose();
      old.dispose();
    }
    group.add(mesh);
    batch.mesh = mesh;
  }

  function draw(fire, scar, heat, visible) {
    const batch = batches.get(fire.cap);
    if (!batch.mesh || batch.count === batch.mesh.instanceMatrix.count) grow(batch, batch.count + 1);
    const i = batch.count++;
    batch.mesh.instanceMatrix.array.set(fire.matrix, i * 16);
    const values = batch.mesh.geometry.getAttribute('aFire').array;
    values[i * 4] = scar;
    values[i * 4 + 1] = heat;
    values[i * 4 + 2] = visible;
    values[i * 4 + 3] = fire.seed;
  }

  function beginFrame() {
    for (const batch of batches.values()) batch.count = 0;
  }

  function endFrame() {
    for (const batch of batches.values()) {
      if (!batch.mesh) continue;
      batch.mesh.count = batch.count;
      batch.mesh.visible = batch.count > 0;
      batch.mesh.instanceMatrix.needsUpdate = true;
      batch.mesh.geometry.getAttribute('aFire').needsUpdate = true;
    }
  }

  /** Track 2's fires by fireid; they stay all season. @type {Map<string, FireEntry>} */
  const seasonFires = new Map();
  /** Track 1's fires of the year shown, and of the year before while they fade. @type {Set<FireEntry>} */
  const yearFires = new Set();
  let shownYear = null;
  // Track 2: the time constant each day's change eases in with.
  let dayEaseSec = 0;
  // Track 1: the track's clock (s), so each fire lights when its pluck sounds, through seeks and pauses.
  let trackClock = () => 0;

  function seasonFireOf(fire) {
    if (!seasonFires.has(fire.fireid)) {
      seasonFires.set(fire.fireid, {
        ...fireAt(fire.fireid, fire.lat, fire.lon, FIRE_CAP),
        scar: 0,
        heat: 0,
        fade: 1,
        target: { scar: 0, heat: 0, fade: 1 },
      });
    }
    return seasonFires.get(fire.fireid);
  }

  let mode = null;
  let frame = null;
  let lastNow = null;

  // Eases every shown fire toward its target and fades it on the far side of the globe.
  function animate(now) {
    const dt = lastNow === null ? 0 : Math.min(MAX_FRAME_SEC, (now - lastNow) / 1000);
    lastNow = now;
    const camera = globe.camera().position.clone().normalize();
    const seconds = now / 1000;
    time.value = seconds;
    beginFrame();

    // A fire on the far side, or faded out, is not drawn at all.
    const drawShown = (fire) => {
      const visible = THREE.MathUtils.smoothstep(fire.up.dot(camera), 0.05, 0.25) * fire.fade;
      if (visible > 0) draw(fire, fire.scar, fire.heat, visible);
    };

    for (const fire of seasonFires.values()) {
      if (!fire.shown) continue;
      fire.scar = ease(fire.scar, fire.target.scar, dt, dayEaseSec);
      fire.heat = ease(fire.heat, fire.target.heat, dt, dayEaseSec);
      drawShown(fire);
    }

    for (const fire of yearFires) {
      fire.fade = ease(fire.fade, fire.target.fade, dt, EASE_SEC.fade);
      if (fire.target.fade === 0 && fire.fade < 0.01) {
        yearFires.delete(fire);
        continue;
      }
      const lit = trackClock() - fire.igniteAt;
      fire.heat = lit < 0 ? 0 : fire.peakHeat * (1 - Math.exp(-lit / FLARE_SEC)) * Math.exp(-lit / BURN_SEC);
      drawShown(fire);
    }
    endFrame();
    frame = requestAnimationFrame(animate);
  }

  function start() {
    if (frame === null) frame = requestAnimationFrame(animate);
  }

  function hide() {
    mode = null;
    seasonFires.clear();
    yearFires.clear();
    beginFrame();
    endFrame();
    shownYear = null;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    lastNow = null;
  }

  // Track 1: the year's scars show in full at once, on its first beat; its fires flare through its bar (`spanSec` from
  // `startSec`, track time), each as far into it as it started into its year. The fires still shown from another year
  // fade out.
  function showYear(year, fires, startSec, spanSec) {
    if (year === shownYear) return;
    shownYear = year;
    for (const fire of yearFires) fire.target.fade = 0;
    for (const data of fires) {
      const scar = scarOf(data.areaKm2);
      const peakHeat = Math.min(1, Math.sqrt(data.areaKm2 / FULL_HEAT_KM2));
      yearFires.add({
        ...fireAt(data.fireid, data.lat, data.lon, capOf(scar, peakHeat)),
        shown: true,
        scar,
        heat: 0,
        fade: 1,
        target: { scar, heat: 0, fade: 1 },
        igniteAt: startSec + data.yearShare * spanSec,
        peakHeat,
      });
    }
  }

  // Track 2: each fire as large as it has grown by `day`, and as hot as it burned that day.
  function showDay(day, fires) {
    for (const data of fires) {
      const fire = seasonFireOf(data);
      fire.target.scar = scarOf(data.areaKm2[day]);
      fire.target.heat = fireHeat(data.newPixels[day]);
      const shown = fire.target.scar > 0;
      if (shown && !fire.shown) {
        fire.scar = fire.target.scar * 0.3;
        fire.heat = 0;
      }
      fire.shown = shown;
    }
  }

  /**
   * @param {null | {
   *   mode: 'annual',
   *   year: number,
   *   fires: import('../../tracks/domain/wildfire-series.js').WildfireYearFire[],
   *   startSec: number,
   *   spanSec: number,
   *   clock: () => number,
   * } | {
   *   mode: 'season',
   *   day: number,
   *   fires: import('../../tracks/domain/wildfire-series.js').WildfireFire[],
   *   beatSec: number,
   * }} next null takes the fires off the globe. `year` names the year shown (a new one lights its fires anew);
   *   its fires light through its bar, `spanSec` from `startSec` on the track's `clock` (s). `beatSec` is how long a
   *   day lasts.
   */
  function show(next) {
    if (!next) {
      hide();
      return;
    }
    if (next.mode !== mode) {
      hide();
      mode = next.mode;
    }
    if (next.mode === 'annual') {
      trackClock = next.clock;
      showYear(next.year, next.fires, next.startSec, next.spanSec);
    } else {
      dayEaseSec = next.beatSec * DAY_EASE_SHARE;
      showDay(next.day, next.fires);
    }
    start();
  }

  return { show };
}
