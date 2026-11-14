import { parseSstField, parseStormTrack } from '../domain/storm-track.js';

/**
 * A hurricane track's data, ready to play and draw.
 *
 * @typedef {Object} StormTrackData
 * @property {import('../domain/storm-track.js').StormTrack} track
 * @property {Map<string, import('../domain/storm-track.js').SstMap>} field the sea under it, by month
 */

const cache = new Map();

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

/**
 * Loads a storm's track CSV and the SST field the globe draws under it (see docs/data-guide.md), each pair once.
 *
 * @param {{ csvUrl: string, fieldUrl: string }} source
 * @returns {Promise<StormTrackData>}
 */
export function loadStormTrack({ csvUrl, fieldUrl }) {
  const key = `${csvUrl}|${fieldUrl}`;
  if (!cache.has(key)) {
    const loading = Promise.all([fetchText(csvUrl), fetchText(fieldUrl)]).then(([csv, field]) => ({
      track: parseStormTrack(csv),
      field: parseSstField(JSON.parse(field)),
    }));
    // A failed load is not kept, so the next attempt fetches again.
    loading.catch(() => cache.delete(key));
    cache.set(key, loading);
  }
  return cache.get(key);
}
