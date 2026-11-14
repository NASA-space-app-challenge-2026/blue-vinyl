// Wildfire on the globe as it looks from orbit at night: land burned black, a fire front glowing along its edge with
// flames licking out past it, embers flickering inside and, while it burns hard, smoke lit orange from below and
// sparks streaming east on the westerlies.
//
// Track 1 (Burned Acres): NIFC has no places, so one burn field over the West stands for the nation's burned area:
// the share of it that is burned is in proportion to the year's acres (FIELD_SHARE_MAX in the largest year), with the
// front glowing where the fire has just reached and embers just behind it.
// Track 2 (2020 Fire Season): each large FEDS fire where it burned, its scar as large as the fire has grown (in
// proportion, far larger than life so it reads on a record label), its front and smoke as bright as the VIIRS pixels
// newly burning that day.

// The same three.js revision globe.gl@2.46.2 bundles, so the meshes fit its scene.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js';

// Under the storm's clouds (0.008), above the ice.
const ALTITUDE = 0.006;
// Changes ease in with this time constant, so a new year or day spreads the fire instead of jumping.
const EASE_SEC = Object.freeze({ threshold: 0.45, scar: 0.25, heat: 0.18 });
const MAX_FRAME_SEC = 0.1;

// Track 1's field: its centre over the West and its radius, in radians of arc. It thins out toward the rim, so the
// burn never shows the circle.
const FIELD = Object.freeze({ lat: 41, lon: -110.5, radius: 0.26, seed: 4.2 });
// Share of the field burned in the largest year; other years burn in proportion to their acres.
const FIELD_SHARE_MAX = 0.3;

