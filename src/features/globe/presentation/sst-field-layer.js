// The sea surface temperature under a storm, drawn on the globe as SVS 5097 draws it: bands of warmer and cooler water
// and the 26.5 °C line storms form above, from the map of the month the storm is in.

import { sstBandColor } from './sst-color.js';

// Just above the surface and the map tiles, under the storm.
const ALTITUDE = 0.005;
const BAND_OPACITY = 0.55;
const ISOTHERM = Object.freeze({ color: 'rgba(255, 255, 255, 0.9)', strokePx: 1.5 });

/** @param {Object} globe the globe.gl instance */
export function createSstFieldLayer(globe) {
  globe
    .polygonGeoJsonGeometry('geometry')
    .polygonCapColor((band) => sstBandColor(band.fromC, BAND_OPACITY))
    .polygonSideColor(() => 'rgba(0, 0, 0, 0)')
    .polygonStrokeColor(() => false)
    .polygonAltitude(ALTITUDE)
    .polygonsTransitionDuration(0)
    .pathPoints('points')
    .pathPointLat((p) => p[1])
    .pathPointLng((p) => p[0])
    .pathPointAlt(ALTITUDE)
    .pathColor(() => ISOTHERM.color)
    .pathStroke(ISOTHERM.strokePx)
    .pathTransitionDuration(0);

  let shown = null;
  // Each map's bands as the globe draws them, made once.
  const drawn = new WeakMap();

  /** @param {import('../../tracks/domain/storm-track.js').SstMap | null} map null takes the field off the globe */
  function show(map) {
    if (map === shown) return;
    shown = map;
    if (map && !drawn.has(map)) drawn.set(map, map.bands.map((band) => ({ ...band, geometry: clockwise(band.geometry) })));
    globe.polygonsData(map ? drawn.get(map) : []);
    const lines = map?.isotherm ? linesOf(map.isotherm.geometry) : [];
    globe.pathsData(lines.map((points) => ({ points })));
  }

  return { show };
}

// The geometry with its rings wound the other way. GeoJSON (RFC 7946) winds exterior rings anticlockwise; globe.gl,
// like d3-geo, takes the clockwise side of a ring as its inside on the sphere, and would fill the rest of the world.
function clockwise(geometry) {
  const polygon = (rings) => rings.map((ring) => [...ring].reverse());
  if (geometry.type === 'Polygon') return { type: 'Polygon', coordinates: polygon(geometry.coordinates) };
  if (geometry.type === 'MultiPolygon') return { type: 'MultiPolygon', coordinates: geometry.coordinates.map(polygon) };
  return geometry;
}

// The lines of a LineString or MultiLineString, as [lon, lat] points.
function linesOf(geometry) {
  if (geometry.type === 'LineString') return [geometry.coordinates];
  if (geometry.type === 'MultiLineString') return geometry.coordinates;
  return [];
}
