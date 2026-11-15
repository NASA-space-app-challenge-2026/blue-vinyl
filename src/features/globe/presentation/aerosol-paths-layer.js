// The particles of an aerosol track on the globe (at most MAX_PARTICLES), drawn as the storms of Mirror Storms are: each
// one a small marker with a comet tail behind it in its particle type's own colour (EIC's, as the shell), and the path
// it has gone, faint, which stays until the track ends, so the flow builds up. They follow the wind's path (see
// tracks/domain/aerosol-paths.js). The lead particle of each type (`hero`) is the same, a little larger.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js';
import { headOf, visiblePath } from '../../tracks/domain/aerosol-paths.js';
import { COMET, createCometTrail } from './comet-trail.js';

// EIC's colours of the four particle types (COLOR of notebooks/aerosol_album.ipynb), and the toggle that switches each.
const PARTICLE = Object.freeze({
  seaSalt: { color: '#408cff', toggle: 'salt' },
  dust: { color: '#ff59bf', toggle: 'dust' },
  smoke: { color: '#ff731a', toggle: 'smoke' },
  sulfate: { color: '#4cff59', toggle: 'sulfate' },
});
// The comet tail behind a particle, and the path it has gone (3 px, brightening toward its head).
const TAIL = Object.freeze({ crowd: { ...COMET, headWidthPx: 5 }, hero: { ...COMET, headWidthPx: 8 } });
const PATH = Object.freeze({ ...COMET, headWidthPx: 2, widthPow: 0, alpha: 0.6, tailAlpha: 0.1, alphaPow: 1 });
// The marker at a particle's head, in pixels across.
const MARKER_PX = Object.freeze({ crowd: 9, hero: 14 });
// Lifted over the comet tails, which float 0.003 above the surface.
const MARKER_ALTITUDE = 0.004;

/** A dark halo, a disc in `color` and a white core, drawn as one picture so it reads on dark and on bright air. */
function markerTexture(color) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const halo = ctx.createRadialGradient(32, 32, 10, 32, 32, 32);
  halo.addColorStop(0, 'rgba(0,0,0,0.6)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 64, 64);
  for (const [r, fill] of [[17, color], [8, '#ffffff']]) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(32, 32, r, 0, 2 * Math.PI);
    ctx.fill();
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
  let shownStep = 0;
  let layers = [];
  let toggles = { salt: true, dust: true, smoke: true, sulfate: true };

  function clear() {
    for (const { tail, path, marker } of layers) {
      tail.dispose();
      path.dispose();
      globe.scene().remove(marker);
      marker.material.map.dispose();
      marker.material.dispose();
    }
    layers = [];
    shownPaths = null;
  }

  function makeLayer({ particle, hero }) {
    const { color } = PARTICLE[particle];
    const marker = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: markerTexture(color), depthWrite: false, depthTest: false, transparent: true }),
    );
    marker.renderOrder = 4;
    marker.visible = false;
    globe.scene().add(marker);
    return {
      tail: createCometTrail(globe, color, hero ? TAIL.hero : TAIL.crowd),
      path: createCometTrail(globe, color, PATH),
      marker,
    };
  }

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
      layers = paths.map(makeLayer);
    }
    shownStep = step;
    const unitsPerPx = view.unitsPerPx();
    paths.forEach((particle, i) => {
      const { tail, path, marker } = layers[i];
      const on = toggles[PARTICLE[particle.particle].toggle];
      const gone = visiblePath(particle, step, Infinity);
      if (on && gone) path.update(gone, unitsPerPx);
      else path.hide();
      const ahead = on ? visiblePath(particle, step) : null;
      if (ahead) tail.update(ahead, unitsPerPx);
      else tail.hide();
      const flying = on && step >= particle.release && step <= particle.release + particle.path.length - 1;
      marker.visible = flying;
      if (!flying) return;
      const [lat, lng] = headOf(particle, step);
      const { x, y, z } = globe.getCoords(lat, lng, MARKER_ALTITUDE);
      marker.position.set(x, y, z);
      marker.scale.setScalar((particle.hero ? MARKER_PX.hero : MARKER_PX.crowd) * unitsPerPx);
    });
  }

  /** @param {{ salt: boolean, dust: boolean, smoke: boolean, sulfate: boolean }} next */
  function setToggles(next) {
    toggles = next;
    render(shownPaths, shownStep);
  }

  return { render, setToggles, hide: clear };
}
