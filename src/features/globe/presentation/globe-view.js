import { createIceFall } from './ice-fall.js';
import { createIceMorph } from './ice-morph.js';

import { createBirdsLayer } from './birds-layer.js';
import { createForestLayer } from './forest-layer.js';

// globe.gl is loaded as a UMD bundle in index.html: it ships one copy of three.js,
// while the ESM build pulls several three.js versions from the CDN.
const { Globe } = globalThis;

// Closest zoom, as camera altitude in globe radii above the surface.
const MIN_ZOOM_ALTITUDE = 0.15;
// Pieces of ice that fall when a year loses ice: one per PIECE_CELLS cells of net loss (a cell is about 1,000 km²),
// at most MAX_PIECES; none when the ice grew.
const PIECE_CELLS = 20;
const MAX_PIECES = 90;
// Where the globe looks before anything is in focus.
const INITIAL_VIEW = Object.freeze({ lat: 55, lng: -150 });
// While playing, the globe turns with this time constant to bring the focus to its centre.
const FOLLOW_TAU_SEC = 1.5;
// A glide turns the globe to the focus with this time constant over GLIDE_SEC.
const GLIDE_TAU_SEC = 0.2;
const GLIDE_SEC = 1;
// A globe turned or zoomed by hand glides back to the focus this long after it is let go.
const RETURN_DELAY_MS = 1000;

/** Camera altitude at which the globe's silhouette exactly fills a square viewport. */
function fittedAltitude(camera) {
  return 1 / Math.sin((camera.fov * Math.PI) / 360) - 1;
}

/**
 * Interactive WebGL globe that fills its container. Drag to rotate, scroll to zoom in.
 * Zooming out stops at the fitted size, so the globe never shrinks away from the label edge.
 * It turns to keep a focus point (the flock, the ISS, or the pole of a track's ice) at its centre; turned or zoomed by hand, it glides back a moment after release.
 *
 * It can draw a track's sea ice, morphing from year to year. When a year loses ice, pieces of it fall from where it
 * was into the water at the bottom of the label.
 *
 * @param {HTMLElement} container
 */
