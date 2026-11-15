// The particles of an aerosol track on the globe (at most MAX_PARTICLES): each one a comet that follows the path its
// own particle type's wind carries it along (see tracks/domain/aerosol-paths.js), in EIC's colour for that type. The
// crowd is thin and dim, so the flow reads as a whole; each lead particle (`hero`) is large and bright, with a glow at
// its head, and stands out of it.

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js';
import { visiblePath } from '../../tracks/domain/aerosol-paths.js';
import { COMET, createCometTrail } from './comet-trail.js';

// EIC's colours of the four particle types (COLOR of notebooks/aerosol_album.ipynb), and the toggle that switches each.
const PARTICLE = Object.freeze({
  seaSalt: { color: '#408cff', toggle: 'salt' },
  dust: { color: '#ff59bf', toggle: 'dust' },
  smoke: { color: '#ff731a', toggle: 'smoke' },
  sulfate: { color: '#4cff59', toggle: 'sulfate' },
});
const CROWD = Object.freeze({ ...COMET, headWidthPx: 3, alpha: 0.35 });
const HERO = Object.freeze({ ...COMET, headWidthPx: 20, widthPow: 0.45, coreWhite: 1 });
// The glow at a lead particle's head: its diameter on screen, and how far above the surface it floats.
const GLOW_PX = 120;
// The glow breathes: its size swings by this share, once every PULSE_SEC.
const PULSE = Object.freeze({ share: 0.2, sec: 1.2 });
const GLOW_ALTITUDE = 0.006;

/** A white radial falloff, tinted by the sprite's colour. */
function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

/**
 * @param {{ globe: Object, unitsPerPx: () => number }} view
 */
export function createAerosolPathsLayer(view) {
  const { globe } = view;
  const glowMap = glowTexture();
  /** @type {import('../../tracks/domain/aerosol-paths.js').AerosolParticlePath[] | null} */
  let shownPaths = null;
  let shownStep = 0;
  let trails = [];
  let glows = [];
  let toggles = { salt: true, dust: true, smoke: true, sulfate: true };

  function clear() {
    for (const trail of trails) trail.dispose();
    for (const glow of glows) {
      if (!glow) continue;
      globe.scene().remove(glow);
      glow.material.dispose();
    }
    trails = [];
    glows = [];
    shownPaths = null;
  }

  function makeGlow(color) {
    const material = new THREE.SpriteMaterial({
      map: glowMap,
      color,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      transparent: true,
    });
    const sprite = new THREE.Sprite(material);
    sprite.renderOrder = 3;
    sprite.visible = false;
    globe.scene().add(sprite);
    return sprite;
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
      trails = paths.map((p) => createCometTrail(globe, PARTICLE[p.particle].color, p.hero ? HERO : CROWD));
      glows = paths.map((p) => (p.hero ? makeGlow(PARTICLE[p.particle].color) : null));
    }
    shownStep = step;
    const unitsPerPx = view.unitsPerPx();
    paths.forEach((particle, i) => {
      const points = toggles[PARTICLE[particle.particle].toggle] ? visiblePath(particle, step) : null;
      if (points) trails[i].update(points, unitsPerPx);
      else trails[i].hide();
      const glow = glows[i];
      if (!glow) return;
      glow.visible = Boolean(points);
      if (!points) return;
      const [lat, lng] = points[points.length - 1];
      const { x, y, z } = globe.getCoords(lat, lng, GLOW_ALTITUDE);
      glow.position.set(x, y, z);
      const pulse = 1 + PULSE.share * Math.sin((performance.now() / 1000 / PULSE.sec) * 2 * Math.PI);
      glow.scale.setScalar(GLOW_PX * pulse * unitsPerPx);
    });
  }

  /** @param {{ salt: boolean, dust: boolean, smoke: boolean, sulfate: boolean }} next */
  function setToggles(next) {
    toggles = next;
    render(shownPaths, shownStep);
  }

  return { render, setToggles, hide: clear };
}
