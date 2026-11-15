// Wildfire on the globe as it looks from orbit at night: land burned black, a fire front glowing along its edge with
// flames licking out past it, embers flickering inside and, while it burns hard, smoke lit orange from below and
// sparks streaming east on the westerlies.
//
// Track 1 (Burned Acres): each year's large MTBS fires where they burned, lit in the order they started through the
// year's bar: each flares up as large and as hot as its acres, then burns down to its scar, and the year's scars give
// way to the next year's.
// Track 2 (2020 Fire Season): each large FEDS fire where it burned, its scar as large as the fire has grown, its front
// and smoke as bright as the VIIRS pixels newly burning that day.
// In both, a scar is in proportion to its fire's area, far larger than life so it reads on a record label.

// The same three.js revision globe.gl@2.46.2 bundles, so the meshes fit its scene.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js';

// Under the storm's clouds (0.008), above the ice.
const ALTITUDE = 0.006;
// Changes ease in with this time constant, so a new year or day spreads the fire instead of jumping.
const EASE_SEC = Object.freeze({ scar: 0.25, heat: 0.18, fade: 0.2 });
const MAX_FRAME_SEC = 0.1;

// The scar's radius is EXAGGERATION times a circle of the fire's area; each fire's mesh reaches up to FIRE_CAP radians,
// room for its smoke.
const EXAGGERATION = 5;
const EARTH_RADIUS_KM = 6371;
const FIRE_CAP = 0.14;
// Track 1 draws hundreds of fires a year, most of them small, so each gets the smallest of these caps that holds its
// scar, flames and smoke, rather than FIRE_CAP for all.
const CAP_SIZES = Object.freeze([0.03, 0.06, 0.1, FIRE_CAP]);
// Track 2: newly burning pixels a day at which a fire burns at full heat.
const FULL_HEAT_PIXELS = 3000;
// Track 1: a fire of this area (300,000 acres) flares at full heat; heat goes with the square root of area below it.
const FULL_HEAT_KM2 = 1214;
// Track 1: once lit, a fire flares up within FLARE_SEC and burns down with this time constant, leaving its scar.
const FLARE_SEC = 0.05;
const BURN_SEC = 0.35;

const vertexShader = `
varying vec3 vPos;
void main() {
  vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const common = `
