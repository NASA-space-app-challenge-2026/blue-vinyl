// The particles of an aerosol track on the globe: each one a comet that follows the path its own particle type's wind
// carries it along (see tracks/domain/aerosol-paths.js), in EIC's colour for that type. At most MAX_PARTICLES of them.

import { visiblePath } from '../../tracks/domain/aerosol-paths.js';
import { COMET, createCometTrail } from './comet-trail.js';

// EIC's colours of the four particle types (COLOR of notebooks/aerosol_album.ipynb), and the toggle that switches each.
const PARTICLE = Object.freeze({
  seaSalt: { color: '#408cff', toggle: 'salt' },
  dust: { color: '#ff59bf', toggle: 'dust' },
  smoke: { color: '#ff731a', toggle: 'smoke' },
  sulfate: { color: '#4cff59', toggle: 'sulfate' },
});
const TRAIL = Object.freeze({ ...COMET, headWidthPx: 4 });

/**
 * @param {{ globe: Object, unitsPerPx: () => number }} view
 */
export function createAerosolPathsLayer(view) {
  /** @type {import('../../tracks/domain/aerosol-paths.js').AerosolParticlePath[] | null} */
  let shownPaths = null;
  let trails = [];
  let shownStep = 0;
  let toggles = { salt: true, dust: true, smoke: true, sulfate: true };

  function clear() {
    for (const trail of trails) trail.dispose();
    trails = [];
    shownPaths = null;
  }

  function hide() {
    for (const trail of trails) trail.hide();
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
      trails = paths.map(({ particle }) => createCometTrail(view.globe, PARTICLE[particle].color, TRAIL));
    }
    shownStep = step;
    const unitsPerPx = view.unitsPerPx();
    paths.forEach((particle, i) => {
      const points = toggles[PARTICLE[particle.particle].toggle] ? visiblePath(particle, step) : null;
      if (points) trails[i].update(points, unitsPerPx);
      else trails[i].hide();
    });
  }

  /** @param {{ salt: boolean, dust: boolean, smoke: boolean, sulfate: boolean }} next */
  function setToggles(next) {
    toggles = next;
    render(shownPaths, shownStep);
  }

  return { render, setToggles, hide: clear };
}
