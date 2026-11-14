import { parseAir, parseForestCells, parseOrbit } from '../domain/forest-track.js';

async function text(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

/**
 * Loads one forest track's files exported by the notebook.
 *
 * @param {{ orbitUrl: string, cellsUrl: string, airUrl: string }} urls
 * @returns {Promise<import('../domain/forest-track.js').ForestSong>}
 */
export async function loadForestSong({ orbitUrl, cellsUrl, airUrl }) {
  const [orbit, cells, air] = await Promise.all([text(orbitUrl), text(cellsUrl), text(airUrl)]);
  return { orbit: parseOrbit(orbit), cells: parseForestCells(cells), air: parseAir(air) };
}
