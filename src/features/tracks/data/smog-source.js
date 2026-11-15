import { buildSmogTrack } from '../domain/smog.js';

const HOUR_MS = 60 * 60 * 1000;

/**
 * A smog song: the hours of the box around its city (see tracks/domain/smog.js), the city, and the time zone its clock
 * is shown in (its entry in the album's tracks.json, see docs/data-guide.md).
 *
 * @typedef {Object} SmogSongData
 * @property {import('../domain/smog.js').SmogTrack} track
 * @property {{ name: string, lat: number, lon: number }} city
 * @property {string} timeZone an IANA time zone
 */

async function fetchOk(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res;
}

/**
 * Loads one smog song from the album's tracks folder: its CSV holds a row per hour (`time` in UTC, then each cell's
 * PM2.5, south to north, west to east).
 *
 * @param {{ tracksDir: string, file: string }} source
 * @returns {Promise<SmogSongData>}
 */
export async function loadSmogTrack({ tracksDir, file }) {
  const [entries, csv] = await Promise.all([
    fetchOk(`${tracksDir}/tracks.json`).then((res) => res.json()),
    fetchOk(`${tracksDir}/${file}`).then((res) => res.text()),
  ]);
  const entry = entries.find((e) => e.file === file);
  if (!entry?.grid || !entry.city || !entry.timeZone) {
    throw new Error(`${tracksDir}/tracks.json has no grid, city and time zone for ${file}`);
  }
  const { rows, cols } = entry.grid;
  const lines = csv.trim().split('\n').slice(1).map((line) => line.split(','));
  const times = lines.map(([time]) => Date.parse(time));
  if (times.some((time, i) => time !== times[0] + i * HOUR_MS)) throw new Error(`${file}: hours missing or out of order`);
  const pm25 = lines.map(([, ...cells]) => {
    if (cells.length !== rows * cols) throw new Error(`${file}: a row of ${cells.length} cells, not ${rows * cols}`);
    return Float32Array.from(cells, Number);
  });
  return { track: buildSmogTrack(pm25, times[0], entry.grid), city: entry.city, timeZone: entry.timeZone };
}
