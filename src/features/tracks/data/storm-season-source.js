import { parseStormSeason } from '../domain/storm-season.js';

/**
 * Loads the storms of one season file exported by the notebook.
 *
 * @param {string} url
 * @returns {Promise<import('../domain/storm-season.js').StormTrack[]>}
 */
export async function loadStormSeason(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return parseStormSeason(await res.text());
}
