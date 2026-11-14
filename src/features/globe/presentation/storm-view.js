// A hurricane drawn on the globe as it looks from orbit: cloud bands winding anticlockwise into a dense core, an eye
// that clears as the storm strengthens, the whole turning anticlockwise as Atlantic storms do. Its wind (intensityOf)
// grows it, spins it faster (spinOf, the rate the music swirls its ringing drums at), organises its bands and tints its
// thin cloud from sea blue through yellow to magenta. Below it its wind is printed (km/h, in its category's colour).

// The same three.js revision globe.gl@2.46.2 bundles, so the mesh fits its scene.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js';
import { KMH_PER_KT, categoryOf, easeSpin, intensityOf, spinOf } from '../../tracks/domain/storm-track.js';

// Above the ice, so the clouds cover it.
const ALTITUDE = 0.008;
// The storm's radius in radians of arc, calm to full scale: far larger than a real storm's cloud shield, so it reads
// on a globe the size of a record label.
const EXTENT = Object.freeze({ calm: 0.07, full: 0.26 });
// The geometry reaches this far beyond the largest storm, room for its soft edge.
const CAP_MARGIN = 1.4;
// Size eases toward the wind's with this time constant, so a seek grows or shrinks the storm instead of jumping.
const GROW_TAU_SEC = 0.35;
// A frame longer than this (the tab was hidden, the record paused) counts as this long.
const MAX_FRAME_SEC = 0.1;
// The labels' gap (px) below the storm's visible edge, which the soft clouds put at about this share of its extent.
const LABEL_GAP_PX = 4;
const VISIBLE_EXTENT = 0.6;

// The storm's colour by intensity: sea blue, a tropical storm's green, a category 1's yellow, a category 3's orange,
// the red and magenta of categories 4 and 5.
const STORM_RAMP = Object.freeze([
  [0, [143, 227, 255]],
  [0.25, [140, 230, 170]],
  [0.45, [244, 226, 122]],
  [0.65, [242, 154, 74]],
  [0.8, [224, 80, 80]],
  [1, [226, 104, 214]],
]);

/** The CSS colour of a storm at `intensity` (0..1). */
export function stormColor(intensity) {
  const k = STORM_RAMP.findIndex(([at]) => at >= intensity);
  if (k <= 0) return rgb(STORM_RAMP[Math.max(0, k)][1]);
  const [a, from] = STORM_RAMP[k - 1];
  const [b, to] = STORM_RAMP[k];
  const f = (intensity - a) / (b - a);
  return rgb(from.map((c, i) => c + f * (to[i] - c)));
}

