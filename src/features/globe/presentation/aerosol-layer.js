// Renders 3-hourly atmospheric aerosol distributions as a shell above the globe surface, light on dark as EIC's picture.
// Encoded frames (PNG, 576x722) hold what notebooks/aerosol_album.ipynb section "frame_png" wrote: in the top half the
// log-encoded AOD of dust, sulfate and sea salt (R, G, B), in the bottom half that of smoke (R) and the east and north
// speed of the particles (G, B), each half north up.
// The shader decodes the AOD back to its real value, moves it along the particles' own flow between two frames, and
// colours it as the notebook's own `composite` does (EIC's colours and log scale), with nothing added: no gain on any
// particle type, no tone curve of its own.
// Each point of the shell finds its latitude and longitude from globe.gl's own axes (as the lightning sky does), not
// from the sphere's texture coordinates, which globe.gl's globe is turned against: the data lands where it belongs.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js';

import { EIC_AOD, FRAME } from '../../tracks/domain/aerosol-frame.js';

const ALTITUDE = 0.005;

// EIC's colouring (AOD_LO, AOD_HI, COLOR and `composite` of the notebook).
const EIC = Object.freeze({
  aodLo: EIC_AOD.lo,
  aodHi: EIC_AOD.hi,
  gamma: 1.3,
  exposure: 1.6,
  salt: [0.25, 0.55, 1.0],
  dust: [1.0, 0.35, 0.75],
  smoke: [1.0, 0.45, 0.1],
  sulfate: [0.3, 1.0, 0.35],
});
// The time between two frames, and the length of a degree of latitude.
const FRAME_SEC = 3 * 3600;
const METERS_PER_DEG = 111320;

const f = (n) => Number(n).toFixed(8);
const vec3 = (c) => `vec3(${c.map(f).join(', ')})`;

const vertexShader = `
varying vec3 vPos;
void main() {
  vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform sampler2D uFrame0;
uniform sampler2D uFrame1;
uniform float uMix;
uniform float uEnableSalt;
uniform float uEnableDust;
uniform float uEnableSmoke;
uniform float uEnableSulf;
uniform vec3 uNorth;
uniform vec3 uLon0;
uniform vec3 uLon90;
varying vec3 vPos;

const int COLS = ${FRAME.cols};
const int ROWS = ${FRAME.rows};
const float STEP_LAT = ${f(FRAME.stepLatDeg)};
const float STEP_LON = ${f(FRAME.stepLonDeg)};
const float FIRST_LON = ${f(FRAME.firstLonDeg)};
const float ENC_LO = ${f(FRAME.aodLo)};
const float ENC_HI = ${f(FRAME.aodHi)};
const float ENC_SPEED = ${f(FRAME.speedMax)};
const float EIC_LO = ${f(EIC.aodLo)};
const float EIC_HI = ${f(EIC.aodHi)};
const float GAMMA = ${f(EIC.gamma)};
const float EXPOSURE = ${f(EIC.exposure)};
const float FRAME_SEC = ${f(FRAME_SEC)};
const float METERS_PER_DEG = ${f(METERS_PER_DEG)};
const vec3 C_SALT = ${vec3(EIC.salt)};
const vec3 C_DUST = ${vec3(EIC.dust)};
const vec3 C_SMOKE = ${vec3(EIC.smoke)};
const vec3 C_SULF = ${vec3(EIC.sulfate)};

float decodeAod(float x) {
  return ENC_LO * pow(ENC_HI / ENC_LO, x);
}

// The AOD of salt, dust, smoke and sulfate at a place, and the particles' flow there (east, north; m/s), read from the
// four cells round it and blended as real values, not as the 8-bit codes.
vec4 field(sampler2D frame, float lat, float lon, out vec2 flow) {
  float gx = (lon - FIRST_LON) / STEP_LON;
  float gy = clamp((lat + 90.0) / STEP_LAT, 0.0, float(ROWS - 1));
  float x0 = floor(gx);
  float y0 = min(floor(gy), float(ROWS - 2));
  float fx = gx - x0;
  float fy = gy - y0;
  vec4 aod = vec4(0.0);
  flow = vec2(0.0);
  for (int j = 0; j < 2; j++) {
    for (int i = 0; i < 2; i++) {
      float w = (i == 0 ? 1.0 - fx : fx) * (j == 0 ? 1.0 - fy : fy);
      int col = int(mod(x0 + float(i), float(COLS)));
      int row = ROWS - 1 - (int(y0) + j); // north up: the top row is 90° N
      vec3 top = texelFetch(frame, ivec2(col, row), 0).rgb;
      vec3 bottom = texelFetch(frame, ivec2(col, ROWS + row), 0).rgb;
      aod += w * vec4(decodeAod(top.b), decodeAod(top.r), decodeAod(bottom.r), decodeAod(top.g));
      flow += w * (bottom.gb * 2.0 - 1.0) * ENC_SPEED;
    }
  }
  return aod;
}

// How far the flow moves the air in one frame, in degrees of longitude and latitude.
vec2 shiftDeg(vec2 flow, float lat) {
  float cosLat = max(cos(radians(lat)), 0.05);
  return vec2(flow.x / cosLat, flow.y) * FRAME_SEC / METERS_PER_DEG;
}

float level(float aod) {
  return clamp(log(max(aod, 1e-6) / EIC_LO) / log(EIC_HI / EIC_LO), 0.0, 1.0);
}

void main() {
  // The frame's coordinates at this point.
  vec3 n = normalize(vPos);
  float lat = degrees(asin(clamp(dot(n, uNorth), -1.0, 1.0)));
  float lon = degrees(atan(dot(n, uLon90), dot(n, uLon0)));
  if (textureSize(uFrame0, 0).y < 2 * ROWS || textureSize(uFrame1, 0).y < 2 * ROWS) discard;

  // Between two frames the air moves with its own flow: the first frame's picture is carried on by the part of the
  // 3 hours gone, the second's is carried back by the part to come.
  vec2 flow0;
  vec2 flow1;
  field(uFrame0, lat, lon, flow0);
  field(uFrame1, lat, lon, flow1);
  vec2 d0 = shiftDeg(flow0, lat) * uMix;
  vec2 d1 = shiftDeg(flow1, lat) * (1.0 - uMix);
  vec2 unused;
  vec4 aod0 = field(uFrame0, lat - d0.y, lon - d0.x, unused);
  vec4 aod1 = field(uFrame1, lat + d1.y, lon + d1.x, unused);
  vec4 aod = mix(aod0, aod1, uMix);

  // EIC's picture: each particle type's colour by its level on the log scale, laid on black.
  vec3 rgb = pow(level(aod.x), GAMMA) * C_SALT * uEnableSalt
           + pow(level(aod.y), GAMMA) * C_DUST * uEnableDust
           + pow(level(aod.z), GAMMA) * C_SMOKE * uEnableSmoke
           + pow(level(aod.w), GAMMA) * C_SULF * uEnableSulf;
  gl_FragColor = vec4(1.0 - exp(-EXPOSURE * rgb), 1.0);
}
`;