uniform float uTime;
uniform float uVisible;
uniform float uHeat;
uniform float uSeed;
uniform float uCap;
varying vec3 vPos;

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
vec4 compose(float charA, float smokeA, vec3 light) {
  vec3 rgb = mix(CHAR, CHAR_WARM, noise(vPos * 0.9)) * charA;
  float a = charA;
  rgb = SMOKE * smokeA + rgb * (1.0 - smokeA);
  a = smokeA + a * (1.0 - smokeA);
  // Faded out before the mesh's rim, so no edge shows where it ends.
  float rim = smoothstep(uCap, uCap * 0.8, length(normalize(vPos).xz));
  return vec4(rgb + light, a) * uVisible * rim;
}
`;

// The cap is centred on +Y with east along +X, so vPos.xz is the place in radians from the centre (east, south).
const fireShader = `
uniform float uScar;
${common}
void main() {
  vec2 p = normalize(vPos).xz;
  float d = length(p);
  float scale = max(uScar, 0.0015);
  vec2 q = p / scale;
  // A ragged edge rather than a circle.
  float edge = scale * (1.0 + 0.6 * (fbm(vec3(q * 1.8, uSeed)) - 0.5));
  float scar = uScar > 0.0 ? smoothstep(edge, edge * 0.82, d) : 0.0;
  float flicker = 0.5 + 1.0 * noise(vec3(q * 4.0, uTime * 2.4 + uSeed));
  // Only stretches of the perimeter burn at a time, wandering slowly round it.
  float burning = smoothstep(0.38, 0.62, fbm(vec3(q * 1.3, uTime * 0.12 + uSeed * 2.0)));
  float front = exp(-pow((d - edge) / (0.22 * scale + 0.0012), 2.0)) * uHeat * flicker * (0.25 + 0.75 * burning);
  // Flames lick outward past the edge in ragged tongues that run out from the fire, yellow at the root, red at the tip.
  vec2 dir = p / max(d, 1e-5);
  float past = d - edge;
  float tongues = fbm(vec3(dir * 2.5 + uSeed, past / scale * 3.0 - uTime * 3.2));
  float reach = (scale * (0.25 + 0.9 * uHeat) + 0.003) * tongues * (0.3 + 0.7 * burning);
  float tip = clamp(past / max(reach, 1e-5), 0.0, 1.0);
  float flames = past > 0.0 ? (1.0 - tip) * (1.0 - tip) * uHeat * smoothstep(0.25, 0.6, tongues) : 0.0;
  float embers = scar * uHeat * smoothstep(0.6, 0.85, fbm(vec3(q * 5.0, uTime * 0.9 + uSeed)));
  float halo = uHeat * 0.16 * exp(-d * d / pow(scale * 1.3 + 0.003, 2.0));
  float glow = front + 0.9 * embers + halo;
  vec3 light = fireLight(0.2 + 0.8 * min(1.0, front + embers)) * glow * 0.85
    + fireLight(1.0 - 0.8 * tip) * flames * 1.1;
  // Smoke streams east (+x), widening downwind.
  float along = p.x - edge * 0.5;
  float width = 0.003 + 0.22 * max(along, 0.0) + 0.6 * scale;
  float plume = smoothstep(-0.004, 0.012, along) * exp(-max(along, 0.0) / (0.02 + 0.04 * uHeat))
    * exp(-p.y * p.y / (width * width));
  float puffs = fbm(vec3(p.x * 70.0 - uTime * 0.5, p.y * 70.0, uSeed + 3.0));
  float smoke = 0.2 * uHeat * plume * smoothstep(0.3, 0.8, puffs);
  // The smoke's underside lit by the fire, near it.
  light += vec3(1.0, 0.42, 0.12) * smoke * uHeat * 0.9 * exp(-max(along, 0.0) / 0.006);
  // Sparks carried east on the wind, twinkling out as they go.
  vec2 drift = (p - vec2(uTime * 0.007, 0.0)) * 130.0;
  vec2 cell = floor(drift);
  float h = hash(vec3(cell, uSeed));
  float spot = smoothstep(0.5, 0.0, length(fract(drift) - 0.5));
  float sparkZone = smoothstep(-0.003, 0.003, along) * exp(-max(along, 0.0) / (0.008 + 0.02 * uHeat))
    * exp(-p.y * p.y / (width * width * 0.6));
  float sparks = step(0.95, h) * spot * sparkZone * uHeat * (0.4 + 0.6 * sin(uTime * 9.0 + h * 60.0));
  light += fireLight(0.85) * max(sparks, 0.0) * 1.4;
  gl_FragColor = compose(0.8 * scar, smoke, light);
  #include <colorspace_fragment>
}`;

function capMaterial(fragmentShader, uniforms) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uVisible: { value: 0 },
      uHeat: { value: 0 },
      uSeed: { value: 0 },
      uCap: { value: FIRE_CAP },
      ...uniforms,
    },
    vertexShader,
    fragmentShader,
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
 * @property {THREE.Mesh} mesh
 * @property {number} scar shown now, eased toward `target.scar`
 * @property {number} heat
 * @property {number} fade 0 to 1, eased toward `target.fade`
 * @property {{ scar: number, heat: number, fade: number }} target
 * @property {number} [igniteAt] Track 1: the time (s) the fire is lit
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

  // Turns a cap (centred on +Y) to sit on lat/lon with its +X pointing east.
  function place(mesh, lat, lon) {
    const at = (la, lo) => {
      const { x, y, z } = globe.getCoords(la, lo, 0);
      return new THREE.Vector3(x, y, z);
    };
    const up = at(lat, lon).normalize();
    const east = at(lat, lon + 0.5).sub(at(lat, lon)).normalize();
    east.sub(up.clone().multiplyScalar(east.dot(up))).normalize();
    const south = new THREE.Vector3().crossVectors(east, up);
    mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(east, up, south));
    mesh.userData.up = up;
  }

  const geometries = new Map(
    CAP_SIZES.map((cap) => [cap, new THREE.SphereGeometry(radius, Math.round(64 * Math.sqrt(cap / FIRE_CAP)) + 8, 24, 0, 2 * Math.PI, 0, cap)]),
  );
  const fireMaterial = capMaterial(fireShader, { uScar: { value: 0 } });
  // Meshes no fire uses now, kept for the next ones: Track 1 shows a new year's hundreds of fires every bar.
  const spare = [];

  function takeMesh(fireid, lat, lon, cap) {
    const mesh = spare.pop() ?? new THREE.Mesh(geometries.get(FIRE_CAP), fireMaterial.clone());
    mesh.geometry = geometries.get(cap);
    mesh.material.uniforms.uCap.value = cap;
    mesh.material.uniforms.uSeed.value = seedOf(fireid);
    mesh.renderOrder = 1;
    mesh.visible = false;
    place(mesh, lat, lon);
    group.add(mesh);
    return mesh;
  }

  function release(entry) {
    entry.mesh.visible = false;
    group.remove(entry.mesh);
    spare.push(entry.mesh);
  }

  /** Track 2's fires by fireid; they stay all season. @type {Map<string, FireEntry>} */
  const seasonFires = new Map();
  /** Track 1's fires of the year shown, and of the year before while they fade. @type {Set<FireEntry>} */
  const yearFires = new Set();
  let shownYear = null;

  function seasonFireOf(fire) {
    if (!seasonFires.has(fire.fireid)) {
      seasonFires.set(fire.fireid, {
        mesh: takeMesh(fire.fireid, fire.lat, fire.lon, FIRE_CAP),
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
    const facing = (mesh) => THREE.MathUtils.smoothstep(mesh.userData.up.dot(camera), 0.05, 0.25);
    const time = now / 1000;

    const draw = (fire) => {
      const u = fire.mesh.material.uniforms;
      u.uScar.value = fire.scar;
      u.uHeat.value = fire.heat;
      u.uTime.value = time;
      u.uVisible.value = facing(fire.mesh) * fire.fade;
    };

    for (const fire of seasonFires.values()) {
      if (!fire.mesh.visible) continue;
      fire.scar = ease(fire.scar, fire.target.scar, dt, EASE_SEC.scar);
      fire.heat = ease(fire.heat, fire.target.heat, dt, EASE_SEC.heat);
      draw(fire);
    }

    for (const fire of yearFires) {
      fire.fade = ease(fire.fade, fire.target.fade, dt, EASE_SEC.fade);
      if (fire.target.fade === 0 && fire.fade < 0.01) {
        release(fire);
        yearFires.delete(fire);
        continue;
      }
      const lit = time - fire.igniteAt;
      if (lit < 0) {
        fire.mesh.visible = false;
        continue;
      }
      if (!fire.mesh.visible) {
        fire.mesh.visible = true;
        fire.scar = fire.target.scar * 0.3;
      }
      fire.scar = ease(fire.scar, fire.target.scar, dt, EASE_SEC.scar);
      fire.heat = fire.peakHeat * (1 - Math.exp(-lit / FLARE_SEC)) * Math.exp(-lit / BURN_SEC);
      draw(fire);
    }
    frame = requestAnimationFrame(animate);
  }

  function start() {
    if (frame === null) frame = requestAnimationFrame(animate);
  }

  function hide() {
    mode = null;
    for (const fire of seasonFires.values()) release(fire);
    seasonFires.clear();
    for (const fire of yearFires) release(fire);
    yearFires.clear();
    shownYear = null;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    lastNow = null;
  }

  // Track 1: the year's fires are lit through the next `spanSec`, each as far into it as it started into its year;
  // the fires still shown from another year fade out.
  function showYear(year, fires, spanSec) {
    if (year === shownYear) return;
    shownYear = year;
    for (const fire of yearFires) fire.target.fade = 0;
    const now = performance.now() / 1000;
    for (const data of fires) {
      const scar = scarOf(data.areaKm2);
      const peakHeat = Math.min(1, Math.sqrt(data.areaKm2 / FULL_HEAT_KM2));
      yearFires.add({
        mesh: takeMesh(data.fireid, data.lat, data.lon, capOf(scar, peakHeat)),
        scar: 0,
        heat: 0,
        fade: 1,
        target: { scar, heat: 0, fade: 1 },
        igniteAt: now + data.yearShare * spanSec,
        peakHeat,
      });
    }
  }

  // Track 2: each fire as large as it has grown by `day`, and as hot as it burned that day.
  function showDay(day, fires) {
    for (const data of fires) {
      const fire = seasonFireOf(data);
      fire.target.scar = scarOf(data.areaKm2[day]);
      fire.target.heat = Math.min(1, Math.sqrt(data.newPixels[day] / FULL_HEAT_PIXELS));
      const shown = fire.target.scar > 0;
      if (shown && !fire.mesh.visible) {
        fire.scar = fire.target.scar * 0.3;
        fire.heat = 0;
      }
      fire.mesh.visible = shown;
    }
  }

  /**
   * @param {null | {
   *   mode: 'annual',
   *   year: number,
   *   fires: import('../../tracks/domain/wildfire-series.js').WildfireYearFire[],
   *   spanSec: number,
   * } | {
   *   mode: 'season',
   *   day: number,
   *   fires: import('../../tracks/domain/wildfire-series.js').WildfireFire[],
   * }} next null takes the fires off the globe. `year` names the year shown (a new one lights its fires anew) and
   *   `spanSec` is how long its fires take to light, its bar.
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
    if (next.mode === 'annual') showYear(next.year, next.fires, next.spanSec);
    else showDay(next.day, next.fires);
    start();
  }

  return { show };
}
