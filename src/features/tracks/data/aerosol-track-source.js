import { parseAerosolCsv } from '../domain/aerosol-track.js';

/**
 * @typedef {Object} AerosolTrackData
 * @property {import('../domain/aerosol-track.js').AerosolRecord[]} records
 * @property {string[]} frames frame image URLs
 */

const cache = new Map();

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.text();
}

/**
 * Loads an aerosol track's CSV and generates the frame image paths.
 *
 * @param {import('../../album/domain/album.js').AerosolSource} source
 * @returns {Promise<AerosolTrackData>}
 */
export function loadAerosolTrack(source) {
  const { csvUrl, framesDir } = source;
  if (!cache.has(csvUrl)) {
    const loading = fetchText(csvUrl).then((csv) => {
      const records = parseAerosolCsv(csv);
      // Map each record's time to the corresponding frame PNG path
      // ISO: 2025-08-11T01:30Z -> 20250811_0130.png
      const frames = records.map((r) => {
        const clean = r.time.replace(/[-:]/g, '').replace('T', '_').replace('Z', '');
        return `${framesDir}/${clean}.png`;
      });
      return { records, frames };
    });
    loading.catch(() => cache.delete(csvUrl));
    cache.set(csvUrl, loading);
  }
  return cache.get(csvUrl);
}
