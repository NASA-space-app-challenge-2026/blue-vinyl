import { parseIceSeaCsv } from '../domain/ice-sea-series.js';
import { parseAnnualCsv, parseDailyCsv, parseFireDaysCsv, parseYearFiresCsv } from '../domain/wildfire-series.js';

/**
 * A polar track's data, ready to play and draw.
 *
 * @typedef {Object} IceSeaTrackData
 * @property {import('../domain/ice-sea-series.js').IceSeaYear[]} years
 * @property {Map<number, object>} iceByYear GeoJSON geometry of each year's ice
 * @property {(object | null)[]} iceShapes the same geometries in the order of `years`, null where one is missing
 */

/**
 * @typedef {Object} WildfireAnnualData
 * @property {'annual'} kind
 * @property {import('../domain/wildfire-series.js').WildfireYear[]} years
 * @property {import('../domain/wildfire-series.js').WildfireYearFire[][]} firesByYear each year's MTBS large fires
 */

/**
 * @typedef {Object} WildfireSeasonData
 * @property {'season'} kind
 * @property {import('../domain/wildfire-series.js').WildfireDay[]} days
 * @property {import('../domain/wildfire-series.js').WildfireFire[]} fires each large fire, day by day
 */

/** @typedef {WildfireAnnualData | WildfireSeasonData} WildfireTrackData */

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

/**
 * Loads a wildfire track: either the national annual series with each year's large fires, or a peak-year daily series
 * with fire points.
 *
 * @param {{ kind: 'annual' | 'season', csvUrl: string, firesUrl: string }} source
 * @returns {Promise<WildfireTrackData>}
 */
export function loadWildfireTrack(source) {
  const key = `${source.csvUrl}|${source.firesUrl}`;
  if (!cache.has(key)) {
    const loading =
      source.kind === 'annual'
        ? Promise.all([fetchText(source.csvUrl), fetchText(source.firesUrl)]).then(([csv, firesCsv]) => {
            const years = parseAnnualCsv(csv);
            return {
              kind: 'annual',
              years,
              firesByYear: parseYearFiresCsv(firesCsv, years),
            };
          })
        : Promise.all([fetchText(source.csvUrl), fetchText(source.firesUrl)]).then(([csv, firesCsv]) => {
            const days = parseDailyCsv(csv);
            return { kind: 'season', days, fires: parseFireDaysCsv(firesCsv, days) };
          });
    loading.catch(() => cache.delete(key));
    cache.set(key, loading);
  }
  return cache.get(key);
}
