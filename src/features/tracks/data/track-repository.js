import { parseIceSeaCsv } from '../domain/ice-sea-series.js';

/**
 * A polar track's data, ready to play and draw.
 *
 * @typedef {Object} IceSeaTrackData
 * @property {import('../domain/ice-sea-series.js').IceSeaYear[]} years
 * @property {Map<number, object>} iceByYear GeoJSON geometry of each year's ice
 * @property {(object | null)[]} iceShapes the same geometries in the order of `years`, null where one is missing
 */

const cache = new Map();

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.text();
}

/**
 * Loads a track's CSV and the GeoJSON the globe draws for it (see docs/data-guide.md). Each pair is fetched once.
 *
 * @param {{ csvUrl: string, shapesUrl: string }} source
 * @returns {Promise<IceSeaTrackData>}
 */
export function loadIceSeaTrack({ csvUrl, shapesUrl }) {
  const key = `${csvUrl}|${shapesUrl}`;
  if (!cache.has(key)) {
    const loading = Promise.all([fetchText(csvUrl), fetchText(shapesUrl)]).then(([csv, shapes]) => {
      const years = parseIceSeaCsv(csv);
      const iceByYear = new Map();
      for (const feature of JSON.parse(shapes).features) {
        if (feature.properties.kind === 'ice') iceByYear.set(feature.properties.year, feature.geometry);
      }
      return { years, iceByYear, iceShapes: years.map((y) => iceByYear.get(y.year) ?? null) };
    });
    // A failed load is not kept, so the next attempt fetches again.
    loading.catch(() => cache.delete(key));
    cache.set(key, loading);
  }
  return cache.get(key);
}
