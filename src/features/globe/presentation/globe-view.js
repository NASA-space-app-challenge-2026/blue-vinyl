import { createIceFall } from './ice-fall.js';
import { createIceMorph } from './ice-morph.js';

import { DEFAULT_GLOBE_LENS } from '../domain/globe-lens.js';
import { createBirdsLayer } from './birds-layer.js';
import { createLightningLayer } from './lightning-layer.js';
import { createStormLayer } from './storm-view.js';
import { createStormsLayer } from './storms-layer.js';
import { createFiresLayer } from './fires-layer.js';

// globe.gl is loaded as a UMD bundle in index.html: it ships one copy of three.js,
// while the ESM build pulls several three.js versions from the CDN.
const { Globe } = globalThis;

// Zooming in by hand stops at this many times the fitted size.
const MAX_ZOOM = 9;
// Edge of a map tile in texels.
const TILE_PX = 256;
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

/** Camera altitude at which the edge of a square viewport falls `arcDeg` of arc from the point in its centre. */
function altitudeForArc(camera, arcDeg) {
  const half = (camera.fov * Math.PI) / 360;
  return Math.sin((arcDeg * Math.PI) / 180 + half) / Math.sin(half) - 1;
}

/**
 * Interactive WebGL globe that fills its container. Drag to rotate, scroll to zoom in.
 * Zooming out stops at the fitted size, so the globe never shrinks away from the label edge.
 * It turns to keep a focus point (the flock, or the pole of a track's ice) at its centre; turned or zoomed by hand, it glides back a moment after release.
 *
 * It can draw a track's sea ice, morphing from year to year. When a year loses ice, pieces of it fall from where it
 * was into the water at the bottom of the label. It can draw a hurricane (storm), and a year of lightning with the
 * sunlight of the season.
 *
 * @param {HTMLElement} container
 */
export function createGlobeView(container) {
  container.classList.add('globe-view');
  const globe = new Globe(container, { animateIn: false })
    .backgroundColor('rgba(0, 0, 0, 0)')
    .showAtmosphere(false);

  const camera = globe.camera();
  const radius = globe.getGlobeRadius();
  const controls = globe.controls();
  // Camera altitude at which the globe fits the label, set with the lens.
  let fitAltitude = 0;

  /**
   * Looks at the globe through `lens` (one of GlobeLens), at its fitted size.
   *
   * @param {{ fovDeg: number }} lens
   */
  function setLens(lens) {
    camera.fov = lens.fovDeg;
    camera.updateProjectionMatrix();
    fitAltitude = fittedAltitude(camera);
    controls.minDistance = radius * (1 + fitAltitude / MAX_ZOOM);
    controls.maxDistance = radius * (1 + fitAltitude);
    globe.pointOfView({ altitude: fitAltitude });
    keepGrabSpeed();
  }

  globe.pointOfView(INITIAL_VIEW);
  setLens(DEFAULT_GLOBE_LENS);
  globe.globeMaterial().shininess = 0;

  // Flat, even light like a printed map: drop the directional glare, keep the ambient fill.
  const [, directional] = globe.lights();
  directional.intensity = 0;

  // globe.gl's map tile engine, once it has joined the scene, and the zoom level of the tiles it is pinned to. The
  // engine would pick its level from the camera's distance, which the narrow lens makes far, so the level is pinned
  // to what the globe's size on screen needs instead.
  let tileEngine = null;
  let tileLevel = null;

  const resize = () => {
    globe.width(container.clientWidth).height(container.clientHeight);
    pinTileLevel();
  };
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
    tileLevel = null;
    if (source.tileUrl) pinWhenReady();
  }

  // The engine joins the scene some frames after a tile map is set.
  function pinWhenReady() {
    if (!findTileEngine()) {
      requestAnimationFrame(pinWhenReady);
      return;
    }
    pinTileLevel();
  }

  function findTileEngine() {
    if (!tileEngine?.parent) {
      tileEngine = null;
      globe.scene().traverse((object) => {
        if (Array.isArray(object.thresholds)) tileEngine = object;
      });
    }
    return tileEngine;
  }

  // Pins the tiles to the lowest zoom level at least as sharp as the screen where the globe is nearest the camera
  // (a level-l map wraps 2^l tiles around the globe's 2π radii), and lets the engine fetch them.
  function pinTileLevel() {
    if (!findTileEngine()) return;
    const devicePx = (radius / unitsPerPx()) * globe.renderer().getPixelRatio();
    const level = Math.max(0, Math.ceil(Math.log2((2 * Math.PI * devicePx) / TILE_PX)));
    if (level === tileLevel) return;
    tileLevel = level;
    tileEngine.minLevel = tileEngine.maxLevel = level;
    controls.dispatchEvent({ type: 'change' });
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

  // `getFocus()`: the { lat, lon } to bring to the centre, or null when there is none. With `arcDeg` the globe also
  // zooms in until the label's edge is that many degrees of arc from it; otherwise it fits the label.
  let getFocus = () => null;
  let userTurning = false;
  let returnTimer = null;
  let glideFrame = null;
  controls.addEventListener('change', () => {
    keepGrabSpeed();
    pinTileLevel();
  });
  controls.addEventListener('start', () => {
    keepGrabSpeed();
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

  /** Eases the north-up globe so the focus moves toward its centre, and the zoom back to the fitted size, over `dt` seconds. */
  function follow(dt, tau = FOLLOW_TAU_SEC) {
    if (userTurning) return;
    const focus = getFocus();
    if (!focus) return;
    const view = globe.pointOfView();
    const k = 1 - Math.exp(-dt / tau);
    const dLng = ((((focus.lon - view.lng) % 360) + 540) % 360) - 180;
    const altitude = focus.arcDeg ? altitudeForArc(globe.camera(), focus.arcDeg) : fitAltitude;
    globe.pointOfView({
      lat: view.lat + k * (focus.lat - view.lat),
      lng: view.lng + k * dLng,
      altitude: view.altitude + k * (altitude - view.altitude),
    });
    pinTileLevel();
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

  // globe.gl sets the drag speed from the camera's altitude on every change, which a narrow lens makes far too fast.
  // Orbit controls turn 2π·speed radians per view height dragged; this speed keeps the grabbed point under the pointer
  // where the globe is nearest the camera, whatever the lens and the zoom. Set after globe.gl's own handler.
  function keepGrabSpeed() {
    controls.rotateSpeed = (Math.max(1, controls.domElement.clientHeight) * unitsPerPx()) / (2 * Math.PI * radius);
  }

  /** Scene units per screen pixel at the point of the globe nearest the camera. */
  function unitsPerPx() {
    const camera = globe.camera();
    const gap = camera.position.length() - radius;
    return (2 * gap * Math.tan((camera.fov * Math.PI) / 360)) / Math.max(1, container.clientHeight);
  }

  // Birds and storms are never on the globe together: each layer sets the globe's HTML elements while it is shown.
  const layerView = { globe, unitsPerPx, setElements: (elements) => globe.htmlElementsData(elements) };
  const birds = createBirdsLayer(layerView);
  const storms = createStormsLayer(layerView);
  const fires = createFiresLayer({ globe });
  globe.htmlElement('el').htmlTransitionDuration(0);
  const storm = createStormLayer({ globe, container });

  const lightning = createLightningLayer(globe);

  return {
    setTheme,
    setLens,
    showIce,
    showFires: fires.show,
    setWaterLine,
    birds,
    lightning,
    storm,
    storms,
    /** @param {() => ({ lat: number, lon: number, arcDeg?: number } | null)} next */
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