function rgb([r, g, b]) {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

const vertexShader = `
varying vec3 vPos;
void main() {
  vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// The cap is centred on +Y. Seen from outside, angles by atan(z, x) run anticlockwise, so adding the spin turns the
// pattern anticlockwise, and bands whose angle grows with log(r) wind anticlockwise inward.
const fragmentShader = `
uniform float uExtent;
uniform float uIntensity;
uniform float uSpin;
uniform float uTime;
uniform float uFade;
uniform vec3 uTint;
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

void main() {
  vec3 n = normalize(vPos);
  float r = acos(clamp(n.y, -1.0, 1.0)) / uExtent;
  if (r > 1.25) discard;
  float organised = smoothstep(0.1, 0.75, uIntensity);
  float twist = mix(0.9, 1.6, organised);
  float lr = log(max(r, 0.04));
  float angle = atan(n.z, n.x) + uSpin - twist * lr;
  vec2 q = r * vec2(cos(angle), sin(angle));
  vec2 warp = vec2(fbm(vec3(q * 1.6, uTime * 0.03)), fbm(vec3(q * 1.6 + 5.2, uTime * 0.03))) - 0.5;
  float clouds = fbm(vec3(q * 2.2 + 1.4 * warp, uTime * 0.05));
  float fibres = fbm(vec3(1.4 * cos(angle), 1.4 * sin(angle), 7.0 * lr + 3.0 * warp.y));
  float arms = smoothstep(0.15, 1.0, 0.5 + 0.5 * cos(3.0 * angle + 5.0 * warp.x));
  float coreRadius = mix(0.28, 0.5, organised);
  float core = smoothstep(coreRadius, coreRadius * 0.35, r + 0.2 * (clouds - 0.5));
  float banded = arms * (0.4 + 0.9 * fibres) * smoothstep(1.1, 0.2, r);
  float shape = mix(smoothstep(1.0, 0.0, r) * (0.3 + 0.9 * clouds), max(core, banded), organised);
  float density = shape * (0.65 + 0.55 * clouds);
  float eye = mix(0.0, 0.07, smoothstep(0.5, 0.85, uIntensity));
  if (eye > 0.0) {
    density *= smoothstep(eye * 0.3, eye * 1.6, r);
    density += 0.35 * exp(-pow((r - eye * 1.7) / (eye * 0.9), 2.0));
  }
  density = clamp(density, 0.0, 1.0);
  float alpha = smoothstep(0.0, 0.8, density) * smoothstep(1.2, 0.8, r);
  vec3 color = mix(uTint, vec3(1.0), smoothstep(0.3, 0.85, density));
  float tops = fbm(vec3(q * 6.0 + warp, uTime * 0.08));
  color *= 0.78 + 0.3 * tops;
  gl_FragColor = vec4(color, alpha * uFade);
  #include <colorspace_fragment>
}`;

/**
 * @typedef {Object} StormView what to draw: the storm's sample and how far it has faded in (0..1)
 * @property {import('../../tracks/domain/storm-track.js').StormSample} sample
 * @property {number} fade
 */

/**
 * @param {{ globe: Object, container: HTMLElement }} view
 */
export function createStormLayer({ globe, container }) {
  const label = document.createElement('div');
  label.className = 'storm-label';
  label.setAttribute('aria-hidden', 'true');
  const wind = document.createElement('span');
  wind.className = 'storm-wind';
  label.append(wind);
  label.hidden = true;
  container.append(label);

  const radius = globe.getGlobeRadius() * (1 + ALTITUDE);
  const geometry = new THREE.SphereGeometry(radius, 128, 48, 0, 2 * Math.PI, 0, EXTENT.full * CAP_MARGIN);
  const uniforms = {
    uExtent: { value: EXTENT.calm },
    uIntensity: { value: 0 },
    uSpin: { value: 0 },
    uTime: { value: 0 },
    uFade: { value: 1 },
    uTint: { value: new THREE.Color() },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    // Map tiles bulge above the sphere between their vertices and would cut holes in the clouds; the storm is drawn
    // over them instead, and hidden whenever it is on the far side.
    depthTest: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 2;
  mesh.visible = false;
  // The labels are placed with the camera the storm is drawn with, so they never lag a frame behind it.
  mesh.onBeforeRender = placeLabel;
  globe.scene().add(mesh);

  // Carried from frame to frame: its spin (radians, anticlockwise from above), spin rate, size and where it is.
  let spin = 0;
  let spinRate = null;
  let extent = null;
  let lastNow = null;
  let centre = null;
  let category = null;

  /** @param {StormView | null} view null takes the storm off the globe */
  function show(view) {
    if (!view) {
      hide();
      return;
    }
    const { sample } = view;
    const now = performance.now();
    const dt = lastNow === null ? 0 : Math.min(MAX_FRAME_SEC, (now - lastNow) / 1000);
    lastNow = now;
    const target = EXTENT.calm + intensityOf(sample.windKt) * (EXTENT.full - EXTENT.calm);
    extent = extent === null || !mesh.visible ? target : target + (extent - target) * Math.exp(-dt / GROW_TAU_SEC);
    const intensity = (extent - EXTENT.calm) / (EXTENT.full - EXTENT.calm);
    spinRate = easeSpin(mesh.visible ? spinRate : null, spinOf(intensity), dt);
    spin += dt * spinRate;
    const { x, y, z } = globe.getCoords(sample.lat, sample.lon, 0);
    const up = new THREE.Vector3(x, y, z).normalize();
    if (up.dot(globe.camera().position) <= 0) {
      hide();
      return;
    }
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    uniforms.uExtent.value = extent;
    uniforms.uIntensity.value = intensity;
    uniforms.uSpin.value = spin;
    uniforms.uTime.value = now / 1000;
    uniforms.uFade.value = view.fade;
    uniforms.uTint.value.set(stormColor(intensity));
    mesh.visible = true;
    centre = { lat: sample.lat, lon: sample.lon };
    showReadings(sample, intensity);
    label.style.opacity = view.fade;
  }

  function hide() {
    mesh.visible = false;
    label.hidden = true;
    lastNow = null;
    category = null;
  }

  // The wind appears in the storm's own colour and, as its category changes, turns to the colour the storm has as that
  // category begins.
  function showReadings(sample, intensity) {
    wind.textContent = `${Math.round(sample.windKt * KMH_PER_KT)} km/h`;
    const nowCategory = categoryOf(sample.windKt);
    if (label.hidden) wind.style.color = stormColor(intensity);
    else if (nowCategory !== category) wind.style.color = stormColor(intensityOf(nowCategory.fromKt));
    category = nowCategory;
    label.hidden = false;
  }

  // Centres the labels just below the storm's edge as drawn now. Moved by a transform, not left/top, so they glide by
  // fractions of a pixel instead of snapping as the globe turns.
  function placeLabel() {
    if (!centre) return;
    const edge = globe.getScreenCoords(centre.lat - (VISIBLE_EXTENT * extent * 180) / Math.PI, centre.lon, ALTITUDE);
    label.style.transform = `translate3d(${edge.x}px, ${edge.y + LABEL_GAP_PX}px, 0) translateX(-50%)`;
  }

  return {
    show,
    /** The storm's colour now, for the glow around the globe; null while none is shown. */
    get color() {
      return mesh.visible ? stormColor((extent - EXTENT.calm) / (EXTENT.full - EXTENT.calm)) : null;
    },
  };
}
