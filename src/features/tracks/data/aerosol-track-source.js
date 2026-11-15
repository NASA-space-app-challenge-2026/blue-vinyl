import { aodsAt, FRAME } from '../domain/aerosol-frame.js';
import { headOf, parseAerosolPaths } from '../domain/aerosol-paths.js';
import { parseAerosolCsv } from '../domain/aerosol-track.js';

/**
 * @typedef {Object} AerosolTrackData
 * @property {import('../domain/aerosol-track.js').AerosolRecord[]} records
 * @property {string[]} frames frame image URLs
 * @property {import('../domain/aerosol-paths.js').AerosolParticlePath[]} paths
 */

const cache = new Map();

async function fetchOk(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response;
}

/**
 * Loads an aerosol track's CSV and generates the frame image paths.
 *
 * @param {import('../../album/domain/album.js').AerosolSource} source
 * @returns {Promise<AerosolTrackData>}
 */
export function loadAerosolTrack(source) {
  const { csvUrl, framesDir, pathsUrl } = source;
  if (!cache.has(csvUrl)) {
    const loading = Promise.all([fetchOk(csvUrl).then((r) => r.text()), fetchOk(pathsUrl).then((r) => r.json())]).then(([csv, json]) => {
      const records = parseAerosolCsv(csv);
      // Map each record's time to the corresponding frame PNG path
      // ISO: 2025-08-11T01:30Z -> 20250811_0130.png
      const frames = records.map((r) => {
        const clean = r.time.replace(/[-:]/g, '').replace('T', '_').replace('Z', '');
        return `${framesDir}/${clean}.png`;
      });
      return { records, frames, paths: parseAerosolPaths(json) };
    });
    loading.catch(() => cache.delete(csvUrl));
    cache.set(csvUrl, loading);
  }
  return cache.get(csvUrl);
}

// How many frames are decoded at once.
const DECODE_BATCH = 4;

/**
 * The AOD of each particle type at each track's lead particle, at each step: every frame is decoded once, for all the
 * tracks, which share them.
 *
 * @param {AerosolTrackData[]} tracks
 * @returns {Promise<import('../domain/aerosol-frame.js').ParticleAods[][]>} by track, then step
 */
export async function loadHeroAods(tracks) {
  const { frames } = tracks[0];
  if (tracks.some((track) => track.frames.join() !== frames.join())) throw new Error('aerosol: tracks differ in frames');
  const heroes = tracks.map(({ paths }) => paths.find((p) => p.hero));
  const aods = tracks.map(() => []);
  const canvas = document.createElement('canvas');
  canvas.width = FRAME.cols;
  canvas.height = 2 * FRAME.rows;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  for (let first = 0; first < frames.length; first += DECODE_BATCH) {
    const images = await Promise.all(frames.slice(first, first + DECODE_BATCH).map(decodeImage));
    images.forEach((image, i) => {
      context.drawImage(image, 0, 0);
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
      heroes.forEach((hero, t) => {
        const [lat, lon] = headOf(hero, first + i);
        aods[t].push(aodsAt(data, 4, lat, lon));
      });
    });
  }
  return aods;
}

async function decodeImage(url) {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}
