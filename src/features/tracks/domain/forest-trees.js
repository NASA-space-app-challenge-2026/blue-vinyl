// The trees of the forest track, picked once from the canopy map and shared by the globe and the music: a tree is drawn
// growing and played as one note, from the step it starts at for as long as it takes to grow. Picked with a seeded random
// sequence, so a tree is the same for the eye and the ear and on every play.

import { BAND_LATS, Band, LINE_STEPS, STEP_SEC, lineStepAt } from './noon-line.js';

// Canopy PNG is 0.25°.
const MAP_CELL_DEG = 0.25;
const MAP_NORTH = 52;
// The forest stands as one tree on each 2° square of the map where at least a quarter of the square is forest. The
// tree is as tall as the square's tall canopy (90th percentile of its forest cells).
const TREE = Object.freeze({ cellDeg: 2, minForestShare: 0.25, percentile: 0.9 });
// Forest cells at least this tall (m) count as forest.
export const FOREST_FROM_M = 4;
// Big tree, small tree: a tree's size on the map (globe units, radius 100) grows with its height from 4 m to 40 m and
// over, so the tallest forests stand out far across the globe.
export const TREE_SIZE = Object.freeze({ fromM: 4, fullM: 40, smallestU: 13, tallestU: 50 });
// Only some trees grow: picked at random, the taller likelier (`tallBias`), and no two closer than `spacing` times
// the mean of their sizes, so the forest stays open. Each grows `afterSteps` after the noon line has crossed it.
const TREE_PICK = Object.freeze({ tallBias: 3, spacing: 0.46, afterSteps: [1, 10] });
// Every tree shoots up at one pace: the smallest reaches its tips in `smallestSec`, a bigger one in proportion to its size.
const TREE_GROWTH = Object.freeze({ smallestSec: 0.2 });
const PICK_SEED = 58;

/** A repeatable random sequence. */
export function seeded(seed) {
  let s = (seed * 2654435761) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A tree's size on the map (globe units) for its height in metres. */
export function treeSizeU(metres) {
  const share = Math.min(1, Math.max(0, (metres - TREE_SIZE.fromM) / (TREE_SIZE.fullM - TREE_SIZE.fromM)));
  return TREE_SIZE.smallestU + share * (TREE_SIZE.tallestU - TREE_SIZE.smallestU);
}

/** Seconds a tree `metres` tall takes to grow: the globe draws it over this long and the music holds its note as long. */
export function growSecOf(metres) {
  return (TREE_GROWTH.smallestSec * treeSizeU(metres)) / TREE_SIZE.smallestU;
}

/** The band (a voice of the music) of the forest at `lat`. */
function bandOfLat(lat) {
  return Object.keys(BAND_LATS).find((band) => lat >= BAND_LATS[band][0] && lat < BAND_LATS[band][1]) ?? (lat < 0 ? Band.SOUTH : Band.NORTH);
}

/** The angle between two places on the globe (degrees). */
function arcDeg(a, b) {
  const rad = Math.PI / 180;
  const cos = Math.sin(a.lat * rad) * Math.sin(b.lat * rad) + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.cos((a.lon - b.lon) * rad);
  return Math.acos(Math.min(1, Math.max(-1, cos))) / rad;
}

/** The trees of the canopy map: one per TREE.cellDeg square that is forest enough, as { lat, lon, metres }. */
function mapTrees(map) {
  const { width, height, metres } = map;
  const span = Math.round(TREE.cellDeg / MAP_CELL_DEG);
  const trees = [];
  for (let r0 = 0; r0 < height; r0 += span) {
    for (let c0 = 0; c0 < width; c0 += span) {
      const forest = [];
      for (let row = r0; row < Math.min(height, r0 + span); row++) {
        for (let col = c0; col < Math.min(width, c0 + span); col++) {
          const h = metres[row * width + col];
          if (h >= FOREST_FROM_M) forest.push(h);
        }
      }
      if (forest.length < TREE.minForestShare * span * span) continue;
      forest.sort((a, b) => a - b);
      trees.push({
        lat: MAP_NORTH - (r0 + span / 2) * MAP_CELL_DEG,
        lon: -180 + (c0 + span / 2) * MAP_CELL_DEG,
        metres: forest[Math.min(forest.length - 1, Math.floor(TREE.percentile * forest.length))],
      });
    }
  }
  return trees;
}

/**
 * The trees that grow on the globe, picked from the map's, each as { lat, lon, metres, band, startStep, growSec, seed }:
 * the step (fractional) it starts growing at and how long it takes (s).
 *
 * @param {{ width: number, height: number, metres: Float32Array }} map
 */
export function pickTrees(map) {
  const random = seeded(PICK_SEED);
  const unitsPerDeg = (100 * Math.PI) / 180;
  const sizeDeg = (metres) => treeSizeU(metres) / unitsPerDeg;
  const shareOf = (metres) => (treeSizeU(metres) - TREE_SIZE.smallestU) / (TREE_SIZE.tallestU - TREE_SIZE.smallestU);
  // A weighted random order: the taller a tree, the likelier it comes early.
  const order = mapTrees(map)
    .map((tree) => ({ tree, key: random() ** (1 / (1 + TREE_PICK.tallBias * shareOf(tree.metres))) }))
    .sort((a, b) => b.key - a.key)
    .map(({ tree }) => tree);
  const [afterFrom, afterTo] = TREE_PICK.afterSteps;
  const picked = [];
  for (const tree of order) {
    const crowded = picked.some((other) => arcDeg(tree, other) < ((sizeDeg(tree.metres) + sizeDeg(other.metres)) / 2) * TREE_PICK.spacing);
    if (crowded) continue;
    picked.push({
      ...tree,
      band: bandOfLat(tree.lat),
      startStep: lineStepAt(tree.lon) + afterFrom + random() * (afterTo - afterFrom),
      growSec: growSecOf(tree.metres),
      seed: Math.floor(random() * 1e9),
    });
  }
  return picked;
}

/** The trees by the whole step they start in, as a Map of step to trees; a tree that starts after the last step is left out. */
export function treesByStep(trees) {
  const byStep = new Map();
  for (const tree of trees) {
    const step = Math.floor(tree.startStep);
    if (step >= LINE_STEPS) continue;
    if (!byStep.has(step)) byStep.set(step, []);
    byStep.get(step).push(tree);
  }
  return byStep;
}

/** Seconds into the step a tree starts at, so the note can start where the tree does. */
export function startOffsetSec(tree) {
  return (tree.startStep - Math.floor(tree.startStep)) * STEP_SEC;
}
