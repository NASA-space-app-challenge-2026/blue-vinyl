// A forest track on the globe: the ISS moving along its orbit with its ground track behind it, and the forest it has
// read standing up behind it as columns, as in SVS 4950 and 5095. Each cell of forest grows out of the ground over a
// beat as the ISS passes it, as tall as its canopy (exaggerated) and coloured like 4950: brown and dark green for
// short vegetation, bright green and white for tall. Where the ISS crosses tall forest, the tall columns flash white
// as the celesta rings. Scrubbing back takes the columns down again.

// The same three.js revision globe.gl@2.46.2 bundles, so the mesh fits its scene.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js';
import { TALL_FOREST_M, issAt } from '../../tracks/domain/forest-track.js';
import { createCometTrail } from './comet-trail.js';

// Column footprint, in degrees (the cells are 0.25°), a little under the cell so neighbours read apart.
const CELL_DEG = 0.25;
const FOOTPRINT = 0.85;
// Canopy metres to globe units (the globe's radius is 100): 45 m stands 6 units, about 3.4° of arc.
const UNITS_PER_M = 0.13;
// A column grows over this many steps after the ISS passes it, and a tall one's flash fades with this constant.
const GROW_STEPS = 3;
const FLASH_STEPS = 4;
// A tall column flashes only where the step's mean canopy is tall too (the steps the celesta plays on).
const FLASH_FROM_M = 20;
// The ground track behind the ISS, in steps.
const TRAIL_STEPS = 24;
const ISS_SIZE_PX = 14;

const vertexShader = `
attribute float aStep;
attribute float aHeight;
attribute float aFlash;
uniform float uStep;
varying float vHeight;
varying float vShade;
varying float vFlash;
varying float vGrow;
void main() {
  float grow = smoothstep(aStep, aStep + ${GROW_STEPS.toFixed(1)}, uStep);
  vec3 p = position;
  p.z *= max(aHeight * ${UNITS_PER_M.toFixed(4)} * grow, 0.001);
  vHeight = aHeight;
  vGrow = grow;
  // Flat light: tops full, sides darker, so the columns read as solid.
  vShade = normal.z > 0.5 ? 1.0 : (abs(normal.x) > 0.5 ? 0.72 : 0.6);
  float since = uStep - aStep;
  vFlash = aFlash * step(0.0, since) * exp(-max(since, 0.0) / ${FLASH_STEPS.toFixed(1)});
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0);
}`;

// 4950's ramp: brown, dark green, green, pale green, white over 0..45 m.
const fragmentShader = `
varying float vHeight;
varying float vShade;
varying float vFlash;
varying float vGrow;
vec3 ramp(float h) {
  vec3 c0 = vec3(0.54, 0.42, 0.23);
  vec3 c1 = vec3(0.18, 0.35, 0.16);
  vec3 c2 = vec3(0.31, 0.66, 0.24);
  vec3 c3 = vec3(0.79, 0.95, 0.63);
  vec3 c4 = vec3(1.0);
  if (h < 10.0) return mix(c0, c1, h / 10.0);
  if (h < 22.0) return mix(c1, c2, (h - 10.0) / 12.0);
  if (h < 34.0) return mix(c2, c3, (h - 22.0) / 12.0);
  return mix(c3, c4, clamp((h - 34.0) / 11.0, 0.0, 1.0));
}
void main() {
  if (vGrow < 0.01) discard;
  vec3 color = mix(ramp(vHeight) * vShade, vec3(1.0), vFlash);
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}`;

const ISS_SVG = `<svg viewBox="-10 -10 20 20" width="${ISS_SIZE_PX}" height="${ISS_SIZE_PX}">
  <circle r="8" class="iss-glow"/><circle r="3.6" class="iss-core"/></svg>`;

/**
 * @param {{ globe: Object, unitsPerPx: () => number, setElements: (elements: Object[]) => void }} view
 */
export function createForestLayer(view) {
  let mesh = null;
  let trail = null;
  let iss = null;

  /** Takes the forest off the globe and, for `song`, puts its columns (all still flat) and its ISS on. */
  function reset(song, color) {
    if (mesh) {
      view.globe.scene().remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
      mesh = null;
    }
    trail?.dispose();
    trail = null;
    iss = null;
    if (!song) return;
    mesh = buildColumns(song);
    view.globe.scene().add(mesh);
    trail = createCometTrail(view.globe, color);
    const el = document.createElement('div');
    el.className = 'iss';
    el.innerHTML = ISS_SVG;
    el.style.color = color;
    iss = { el, lat: 0, lng: 0 };
  }

  function buildColumns({ cells, orbit }) {
    const n = cells.step.length;
    const geometry = new THREE.BoxGeometry(1, 1, 1).translate(0, 0, 0.5);
    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms: { uStep: { value: -1 } } });
    const columns = new THREE.InstancedMesh(geometry, material, n);
    const unitsPerDeg = (view.globe.getGlobeRadius() * Math.PI) / 180;
    const width = CELL_DEG * FOOTPRINT * unitsPerDeg;
    const pole = new THREE.Vector3(0, 1, 0);
    const up = new THREE.Vector3();
    const east = new THREE.Vector3();
    const north = new THREE.Vector3();
    const matrix = new THREE.Matrix4();
    const flash = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const { x, y, z } = view.globe.getCoords(cells.lat[i], cells.lon[i], 0);
      up.set(x, y, z).normalize();
      east.crossVectors(pole, up).normalize();
      north.crossVectors(up, east);
      const across = width * Math.cos((cells.lat[i] * Math.PI) / 180);
      matrix.makeBasis(east.multiplyScalar(across), north.multiplyScalar(width), up.clone());
      matrix.setPosition(x, y, z);
      columns.setMatrixAt(i, matrix);
      flash[i] = cells.height[i] >= TALL_FOREST_M && orbit.height[cells.step[i]] >= FLASH_FROM_M ? 1 : 0;
    }
    geometry.setAttribute('aStep', new THREE.InstancedBufferAttribute(Float32Array.from(cells.step), 1));
    geometry.setAttribute('aHeight', new THREE.InstancedBufferAttribute(cells.height, 1));
    geometry.setAttribute('aFlash', new THREE.InstancedBufferAttribute(flash, 1));
    columns.frustumCulled = false;
    return columns;
  }

  /**
   * Draws the song at a fractional `step`: columns grown as far as the ISS has passed, the ISS and its ground track.
   *
   * @param {import('../../tracks/domain/forest-track.js').ForestSong} song
   * @param {number} step
   */
  function render(song, step) {
    if (!mesh) return;
    mesh.material.uniforms.uStep.value = step;
    const head = issAt(song.orbit, step);
    const points = [];
    // Whole steps strictly behind the head, then the head itself, so no two points coincide.
    for (let s = Math.max(0, Math.floor(step) - TRAIL_STEPS); s < step; s++) {
      const p = issAt(song.orbit, s);
      points.push([p.lat, p.lon]);
    }
    points.push([head.lat, head.lon]);
    if (points.length > 1) trail.update(points, view.unitsPerPx());
    else trail.hide();
    iss.lat = head.lat;
    iss.lng = head.lon;
    view.setElements([iss]);
  }

  return { reset, render };
}
