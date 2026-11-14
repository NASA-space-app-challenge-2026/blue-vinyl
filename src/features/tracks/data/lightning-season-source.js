import { parseLightningSeason } from '../domain/lightning-season.js';

/**
 * A lightning track's season, and where on the equator the globe looks at it (its `view` in the album's tracks.json,
 * see docs/data-guide.md).
 *
 * @typedef {Object} LightningTrackData
 * @property {import('../domain/lightning-season.js').LightningSeason} season
 * @property {{ lat: number, lon: number }} view
 */

async function fetchOk(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res;
}

/**
 * Loads one lightning track from the album's tracks folder.
 *
 * @param {{ tracksDir: string, file: string }} source
 * @returns {Promise<LightningTrackData>}
 */
export async function loadLightningTrack({ tracksDir, file }) {
  const [csv, entries] = await Promise.all([
    fetchOk(`${tracksDir}/${file}`).then((res) => res.text()),
    fetchOk(`${tracksDir}/tracks.json`).then((res) => res.json()),
  ]);
  const entry = entries.find((e) => e.file === file);
  if (!entry?.view) throw new Error(`${tracksDir}/tracks.json has no view for ${file}`);
  return { season: parseLightningSeason(csv), view: entry.view };
}
