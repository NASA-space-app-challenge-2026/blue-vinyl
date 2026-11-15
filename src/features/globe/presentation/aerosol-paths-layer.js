// The particles of an aerosol track on the globe (see tracks/domain/aerosol-paths.js), drawn as the storms of Mirror
// Storms are: each one a comet tail behind it, wide and bright at its head and thinning to nothing, and the path it has
// gone, faint, all in its particle type's own colour (EIC's, as the shell). The tails of all the track's particles are
// one mesh and the paths another, so a hundred of them cost about as much as one. The lead particle (`hero`) has a
// wider, longer tail, its path is white, and it is marked: its type's shape (PARTICLE_SHAPE) in its colour with a white
// edge.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js';
import { PARTICLE_SHAPE, TAIL_STEPS } from '../../tracks/domain/aerosol-paths.js';
import { traceShape } from './particle-shape.js';

// EIC's colours of the four particle types (COLOR of notebooks/aerosol_album.ipynb).
const COLOR = Object.freeze({ seaSalt: '#408cff', dust: '#ff59bf', smoke: '#ff731a', sulfate: '#4cff59' });
// Lifted a little off the surface, as the comet tails are.
const ALTITUDE = 0.003;
// The lead particle's marker, in pixels across.
const MARKER_PX = 15;
// The opacity of a path, and of a tail at its head.
const ALPHA = Object.freeze({ path: 0.15, heroPath: 0.6, head: 0.9 });
// A tail's width at its head in pixels. From the head it thins as t^widthPow and fades as t^alphaPow, t = 1 at the head
// and 0 at the tail's end (as comet-trail.js).
const TAIL_WIDTH_PX = Object.freeze({ crowd: 4, hero: 8 });
const TAIL_SHAPE = Object.freeze({ widthPow: 0.6, alphaPow: 1.6 });

const lineVertex = `
attribute float alpha;
attribute float white;
varying float vAlpha;
varying float vWhite;
void main() {
  vAlpha = alpha;
  vWhite = white;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const lineFragment = `