// Track 2: the scar's radius is EXAGGERATION times a circle of the fire's area; each fire's mesh reaches CAP radians,
// room for its smoke.
const EXAGGERATION = 5;
const EARTH_RADIUS_KM = 6371;
const FIRE_CAP = 0.14;
// Newly burning pixels a day at which a fire burns at full heat.
const FULL_HEAT_PIXELS = 3000;

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
varying vec3 vPos;

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
  return vec4(rgb + light, a) * uVisible;
}
`;

// The cap is centred on +Y with east along +X, so vPos.xz is the place in radians from the centre (east, south).
// fieldValue (here and in JS below) is the land's patchiness: a cell is burned while its value is above uThreshold.
const fieldShader = `
uniform float uRadius;
uniform float uThreshold;
${common}
float fieldValue(vec2 p) {
  float r = length(p) / uRadius;
  return (fbm(vec3(p / uRadius * 6.5, uSeed)) * 0.9 + 0.18 * (1.0 - r)) * smoothstep(1.0, 0.55, r);
}
void main() {
  vec2 p = normalize(vPos).xz;
  if (length(p) > uRadius) discard;
  float v = fieldValue(p);
  float th = uThreshold;
  float burned = smoothstep(th - 0.008, th + 0.008, v);
  float flicker = 0.5 + 1.0 * noise(vec3(p * 300.0, uTime * 2.2));
  float front = exp(-pow((v - th) / 0.014, 2.0)) * step(0.02, v) * flicker * (0.4 + 0.6 * uHeat);
  // Just behind the front the ground still smoulders, with embers; further in it has gone out.
  float recent = burned * smoothstep(th + 0.03, th, v);
  float embers = recent * smoothstep(0.62, 0.85, noise(vec3(p * 380.0, uTime * 0.8))) * (0.4 + 0.6 * uHeat);
  float glow = front + embers + 0.08 * recent * uHeat;
  vec3 light = fireLight(0.2 + 0.8 * min(1.0, front + embers)) * glow * 1.3;
  // The heat's glow on the land just ahead of the front.
  float ahead0 = max(th - v, 0.0);
  light += fireLight(0.35) * (0.1 + 0.25 * uHeat) * exp(-ahead0 / 0.035) * step(0.02, v) * (1.0 - burned);
  // Flames reach out from the front into the land not yet burned, in tongues that run outward and flicker.
  float tongues = fbm(vec3(p * 140.0, uTime * 2.6 + uSeed));
  float ahead = th - v;
  float reach = 0.02 + 0.05 * uHeat * tongues;
  float flames = ahead > 0.0 && v > 0.02 ? pow(1.0 - clamp(ahead / reach, 0.0, 1.0), 2.0) * smoothstep(0.3, 0.65, tongues) : 0.0;
  light += fireLight(1.0 - 0.8 * clamp(ahead / reach, 0.0, 1.0)) * flames * (0.5 + 0.7 * uHeat);
  // Sparks blown east off the fronts.
  vec2 drift = (p - vec2(uTime * 0.007, 0.0)) * 130.0;
  float h = hash(vec3(floor(drift), uSeed));
  float spark = step(0.95, h) * smoothstep(0.5, 0.0, length(fract(drift) - 0.5))
    * exp(-pow((v - th) / 0.08, 2.0)) * uHeat * (0.4 + 0.6 * sin(uTime * 9.0 + h * 60.0));
  light += fireLight(0.85) * max(spark, 0.0) * 1.3;
  gl_FragColor = compose(0.85 * burned, 0.0, light);
  #include <colorspace_fragment>
}`;

// The shader's noise in JS, to find the threshold that burns a given share of the field.
function hash(x, y, z) {
  const f = (v) => v - Math.floor(v);
  x = f(x * 0.3183099 + 0.1) * 17;
  y = f(y * 0.3183099 + 0.1) * 17;
  z = f(z * 0.3183099 + 0.1) * 17;
  return f(x * y * z * (x + y + z));
}
function noise(x, y, z) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const s = (t) => t * t * (3 - 2 * t);
  const fx = s(x - ix);
  const fy = s(y - iy);
  const fz = s(z - iz);
  const h = (a, b, c) => hash(ix + a, iy + b, iz + c);
  const lerp = (a, b, t) => a + (b - a) * t;
  return lerp(
    lerp(lerp(h(0, 0, 0), h(1, 0, 0), fx), lerp(h(0, 1, 0), h(1, 1, 0), fx), fy),
    lerp(lerp(h(0, 0, 1), h(1, 0, 1), fx), lerp(h(0, 1, 1), h(1, 1, 1), fx), fy),
    fz,
  );
}
function fbm(x, y, z) {
  let sum = 0;
  let amp = 0.5;
  for (let i = 0; i < 4; i++) {
    sum += amp * noise(x, y, z);
    x *= 2.03;
    y *= 2.03;
    z *= 2.03;
    amp *= 0.5;
  }
  return sum;
}
function fieldValue(x, y) {
  const r = Math.hypot(x, y) / FIELD.radius;
  const taper = 1 - THREE.MathUtils.smoothstep(r, 0.55, 1);
  return (fbm((x / FIELD.radius) * 6.5, (y / FIELD.radius) * 6.5, FIELD.seed) * 0.9 + 0.18 * (1 - r)) * taper;
}

/** The field's values over its disc, highest first: burning share s of it takes the threshold at index s * length. */
function fieldValues() {
  // Rings of equal area, each with as many samples as its share of the disc.
  const values = [];
  const rings = 100;
  for (let i = 0; i < rings; i++) {
    const r = FIELD.radius * Math.sqrt((i + 0.5) / rings);
    const count = 200;
    for (let j = 0; j < count; j++) {
      const a = (2 * Math.PI * (j + 0.5 * (i % 2))) / count;
      values.push(fieldValue(r * Math.cos(a), r * Math.sin(a)));
    }
  }
  return values.sort((a, b) => b - a);
}

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

  const field = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 160, 48, 0, 2 * Math.PI, 0, FIELD.radius * 1.15),
    capMaterial(fieldShader, { uRadius: { value: FIELD.radius }, uThreshold: { value: 1 } }),
  );
  field.material.uniforms.uSeed.value = FIELD.seed;
  field.renderOrder = 1;
  field.visible = false;
  place(field, FIELD.lat, FIELD.lon);
  group.add(field);
  const fieldTarget = { threshold: 1, heat: 0 };
  // Worked out the first time the field is shown.
  let values = null;
  const thresholdFor = (share) => values[Math.min(values.length - 1, Math.floor(share * values.length))];

  const fireGeometry = new THREE.SphereGeometry(radius, 64, 24, 0, 2 * Math.PI, 0, FIRE_CAP);
  const fireMaterial = capMaterial(fireShader, { uScar: { value: 0 } });
  /** @type {Map<string, { mesh: THREE.Mesh, scar: number, heat: number, target: { scar: number, heat: number } }>} */
  const fires = new Map();

  function fireOf(fire) {
    if (!fires.has(fire.fireid)) {
      const mesh = new THREE.Mesh(fireGeometry, fireMaterial.clone());
      mesh.material.uniforms.uSeed.value = seedOf(fire.fireid);
      mesh.renderOrder = 1;
      mesh.visible = false;
      place(mesh, fire.lat, fire.lon);
      group.add(mesh);
      fires.set(fire.fireid, { mesh, scar: 0, heat: 0, target: { scar: 0, heat: 0 } });
    }
    return fires.get(fire.fireid);
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

    if (field.visible) {
      const u = field.material.uniforms;
      u.uThreshold.value = ease(u.uThreshold.value, fieldTarget.threshold, dt, EASE_SEC.threshold);
      u.uHeat.value = ease(u.uHeat.value, fieldTarget.heat, dt, EASE_SEC.heat);
      u.uTime.value = time;
      u.uVisible.value = facing(field);
    }
    for (const fire of fires.values()) {
      if (!fire.mesh.visible) continue;
      fire.scar = ease(fire.scar, fire.target.scar, dt, EASE_SEC.scar);
      fire.heat = ease(fire.heat, fire.target.heat, dt, EASE_SEC.heat);
      const u = fire.mesh.material.uniforms;
      u.uScar.value = fire.scar;
      u.uHeat.value = fire.heat;
      u.uTime.value = time;
      u.uVisible.value = facing(fire.mesh);
    }
    frame = requestAnimationFrame(animate);
  }

  function start() {
    if (frame === null) frame = requestAnimationFrame(animate);
  }

  function hide() {
    mode = null;
    field.visible = false;
    for (const fire of fires.values()) fire.mesh.visible = false;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    lastNow = null;
  }

  /**
   * @param {null | {
   *   mode: 'annual',
   *   acres: number,
   *   acresMax: number,
   * } | {
   *   mode: 'season',
   *   day: number,
   *   fires: import('../../tracks/domain/wildfire-series.js').WildfireFire[],
   * }} next null takes the fires off the globe
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
      const share = Math.min(1, Math.max(0, next.acres / (next.acresMax || 1)));
      values ??= fieldValues();
      fieldTarget.threshold = thresholdFor(FIELD_SHARE_MAX * share);
      fieldTarget.heat = share;
      if (!field.visible) {
        // Arrives already at its year, rather than burning in from nothing.
        field.material.uniforms.uThreshold.value = fieldTarget.threshold;
        field.visible = true;
      }
    } else {
      for (const data of next.fires) {
        const fire = fireOf(data);
        const areaKm2 = data.areaKm2[next.day];
        fire.target.scar = areaKm2 > 0 ? (EXAGGERATION * Math.sqrt(areaKm2 / Math.PI)) / EARTH_RADIUS_KM : 0;
        fire.target.heat = Math.min(1, Math.sqrt(data.newPixels[next.day] / FULL_HEAT_PIXELS));
        const shown = fire.target.scar > 0;
        if (shown && !fire.mesh.visible) {
          fire.scar = fire.target.scar * 0.3;
          fire.heat = 0;
        }
        fire.mesh.visible = shown;
      }
    }
    start();
  }

  return { show };
}