/**
 * Creates the aerosol shell layer on the globe.
 *
 * @param {object} globe globe.gl instance
 */
export function createAerosolLayer(globe) {
  const radius = globe.getGlobeRadius();
  const unit = (lat, lng) => new THREE.Vector3().copy(globe.getCoords(lat, lng, 0)).normalize();
  const geometry = new THREE.SphereGeometry(radius * (1 + ALTITUDE), 180, 90);

  const emptyTex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, THREE.RGBAFormat);
  emptyTex.needsUpdate = true;

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uFrame0: { value: emptyTex },
      uFrame1: { value: emptyTex },
      uMix: { value: 0 },
      uEnableSalt: { value: 1.0 },
      uEnableDust: { value: 1.0 },
      uEnableSmoke: { value: 1.0 },
      uEnableSulf: { value: 1.0 },
      uNorth: { value: unit(90, 0) },
      uLon0: { value: unit(0, 0) },
      uLon90: { value: unit(0, 90) },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    // The map's tiles bulge through a shell this close in places; its far side is culled anyway (as the lightning sky).
    depthTest: false,
    side: THREE.FrontSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 1;
  mesh.frustumCulled = false;
  mesh.visible = false;
  globe.scene().add(mesh);

  const loader = new THREE.TextureLoader();
  const textureCache = new Map();

  function getTexture(url) {
    if (!url) return emptyTex;
    if (!textureCache.has(url)) {
      const tex = loader.load(url);
      // The shader reads the codes cell by cell (texelFetch) and blends their values itself; the rows stay as the PNG's.
      tex.minFilter = THREE.NearestFilter;
      tex.magFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      tex.flipY = false;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      textureCache.set(url, tex);
    }
    return textureCache.get(url);
  }

  function render(frames, timeSec, durationSec) {
    if (!frames || frames.length === 0) {
      hide();
      return;
    }

    const count = frames.length;
    const progress = Math.max(0, Math.min(1, timeSec / durationSec));
    const pos = progress * (count - 1);
    const idx0 = Math.floor(pos);
    const idx1 = Math.min(count - 1, idx0 + 1);
    const mix = pos - idx0;

    material.uniforms.uFrame0.value = getTexture(frames[idx0]);
    material.uniforms.uFrame1.value = getTexture(frames[idx1]);
    material.uniforms.uMix.value = mix;
    mesh.visible = true;

    if (idx1 + 1 < count) {
      getTexture(frames[idx1 + 1]);
    }
  }

  function setToggles({ salt = true, dust = true, smoke = true, sulfate = true }) {
    material.uniforms.uEnableSalt.value = salt ? 1.0 : 0.0;
    material.uniforms.uEnableDust.value = dust ? 1.0 : 0.0;
    material.uniforms.uEnableSmoke.value = smoke ? 1.0 : 0.0;
    material.uniforms.uEnableSulf.value = sulfate ? 1.0 : 0.0;
  }

  function hide() {
    mesh.visible = false;
  }

  return {
    render,
    setToggles,
    hide,
  };
}
