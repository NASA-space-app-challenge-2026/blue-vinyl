import { parseSmogGrid, parseSmogTrack } from '../domain/smog.js';

/**
 * A smog track's year: the city's air, the box around it and where the city is (its entry in the album's tracks.json,
 * see docs/data-guide.md).
 *
 * @typedef {Object} SmogTrackData
 * @property {import('../domain/smog.js').SmogTrack} track
 * @property {import('../domain/smog.js').SmogGrid} grid
 * @property {{ name: string, lat: number, lon: number }} city
 */

async function fetchOk(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res;
}

/**
 * Loads one smog track from the album's tracks folder.
 *
 * @param {{ tracksDir: string, file: string }} source
 * @returns {Promise<SmogTrackData>}
 */
export async function loadSmogTrack({ tracksDir, file }) {
  const entries = await fetchOk(`${tracksDir}/tracks.json`).then((res) => res.json());
  const entry = entries.find((e) => e.file === file);
  if (!entry?.grid || !entry.city || entry.visuals?.length !== 1) {
    throw new Error(`${tracksDir}/tracks.json has no city, grid and grid file for ${file}`);
  }
  const [csv, gridCsv] = await Promise.all(
    [file, entry.visuals[0]].map((name) => fetchOk(`${tracksDir}/${name}`).then((res) => res.text())),
  );
  return {
    track: parseSmogTrack(csv, entry.grid.sampleUtc),
    grid: parseSmogGrid(gridCsv, entry.grid),
    city: entry.city,
  };
}
