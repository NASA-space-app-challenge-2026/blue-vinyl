import { parseNoonLine } from '../domain/noon-line.js';
import { pickTrees, treesByStep } from '../domain/forest-trees.js';

async function fetchOk(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res;
}

/**
 * An 8-bit grey PNG as a north-first grid from 180° W. `decode` turns a non-zero grey into a value; 0 stays NaN.
 *
 * @param {string} url
 * @param {(grey: number) => number} decode
 * @returns {Promise<{ width: number, height: number, values: Float32Array }>}
 */
async function loadGreyMap(url, decode) {
  const bitmap = await createImageBitmap(await (await fetchOk(url)).blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext('2d');
  context.drawImage(bitmap, 0, 0);
  const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height);
  const values = new Float32Array(bitmap.width * bitmap.height);
  for (let i = 0; i < values.length; i++) values[i] = data[4 * i] ? decode(data[4 * i]) : NaN;
  return { width: bitmap.width, height: bitmap.height, values };
}

/** Canopy height: grey / 4 = m. */
function loadCanopyMap(url) {
  return loadGreyMap(url, (grey) => grey / 4).then(({ width, height, values }) => ({ width, height, metres: values }));
}

// Maps are loaded once per URL.
const maps = new Map();

function cached(url, load) {
  if (!maps.has(url)) maps.set(url, load(url));
  return maps.get(url);
}

/**
 * Loads one forest track: the noon line, the canopy map and the trees picked from it (the globe grows them and the music
 * plays them).
 *
 * @param {{ lineUrl: string, mapUrl: string }} source
 */
export async function loadNoonSong({ lineUrl, mapUrl }) {
  const [line, map] = await Promise.all([
    fetchOk(lineUrl).then((res) => res.text()).then(parseNoonLine),
    cached(mapUrl, loadCanopyMap),
  ]);
  const trees = pickTrees(map);
  return { line, map, trees, treesByStep: treesByStep(trees) };
}
