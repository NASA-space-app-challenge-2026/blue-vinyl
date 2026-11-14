import { createIceMorph } from './ice-morph.js';

// globe.gl is loaded as a UMD bundle in index.html: it ships one copy of three.js,
// while the ESM build pulls several three.js versions from the CDN.
const { Globe } = globalThis;

// Closest zoom, as camera altitude in globe radii above the surface.
const MIN_ZOOM_ALTITUDE = 0.15;
// Lines drawn on the globe sit just above the ice (see ice-morph.js).
const LINE_ALTITUDE = 0.006;
const NORMAL_LINE = Object.freeze({ color: '#e3b23c', stroke: 0.9 });
// The record low usually lies inside the current ice, so its edge needs a colour that shows on the pale ice and on
// the dark map alike.
const RECORD_LINE = Object.freeze({ color: 'rgba(255, 112, 92, 0.95)', stroke: 0.6, dash: 0.012, gap: 0.008 });
const FOCUS_MS = 1200;

/** Camera altitude at which the globe's silhouette exactly fills a square viewport. */
function fittedAltitude(camera) {
  return 1 / Math.sin((camera.fov * Math.PI) / 360) - 1;
}

// Rings of a GeoJSON geometry as lines; polygons give only their outer rings.
function rings(geometry) {
  if (!geometry) return [];
  switch (geometry.type) {
    case 'LineString':
      return [geometry.coordinates];
    case 'MultiLineString':
      return geometry.coordinates;
    case 'Polygon':
      return [geometry.coordinates[0]];
    case 'MultiPolygon':
      return geometry.coordinates.map((polygon) => polygon[0]);
    default:
      return [];
  }
}

// Shapes that wrap round a pole are closed along the pole and split at the 180° meridian; those edges are not part
// of the ice edge, so outlines break there.
function isSeam([lng1, lat1], [lng2, lat2]) {
  return (Math.abs(lat1) > 89.9 && Math.abs(lat2) > 89.9) || (Math.abs(lng1) > 179.99 && Math.abs(lng2) > 179.99);
}

function outline(geometry) {
  const lines = [];
  for (const ring of rings(geometry)) {
    let run = [ring[0]];
    for (let i = 1; i < ring.length; i++) {
      if (isSeam(ring[i - 1], ring[i])) {
        if (run.length > 1) lines.push(run);
        run = [];
      }
      run.push(ring[i]);
    }
    if (run.length > 1) lines.push(run);
  }
  return lines;
}

/**
 * Interactive WebGL globe that fills its container. Drag to rotate, scroll to zoom in.
 * Zooming out stops at the fitted size, so the globe never shrinks away from the label edge.
 *
 * It can draw a track's sea ice: the ice morphing from year to year, the 1981–2010 normal ice edge and the edge of
 * the latest record low.
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
  globe.pointOfView({ altitude: fitAltitude });
  globe.globeMaterial().shininess = 0;

  // Flat, even light like a printed map: drop the directional glare, keep the ambient fill.
  const [, directional] = globe.lights();
  directional.intensity = 0;

  const resize = () => globe.width(container.clientWidth).height(container.clientHeight);
  new ResizeObserver(resize).observe(container);
  resize();

  // Made on first use: it borrows three.js classes from the globe's objects, which exist once the globe has drawn.
  let ice = null;
  let linesKey = null;
  let focusLat = null;

  globe
    .pathsData([])
    .pathPoints((line) => line.points)
    .pathPointLat((point) => point[1])
    .pathPointLng((point) => point[0])
    .pathPointAlt(LINE_ALTITUDE)
    .pathColor((line) => line.color)
    .pathStroke((line) => line.stroke)
    .pathDashLength((line) => line.dash)
    .pathDashGap((line) => line.gap)
    .pathTransitionDuration(0);

  /**
   * @param {string} theme one of GlobeTheme
   * @param {import('../domain/globe-theme.js').GlobeThemeSource} source
   */
  function setTheme(theme, source) {
    container.dataset.theme = theme;
    globe.globeTileEngineUrl(source.tileUrl ?? null).globeImageUrl(source.imageUrl ?? null);
  }

  /**
   * Shows a track's sea ice at a position in its years, morphing between years, with the normal ice edge and the
   * edge of the latest record low. Pass null to clear.
   *
   * @param {{
   *   key: string, poleLat: number, shapes: (object | null)[], at: number,
   *   normal: object | null, record: object | null, linesKey: string,
   * } | null} view
   *   key names the track; shapes are GeoJSON geometries of each year's ice, in order; at is the position in them
   *   (2.5 is halfway from the third year to the fourth); normal and record are GeoJSON geometries; linesKey changes
   *   when normal or record do.
   */
  function showIce(view) {
    if (view && !ice) ice = createIceMorph(globe);
    ice?.show(view && { key: view.key, poleLat: view.poleLat, shapes: view.shapes, at: view.at });
    const nextLinesKey = view?.linesKey ?? null;
    if (nextLinesKey !== linesKey) {
      linesKey = nextLinesKey;
      const toPaths = (geometry, style) => outline(geometry).map((points) => ({ points, ...style }));
      globe.pathsData(view ? [...toPaths(view.normal, NORMAL_LINE), ...toPaths(view.record, RECORD_LINE)] : []);
    }
  }

  /**
   * Turns the globe to look down on a latitude (a pole: ±90), or back to the start view with null.
   *
   * @param {number | null} lat
   */
  function focus(lat) {
    if (lat === focusLat) return;
    focusLat = lat;
    // Exactly over the pole the camera's orientation is undefined, so stop just short of it.
    const target = lat === null ? 0 : Math.max(-89, Math.min(89, lat));
    globe.pointOfView({ lat: target, lng: 0, altitude: fitAltitude }, FOCUS_MS);
  }

  return { setTheme, showIce, focus };
}
