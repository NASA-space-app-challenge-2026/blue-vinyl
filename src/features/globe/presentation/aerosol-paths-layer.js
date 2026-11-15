// The particles of an aerosol track on the globe (see tracks/domain/aerosol-paths.js): each one the path the wind has
// carried it along, faint, with its last TAIL_STEPS brighter toward the head, all in its particle type's own colour
// (EIC's, as the shell). All the track's particles are drawn in one mesh of path segments, so a couple of hundred of
// them cost the same as one. Only the lead particle (`hero`) is marked: a disc in its colour with a white edge.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js';
import { TAIL_STEPS } from '../../tracks/domain/aerosol-paths.js';

// EIC's colours of the four particle types (COLOR of notebooks/aerosol_album.ipynb), and the toggle that switches each.
const PARTICLE = Object.freeze({
  seaSalt: { color: '#408cff', toggle: 'salt' },
  dust: { color: '#ff59bf', toggle: 'dust' },
  smoke: { color: '#ff731a', toggle: 'smoke' },
  sulfate: { color: '#4cff59', toggle: 'sulfate' },
});
// Lifted a little off the surface, as the comet tails are.
const ALTITUDE = 0.003;
// The lead particle's marker, in pixels across.
const MARKER_PX = 30;
// A path's opacity: this far behind the head, and at the head; the tail fades from the one to the other.
const ALPHA = Object.freeze({ path: 0.15, head: 0.9 });

const lineVertex = `
attribute float alpha;
varying float vAlpha;
void main() {
  vAlpha = alpha;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const lineFragment = `
uniform vec3 color;
varying float vAlpha;
void main() {
  gl_FragColor = vec4(color, vAlpha);
  #include <colorspace_fragment>
}`;
/** A disc filled with `color` and edged in white, with a dark halo, so it reads on dark and on bright air. */
function markerTexture(color) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const halo = ctx.createRadialGradient(32, 32, 14, 32, 32, 32);
  halo.addColorStop(0, 'rgba(0,0,0,0.55)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 64, 64);
  ctx.beginPath();
  ctx.arc(32, 32, 21, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();
  return new THREE.CanvasTexture(canvas);
}

/**
 * @param {{ globe: Object, unitsPerPx: () => number }} view
 */
export function createAerosolPathsLayer(view) {
  const { globe } = view;
  /** @type {import('../../tracks/domain/aerosol-paths.js').AerosolParticlePath[] | null} */
  let shownPaths = null;
  let shownStep = 0;
  let toggles = { salt: true, dust: true, smoke: true, sulfate: true };
  // Built for one set of paths: where each particle is at every step (x, y, z), the path mesh and the marker.
  let xyz = [];
  let segments = null;
  let marker = null;

  function clear() {
    for (const object of [segments, marker]) {
      if (!object) continue;
      globe.scene().remove(object);
      object.geometry?.dispose();
      object.material.map?.dispose();
      object.material.dispose();
    }
    segments = marker = null;
    xyz = [];
    shownPaths = null;
  }

  function build(paths) {
    const { color } = PARTICLE[paths[0].particle];
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
    segments = new THREE.LineSegments(
      lineGeometry,
      new THREE.ShaderMaterial({ uniforms: { color: { value: new THREE.Color(color) } }, vertexShader: lineVertex, fragmentShader: lineFragment, transparent: true, depthWrite: false }),
    );
    segments.frustumCulled = false;
    marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: markerTexture(color), depthWrite: false, depthTest: false, transparent: true }));
    marker.renderOrder = 4;
    marker.visible = false;
    globe.scene().add(segments, marker);
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
    shownStep = step;
    const on = toggles[PARTICLE[paths[0].particle].toggle];
    segments.visible = on;
    marker.visible = false;
    if (!on) return;

    const segPos = segments.geometry.attributes.position;
    const segAlpha = segments.geometry.attributes.alpha;
    const head = [0, 0, 0];
    let s = 0;
    paths.forEach((particle, i) => {
      const local = Math.min(step - particle.release, particle.path.length - 1);
      if (local < 0) return;
      const points = xyz[i];
      lerp3(points, local, head);
      // The path from the release to the head: segment k joins step k and k + 1, the last ends at the head.
      const whole = Math.floor(local);
      for (let k = 0; k <= whole; k++) {
        const end = k === whole ? head : [points[3 * k + 3], points[3 * k + 4], points[3 * k + 5]];
        if (k === whole && local === whole) break;
        segPos.setXYZ(2 * s, points[3 * k], points[3 * k + 1], points[3 * k + 2]);
        segPos.setXYZ(2 * s + 1, end[0], end[1], end[2]);
        const behind = (a) => Math.max(0, Math.min(1, 1 - (local - a) / TAIL_STEPS));
        segAlpha.setX(2 * s, ALPHA.path + (ALPHA.head - ALPHA.path) * behind(k));
        segAlpha.setX(2 * s + 1, ALPHA.path + (ALPHA.head - ALPHA.path) * behind(Math.min(k + 1, local)));
        s++;
      }
      if (particle.hero) {
        const [x, y, z] = head;
        marker.position.set(x, y, z);
        marker.scale.setScalar(MARKER_PX * view.unitsPerPx());
        marker.visible = true;
      }
    });
    segments.geometry.setDrawRange(0, 2 * s);
    segPos.needsUpdate = segAlpha.needsUpdate = true;
  }

  /** @param {{ salt: boolean, dust: boolean, smoke: boolean, sulfate: boolean }} next */
  function setToggles(next) {
    toggles = next;
    render(shownPaths, shownStep);
  }

  return { render, setToggles, hide: clear };
}
