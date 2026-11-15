// Trees that grow in real time on a 2D canvas, the forest's sprites read from it as a texture.
//
// Each tree starts as a trunk that grows up from the ground; when a branch reaches its length it splits into two or
// three thinner, shorter ones, until the tree is as many generations deep as its kind. Every frame draws only what grew
// since the last one, with globalCompositeOperation 'lighter', so where branches cross the light adds up and the
// trunk and forks burn brightest, like neon.
//
// The canvas is a grid: a column for each kind, a row for each variant (so trees of one kind are not all the same).
// It is drawn white on black, as brightness only: the shader tints it with the kind's colour.

// The trunk's base and first length in the cell (cell units, y down), and how each generation shrinks.
const ROOT = Object.freeze({ x: 0.5, y: 0.98, length: 0.24, width: 0.035 });
const SHRINK = Object.freeze({ length: [0.68, 0.82], width: 0.68 });
// The angle between a branch and its children (radians), and the share of forks that split three ways.
const SPREAD = Object.freeze({ angle: [0.35, 0.65], threeWay: 0.35 });
// Brightness each stroke adds (0..1) and the glow round it (share of the cell).
const STROKE_ALPHA = 0.5;
const GLOW = 0.018;

/**
 * @param {{ depth: number, growSec: number }[]} kinds  how many generations a kind's tree has, and how long it takes to
 *   reach its tips
 * @param {number} variants
 * @param {number} cellPx
 */
export function createTreeGrower(kinds, variants, cellPx) {
  const canvas = document.createElement('canvas');
  canvas.width = cellPx * kinds.length;
  canvas.height = cellPx * variants;
  const ctx = canvas.getContext('2d');
  let cells = [];

  /** Clears the canvas and plants every cell's tree again, variant v starting `startSec[v]` (seconds) from now. */
  function restart(now, startSec) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    cells = [];
    kinds.forEach((kind, k) => {
      for (let v = 0; v < variants; v++) {
        const random = seeded(k * variants + v + 1);
        // Grown at a pace that brings the tips out at `growSec`: the path from the root to a tip is the trunk plus
        // each generation's mean share of the one before.
        const meanShrink = (SHRINK.length[0] + SHRINK.length[1]) / 2;
        const path = (ROOT.length * (1 - meanShrink ** (kind.depth + 1))) / (1 - meanShrink);
        cells.push({
          col: k, row: v, random, depth: kind.depth, speed: path / kind.growSec,
          startAt: now + startSec[v], lastAt: null,
          growing: [{ x: ROOT.x, y: ROOT.y, angle: -Math.PI / 2, length: ROOT.length, grown: 0, width: ROOT.width, generation: 0 }],
        });
      }
    });
  }

  /** Draws what grew up to `now` (seconds). Returns whether any tree is still growing. */
  function step(now) {
    let busy = false;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(255, 255, 255, ${STROKE_ALPHA})`;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = GLOW * cellPx;
    for (const cell of cells) {
      if (!cell.growing.length) continue;
      busy = true;
      if (now < cell.startAt) continue;
      const dt = Math.min(0.1, now - (cell.lastAt ?? cell.startAt));
      cell.lastAt = now;
      ctx.save();
      ctx.beginPath();
      ctx.rect(cell.col * cellPx, cell.row * cellPx, cellPx, cellPx);
      ctx.clip();
      ctx.translate(cell.col * cellPx, cell.row * cellPx);
      ctx.scale(cellPx, cellPx);
      ctx.shadowBlur = GLOW * cellPx;
      cell.growing = cell.growing.flatMap((b) => grow(cell, b, cell.speed * dt));
      ctx.restore();
    }
    return busy;
  }

  /** Grows branch `b` by `by` and draws the new piece; returns what grows on: itself, or its children once it is done. */
  function grow(cell, b, by) {
    const from = Math.min(b.grown, b.length);
    b.grown = Math.min(b.length, b.grown + by);
    const dx = Math.cos(b.angle);
    const dy = Math.sin(b.angle);
    ctx.lineWidth = Math.max(b.width, 1 / cellPx);
    ctx.beginPath();
    ctx.moveTo(b.x + dx * from, b.y + dy * from);
    ctx.lineTo(b.x + dx * b.grown, b.y + dy * b.grown);
    ctx.stroke();
    if (b.grown < b.length) return [b];
    if (b.generation >= cell.depth) return [];
    const { random } = cell;
    const n = random() < SPREAD.threeWay ? 3 : 2;
    const x = b.x + dx * b.length;
    const y = b.y + dy * b.length;
    const children = [];
    for (let i = 0; i < n; i++) {
      const spread = SPREAD.angle[0] + random() * (SPREAD.angle[1] - SPREAD.angle[0]);
      children.push({
        x, y,
        angle: b.angle + (i - (n - 1) / 2) * spread + (random() - 0.5) * 0.2,
        length: b.length * (SHRINK.length[0] + random() * (SHRINK.length[1] - SHRINK.length[0])),
        grown: 0,
        width: b.width * SHRINK.width,
        generation: b.generation + 1,
      });
    }
    return children;
  }

  return { canvas, restart, step };
}

/** A repeatable random sequence, so each variant grows the same every time. */
function seeded(seed) {
  let s = (seed * 2654435761) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