uniform vec3 color;
varying float vAlpha;
varying float vWhite;
void main() {
  gl_FragColor = vec4(mix(color, vec3(1.0), vWhite), vAlpha);
  #include <colorspace_fragment>
}`;
// A tail is a ribbon across the path, its width held in pixels by the shader whatever the camera's distance: the vertex
// is pushed `across` * `halfPx` pixels along `side`, a world-space direction across the path.
const tailVertex = `
attribute vec3 side;
attribute float across;
attribute float halfPx;
attribute float alpha;
uniform float tanHalfFov;
uniform float viewHeightPx;
varying float vAlpha;
varying float vAcross;
void main() {
  vAlpha = alpha;
  vAcross = across;
  vec4 centre = modelViewMatrix * vec4(position, 1.0);
  float unitsPerPx = 2.0 * -centre.z * tanHalfFov / viewHeightPx;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position + side * across * halfPx * unitsPerPx, 1.0);
}`;
// Soft edges across the ribbon, a whiter core toward the head.
const tailFragment = `
uniform vec3 color;
varying float vAlpha;
varying float vAcross;
void main() {
  float edge = 1.0 - abs(vAcross);
  float core = pow(edge, 8.0) * vAlpha;
  gl_FragColor = vec4(mix(color, vec3(1.0), 0.5 * core), vAlpha * edge * edge);
  #include <colorspace_fragment>
}`;

/**
 * The particle type's shape filled with `color` and edged in white, with a thin dark halo, so it reads on dark and on
 * bright air.
 */
function markerTexture(color, shape) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 5;
  for (const [r, fill] of [[27, '#ffffff'], [17, color]]) {
    ctx.fillStyle = fill;
    traceShape(ctx, shape, 32, 32, r);
    ctx.fill();
    ctx.shadowColor = 'transparent';
  }
  return new THREE.CanvasTexture(canvas);
}

/**
 * @param {{ globe: Object, unitsPerPx: () => number }} view
 */
export function createAerosolPathsLayer(view) {
  const { globe } = view;
  /** @type {import('../../tracks/domain/aerosol-paths.js').AerosolParticlePath[] | null} */
  let shownPaths = null;
  // Built for one set of paths: where each particle is at every step (x, y, z), the tail and path meshes, the marker, and
  // each particle's tail: the steps it covers and where its points start in the tail mesh.
  let xyz = [];
  let tails = null;
  let segments = null;
  let marker = null;
  let tailOf = [];

  function clear() {
    for (const object of [tails, segments, marker]) {
      if (!object) continue;
      globe.scene().remove(object);
      object.geometry?.dispose();
      object.material.map?.dispose();
      object.material.dispose();
    }
    tails = segments = marker = null;
    xyz = [];
    tailOf = [];
    shownPaths = null;
  }

  function build(paths) {
    const color = COLOR[paths[0].particle];
    xyz = paths.map(({ path }) => {
      const points = new Float32Array(path.length * 3);
      path.forEach(([lat, lng], k) => {
        const { x, y, z } = globe.getCoords(lat, lng, ALTITUDE);
        points.set([x, y, z], 3 * k);
      });
      return points;
    });
    const maxSegments = paths.reduce((sum, { path }) => sum + path.length, 0);
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxSegments * 6), 3));
    lineGeometry.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(maxSegments * 2), 1));
    lineGeometry.setAttribute('white', new THREE.BufferAttribute(new Float32Array(maxSegments * 2), 1));
    segments = new THREE.LineSegments(
      lineGeometry,
      new THREE.ShaderMaterial({ uniforms: { color: { value: new THREE.Color(color) } }, vertexShader: lineVertex, fragmentShader: lineFragment, transparent: true, depthWrite: false }),
    );
    segments.frustumCulled = false;
    // The tails: one ribbon of TAIL_STEPS + 1 points a particle, two vertices a point.
    let points = 0;
    tailOf = paths.map(({ hero }) => {
      const steps = hero ? TAIL_STEPS.hero : TAIL_STEPS.crowd;
      const tail = { steps, first: points, widthPx: hero ? TAIL_WIDTH_PX.hero : TAIL_WIDTH_PX.crowd };
      points += steps + 1;
      return tail;
    });
    const vertices = points * 2;
    const tailGeometry = new THREE.BufferGeometry();
    tailGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices * 3), 3));
    tailGeometry.setAttribute('side', new THREE.BufferAttribute(new Float32Array(vertices * 3), 3));
    tailGeometry.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(vertices), 1));
    const across = new Float32Array(vertices);
    const index = [];
    for (const { steps, first } of tailOf) {
      for (let j = 0; j <= steps; j++) {
        const v = 2 * (first + j);
        across[v] = -1;
        across[v + 1] = 1;
        if (j < steps) index.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
      }
    }
    tailGeometry.setAttribute('across', new THREE.BufferAttribute(across, 1));
    tailGeometry.setAttribute('halfPx', new THREE.BufferAttribute(new Float32Array(vertices), 1));
    tailGeometry.setIndex(index);
    tails = new THREE.Mesh(
      tailGeometry,
      new THREE.ShaderMaterial({
        uniforms: { color: { value: new THREE.Color(color) }, tanHalfFov: { value: 1 }, viewHeightPx: { value: 1 } },
        vertexShader: tailVertex,
        fragmentShader: tailFragment,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    tails.frustumCulled = false;
    marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: markerTexture(color, PARTICLE_SHAPE[paths[0].particle]), depthWrite: false, depthTest: false, transparent: true, sizeAttenuation: false }));
    marker.renderOrder = 4;
    marker.visible = false;
    globe.scene().add(tails, segments, marker);
  }

  const lerp3 = (points, at, out) => {
    const i = Math.min(Math.floor(at), points.length / 3 - 2);
    const f = at - i;
    for (let c = 0; c < 3; c++) out[c] = points[3 * i + c] + (points[3 * i + 3 + c] - points[3 * i + c]) * f;
  };

  /**
   * @param {import('../../tracks/domain/aerosol-paths.js').AerosolParticlePath[] | null} paths
   * @param {number} step the track's time in steps
   */
  function render(paths, step) {
    if (!paths || paths.length === 0) {
      clear();
      return;
    }
    if (paths !== shownPaths) {
      clear();
      shownPaths = paths;
      build(paths);
    }
    // The track's particles and paths are drawn whatever the particle toggles say: they switch only the air.
    marker.visible = false;

    const segPos = segments.geometry.attributes.position;
    const segAlpha = segments.geometry.attributes.alpha;
    const segWhite = segments.geometry.attributes.white;
    const head = [0, 0, 0];
    const { fov } = globe.camera();
    const viewHeightPx = globe.renderer().domElement.clientHeight;
    tails.material.uniforms.tanHalfFov.value = Math.tan((fov * Math.PI) / 360);
    tails.material.uniforms.viewHeightPx.value = viewHeightPx;
    const tailPos = tails.geometry.attributes.position;
    const tailSide = tails.geometry.attributes.side;
    const tailAlpha = tails.geometry.attributes.alpha;
    const tailHalf = tails.geometry.attributes.halfPx;
    let s = 0;
    paths.forEach((particle, i) => {
      const local = Math.min(step - particle.release, particle.path.length - 1);
      const { steps, first, widthPx } = tailOf[i];
      if (local < 0) {
        for (let j = 0; j <= steps; j++) tailAlpha.setX(2 * (first + j), 0), tailAlpha.setX(2 * (first + j) + 1, 0);
        return;
      }
      const points = xyz[i];
      lerp3(points, local, head);
      // The tail: the path's own points from `steps` steps back to the head, so what is drawn stays where it was drawn and
      // only thins as it ages (t = 1 at the head, 0 `steps` steps behind it); the head is the last point. Points before
      // the release are folded onto the first and not drawn.
      const whole = Math.floor(local);
      const ages = [];
      const spots = [];
      for (let j = 0; j <= steps; j++) {
        const k = whole - steps + 1 + j;
        const spot = [0, 0, 0];
        if (j < steps) {
          for (let c = 0; c < 3; c++) spot[c] = points[3 * Math.max(k, 0) + c];
          ages.push(k < 0 ? Infinity : local - k);
        } else {
          for (let c = 0; c < 3; c++) spot[c] = head[c];
          ages.push(0);
        }
        spots.push(spot);
      }
      for (let j = 0; j <= steps; j++) {
        const here = spots[j];
        const tip = spots[Math.min(j + 1, steps)];
        const back = spots[Math.max(j - 1, 0)];
        // The side across the path: the path's direction crossed with the way up (out from the globe's centre).
        const dx = tip[0] - back[0], dy = tip[1] - back[1], dz = tip[2] - back[2];
        let sx = dy * here[2] - dz * here[1], sy = dz * here[0] - dx * here[2], sz = dx * here[1] - dy * here[0];
        const len = Math.hypot(sx, sy, sz) || 1;
        sx /= len; sy /= len; sz /= len;
        const t = Math.max(0, 1 - ages[j] / steps);
        const v = 2 * (first + j);
        tailPos.setXYZ(v, here[0], here[1], here[2]);
        tailPos.setXYZ(v + 1, here[0], here[1], here[2]);
        tailSide.setXYZ(v, sx, sy, sz);
        tailSide.setXYZ(v + 1, sx, sy, sz);
        tailHalf.setX(v, 0.5 * widthPx * t ** TAIL_SHAPE.widthPow);
        tailHalf.setX(v + 1, 0.5 * widthPx * t ** TAIL_SHAPE.widthPow);
        tailAlpha.setX(v, ALPHA.head * t ** TAIL_SHAPE.alphaPow);
        tailAlpha.setX(v + 1, ALPHA.head * t ** TAIL_SHAPE.alphaPow);
      }
      // The path from the release to the head: segment k joins step k and k + 1, the last ends at the head.
      for (let k = 0; k <= whole; k++) {
        const end = k === whole ? head : [points[3 * k + 3], points[3 * k + 4], points[3 * k + 5]];
        if (k === whole && local === whole) break;
        segPos.setXYZ(2 * s, points[3 * k], points[3 * k + 1], points[3 * k + 2]);
        segPos.setXYZ(2 * s + 1, end[0], end[1], end[2]);
        // The lead's path is white, so it stands apart from the crowd's.
        const alpha = particle.hero ? ALPHA.heroPath : ALPHA.path;
        const white = particle.hero ? 1 : 0;
        segAlpha.setX(2 * s, alpha);
        segAlpha.setX(2 * s + 1, alpha);
        segWhite.setX(2 * s, white);
        segWhite.setX(2 * s + 1, white);
        s++;
      }
      if (particle.hero) {
        const [x, y, z] = head;
        marker.position.set(x, y, z);
        // Not shrunk or grown by the camera's distance, so the marker keeps its size while the camera glides in: its scale is
        // a share of the view's height (twice the tangent of half the field of view, at any distance).
        marker.scale.setScalar((MARKER_PX * 2 * Math.tan((fov * Math.PI) / 360)) / viewHeightPx);
        marker.visible = true;
      }
    });
    segments.geometry.setDrawRange(0, 2 * s);
    segPos.needsUpdate = segAlpha.needsUpdate = segWhite.needsUpdate = true;
    tailPos.needsUpdate = tailSide.needsUpdate = tailAlpha.needsUpdate = tailHalf.needsUpdate = true;
  }

  return { render, hide: clear };
}
