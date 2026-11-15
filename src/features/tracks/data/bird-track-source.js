import { parseBirdTracks } from '../domain/bird-track.js';

/**
 * Loads the bird-years of one track file exported by the notebook.
 *
 * @param {string} url
 * @returns {Promise<import('../domain/bird-track.js').BirdTrack[]>}
 */
export async function loadBirdTracks(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return parseBirdTracks(await res.text());
}
