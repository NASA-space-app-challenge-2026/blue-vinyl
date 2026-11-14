import { parseFlockYear } from '../domain/flock-year.js';

/**
 * Loads a flock year exported by the notebook.
 *
 * @param {string} url
 * @returns {Promise<import('../domain/flock-year.js').FlockDay[]>}
 */
export async function loadFlockYear(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return parseFlockYear(await res.text());
}