export function createGlobeView(container) {
  container.classList.add('globe-view');
  const globe = new Globe(container, { animateIn: false })
    .backgroundColor('rgba(0, 0, 0, 0)')
    .showAtmosphere(false);

  const fitAltitude = fittedAltitude(globe.camera());
  const radius = globe.getGlobeRadius();
  const controls = globe.controls();
  controls.minDistance = radius * (1 + MIN_ZOOM_ALTITUDE);
  controls.maxDistance = radius * (1 + fitAltitude);
  globe.pointOfView({ ...INITIAL_VIEW, altitude: fitAltitude });
  globe.globeMaterial().shininess = 0;

  // Flat, even light like a printed map: drop the directional glare, keep the ambient fill.
  const [, directional] = globe.lights();
  directional.intensity = 0;

  const resize = () => globe.width(container.clientWidth).height(container.clientHeight);
  new ResizeObserver(resize).observe(container);
  resize();

  // Made on first use: it borrows three.js classes from the globe's objects, which exist once the globe has drawn.
  let ice = null;
  const fall = createIceFall(container);
  // The year the ice last morphed from, to notice when playback moves on to the next one.
  let fromYear = null;

  /**
   * @param {string} theme one of GlobeTheme
   * @param {import('../domain/globe-theme.js').GlobeThemeSource} source
   */
  function setTheme(theme, source) {
    container.dataset.theme = theme;
    globe.globeTileEngineUrl(source.tileUrl ?? null).globeImageUrl(source.imageUrl ?? null);
  }

  /**
   * Shows a track's sea ice at a position in its years, morphing between years. Pass null to clear.
   *
   * @param {{ key: string, poleLat: number, shapes: (object | null)[], at: number, fallSec?: number } | null} view
   *   key names the track; shapes are GeoJSON geometries of each year's ice, in order; at is the position in them
   *   (2.5 is halfway from the third year to the fourth); fallSec is how long the ice lost in a year keeps falling.
   */
  function showIce(view) {
    if (view && !ice) ice = createIceMorph(globe);
    ice?.show(view && { key: view.key, poleLat: view.poleLat, shapes: view.shapes, at: view.at });
    dropLostIce(view);
  }

  // When the ice starts morphing into the next year (playing on, not jumping), what it loses falls.
  function dropLostIce(view) {
    const year = view ? Math.floor(view.at) : null;
    const key = view ? `${view.key}:${year}` : null;
    if (key === fromYear) return;
    const previous = fromYear;
    fromYear = key;
    if (!view || previous !== `${view.key}:${year - 1}` || view.at - year > 0.5) return;
    const { count, points } = ice.lost(year, year + 1, MAX_PIECES);
    const pieces = Math.min(MAX_PIECES, Math.round(count / PIECE_CELLS));
    const step = points.length / Math.max(1, pieces);
    const screen = [];
    for (let k = 0; k < pieces; k++) {
      const { lat, lng } = points[Math.floor(k * step)];
      screen.push(globe.getScreenCoords(lat, lng, 0.004));
    }
    fall.drop(screen, view.fallSec);
  }

  /** @param {number} share height of the water surface above the bottom of the globe, as a share of its height */
  function setWaterLine(share) {
    fall.setWaterLine(share);
  }

  // `getFocus()`: the { lat, lon } to bring to the centre, or null when there is none.
  let getFocus = () => null;
  let userTurning = false;
  let returnTimer = null;
  let glideFrame = null;
  controls.addEventListener('start', () => {
    clearTimeout(returnTimer);
    userTurning = true;
    stopGlide();
  });
  controls.addEventListener('end', () => {
    returnTimer = setTimeout(() => {
      userTurning = false;
      glide();
    }, RETURN_DELAY_MS);
  });

  /**
   * Eases the north-up globe so the focus moves toward its centre, and the zoom toward the fitted size (or the share of
   * it the focus asks for with `zoom`, closer below 1), over `dt` seconds.
   */
  function follow(dt, tau = FOLLOW_TAU_SEC) {
    if (userTurning) return;
    const focus = getFocus();
    if (!focus) return;
    const view = globe.pointOfView();
    const k = 1 - Math.exp(-dt / tau);
    const dLng = ((((focus.lon - view.lng) % 360) + 540) % 360) - 180;
    globe.pointOfView({
      lat: view.lat + k * (focus.lat - view.lat),
      lng: view.lng + k * dLng,
      altitude: view.altitude + k * (fitAltitude * (focus.zoom ?? 1) - view.altitude),
    });
  }

  /** Eases the globe to the focus for GLIDE_SEC, then settles it there. */
  function glide() {
    stopGlide();
    let start = null;
    let last = null;
    const step = (now) => {
      glideFrame = null;
      start ??= now;
      const done = now - start >= GLIDE_SEC * 1000;
      follow(done ? Infinity : (now - (last ?? now)) / 1000, GLIDE_TAU_SEC);
      last = now;
      if (!done) glideFrame = requestAnimationFrame(step);
    };
    glideFrame = requestAnimationFrame(step);
  }

  function stopGlide() {
    cancelAnimationFrame(glideFrame);
    glideFrame = null;
  }

  /** Scene units per screen pixel at the point of the globe nearest the camera. */
  function unitsPerPx() {
    const camera = globe.camera();
    const gap = camera.position.length() - radius;
    return (2 * gap * Math.tan((camera.fov * Math.PI) / 360)) / Math.max(1, container.clientHeight);
  }

  const layerView = { globe, unitsPerPx, setElements: (elements) => globe.htmlElementsData(elements) };
  const birds = createBirdsLayer(layerView);
  const forest = createForestLayer(layerView);
  globe.htmlElement('el').htmlTransitionDuration(0);

  return {
    setTheme,
    showIce,
    setWaterLine,
    birds,
    forest,
    /** @param {() => ({ lat: number, lon: number, zoom?: number } | null)} next */
    setFocus(next) {
      getFocus = next;
    },
    follow,
    glide,
    get gliding() {
      return glideFrame !== null;
    },
  };
}
