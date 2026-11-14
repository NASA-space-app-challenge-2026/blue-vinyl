import { parseStormTrack } from '../domain/storm-track.js';

const cache = new Map();

/**
 * Loads a storm's track CSV (see docs/data-guide.md), each once.
 *
 * @param {{ csvUrl: string }} source
 * @returns {Promise<import('../domain/storm-track.js').StormTrack>}
 */
export function loadStormTrack({ csvUrl }) {
  if (!cache.has(csvUrl)) {
    const loading = fetch(csvUrl).then((res) => {
      if (!res.ok) throw new Error(`${csvUrl}: HTTP ${res.status}`);
      return res.text().then(parseStormTrack);
    });
    // A failed load is not kept, so the next attempt fetches again.
    loading.catch(() => cache.delete(csvUrl));
    cache.set(csvUrl, loading);
  }
  return cache.get(csvUrl);
}
