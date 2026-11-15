// The trees of the forest track, picked once from the canopy map and shared by the globe and the music: a tree is drawn
// growing and played as one note, from the step it starts at for as long as it takes to grow. Picked with a seeded random
// sequence, so a tree is the same for the eye and the ear and on every play.

import { LINE_STEPS, lineStepAt } from './noon-line.js';

// Canopy PNG is 0.25°.
const MAP_CELL_DEG = 0.25;
const MAP_NORTH = 52;
// The forest stands on each 2° square of the map where at least a quarter of the square is forest. A tree is as tall as
// the tall canopy (90th percentile) of the forest cells it stands for.
const TREE = Object.freeze({ cellDeg: 2, minForestShare: 0.25, percentile: 0.9 });
// Forest cells at least this tall (m) count as forest.
export const FOREST_FROM_M = 4;
// Big tree, small tree: a tree's size on the map (globe units, radius 100) grows with its height from 4 m to 40 m and
// over, so the tallest forests stand out far across the globe.
export const TREE_SIZE = Object.freeze({ fromM: 4, fullM: 40, smallestU: 13, tallestU: 50 });
// Each height class a kind of tree: the globe gives each its colour and the music its instrument. A tree is of the
// tallest class it reaches.
export const TreeKind = Object.freeze({ GREEN: 'green', BLUE: 'blue', SKY: 'sky', PURPLE: 'purple', GOLD: 'gold' });
/** The kinds from the lowest up, each with the height (m) it starts at. */
export const TREE_KINDS = Object.freeze([
  { kind: TreeKind.GREEN, fromM: 4 },
  { kind: TreeKind.BLUE, fromM: 8 },
  { kind: TreeKind.SKY, fromM: 14 },
  { kind: TreeKind.PURPLE, fromM: 20 },
  { kind: TreeKind.GOLD, fromM: 28 },
]);
// A tree for every `cellsPerTree` forest cells (0.25°) of a square, so a thick forest has more. Each starts to grow
// `afterStep` steps after the noon line has crossed it, plus a random time inside a window that is `thinWindow` steps
// long for a thin forest and `thickWindow` for a thick one, so a thick forest bursts and a thin one trickles.
const TREE_PICK = Object.freeze({ cellsPerTree: 124, afterStep: 1, thinWindow: 9, thickWindow: 1 });
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

/** The kind of a tree `metres` tall, as { kind, fromM, toM }: `toM` is where the next kind starts (the size where trees stop growing taller for the last). */
export function kindOf(metres) {
  const i = TREE_KINDS.findLastIndex((k) => metres >= k.fromM);
  const at = Math.max(0, i);
  return { ...TREE_KINDS[at], toM: TREE_KINDS[at + 1]?.fromM ?? TREE_SIZE.fullM };
}

/**
 * The trees that grow on the globe, picked from the map, each as { lat, lon, metres, kind, startStep, growSec, seed }:
 * the whole step (a sixteenth) it starts growing at and how long it takes (s). Each 2° square that is forest enough grows one
 * tree for every `cellsPerTree` of its forest cells, so a thick forest stands thick, and its trees start growing
 * close together, a thin one stands apart and starts one by one.
 *
 * @param {{ width: number, height: number, metres: Float32Array }} map
 */
export function pickTrees(map) {
  const random = seeded(PICK_SEED);
  const { width, height, metres } = map;
  const span = Math.round(TREE.cellDeg / MAP_CELL_DEG);
  const [afterFrom, thinWindow, thickWindow] = [TREE_PICK.afterStep, TREE_PICK.thinWindow, TREE_PICK.thickWindow];
  const picked = [];
  for (let r0 = 0; r0 < height; r0 += span) {
    for (let c0 = 0; c0 < width; c0 += span) {
      const forest = [];
      for (let row = r0; row < Math.min(height, r0 + span); row++) {
        for (let col = c0; col < Math.min(width, c0 + span); col++) {
          const h = metres[row * width + col];
          if (h >= FOREST_FROM_M) {
            forest.push({ lat: MAP_NORTH - (row + 0.5) * MAP_CELL_DEG, lon: -180 + (col + 0.5) * MAP_CELL_DEG, metres: h });
          }
        }
      }
      const share = forest.length / (span * span);
      if (share < TREE.minForestShare) continue;
      // How thick the forest is, 0 where it only just counts to 1 where it fills the square.
      const thick = (share - TREE.minForestShare) / (1 - TREE.minForestShare);
      const window = thinWindow + (thickWindow - thinWindow) * thick;
      // The square's forest cells in a random order, a tree for each run of `cellsPerTree`: it stands at the run's first
      // cell and is as tall as the run's tall canopy (90th percentile).
      for (let i = forest.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [forest[i], forest[j]] = [forest[j], forest[i]];
      }
      // A square's trees: its forest cells over `cellsPerTree`, the whole trees and then, by chance, one more for the rest,
      // so a thin square often stands empty and a thick one always has its tree.
      const wanted = forest.length / TREE_PICK.cellsPerTree;
      const count = Math.floor(wanted) + (random() < wanted - Math.floor(wanted) ? 1 : 0);
      if (!count) continue;
      for (let t = 0; t < count; t++) {
        const run = forest.slice(Math.floor((t * forest.length) / count), Math.floor(((t + 1) * forest.length) / count));
        const heights = run.map((cell) => cell.metres).sort((a, b) => a - b);
        const tall = heights[Math.min(heights.length - 1, Math.floor(TREE.percentile * heights.length))];
        const startStep = Math.round(lineStepAt(run[0].lon) + afterFrom + random() * window);
        // A tree that would start after the line has gone once round is never grown.
        if (startStep >= LINE_STEPS) continue;
        picked.push({
          lat: run[0].lat,
          lon: run[0].lon,
          metres: tall,
          kind: kindOf(tall).kind,
          startStep,
          growSec: growSecOf(tall),
          seed: Math.floor(random() * 1e9),
        });
      }
    }
  }
  return picked;
}

/** The trees by the step they start in, as a Map of step to trees. */
export function treesByStep(trees) {
  const byStep = new Map();
  for (const tree of trees) {
    if (!byStep.has(tree.startStep)) byStep.set(tree.startStep, []);
    byStep.get(tree.startStep).push(tree);
  }
  return byStep;
}

