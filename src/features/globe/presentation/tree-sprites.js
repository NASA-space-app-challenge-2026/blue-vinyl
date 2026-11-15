// Christmas trees grown by recursive branching, drawn once into one texture atlas the forest's sprites read from.
//
// A tree is a trunk with whorls of side branches that shorten toward the top (a cone), each branch splitting again
// into twigs and needles. Every stroke records when it grows, so a shader can let the tree grow up and out over time.
// The atlas holds data, not colour, one tree per cell, so a shader can tint and grow each one:
//   R  lightness (dark near the trunk, light at the tips)
//   G  growth time, 0..GROWN: the share of the growing the stroke appears at
//   B  what it is: Mark.NEEDLE, Mark.WOOD, or Mark.LIGHT (an ornament or the star)
//   A  coverage

/** What a texel of the atlas is, in its blue channel. */
export const Mark = Object.freeze({ NEEDLE: 0, WOOD: 0.5, LIGHT: 1 });

// The latest growth time a stroke gets, so that a tree is whole by the end of its growing.
export const GROWN = 0.95;
// Share of the growing the trunk takes to reach the top; the branches follow it out.
const TRUNK_SHARE = 0.55;
// The tree inside its cell (cell units): base, top, and half the width of its lowest whorl.
const BASE_Y = 0.96;
const TOP_Y = 0.06;
const HALF_WIDTH = 0.4;

/**
 * Draws one tree per shape into a row of square cells.
 *
 * @param {{ whorls: number, twigs: number, ornaments: number, star: boolean }[]} shapes
 * @param {number} cellPx
 * @returns {HTMLCanvasElement}
 */
export function drawTreeAtlas(shapes, cellPx) {
  const canvas = document.createElement('canvas');
  canvas.width = cellPx * shapes.length;
  canvas.height = cellPx;
  const ctx = canvas.getContext('2d');
  ctx.lineCap = 'round';
  shapes.forEach((shape, i) => {
    const strokes = growTree(shape, seeded(i + 1));
    // Where strokes overlap, the earliest is the one seen, so it is drawn last.
    strokes.sort((a, b) => b.t - a.t);
    ctx.save();
    ctx.translate(i * cellPx, 0);
    ctx.scale(cellPx, cellPx);
    for (const s of strokes) paint(ctx, s, cellPx);
    ctx.restore();
  });
  return canvas;
}

function paint(ctx, s, cellPx) {
  const color = `rgb(${Math.round(s.shade * 255)}, ${Math.round(s.t * 255)}, ${Math.round(s.mark * 255)})`;
  if (s.dot) {
    ctx.fillStyle = color;
    ctx.beginPath();
    if (s.star) starPath(ctx, s.x, s.y, s.r);
    else ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.strokeStyle = color;
  // At least a pixel wide, so the thinnest needles survive the mipmaps.
  ctx.lineWidth = Math.max(s.width, 1 / cellPx);
  ctx.beginPath();
  ctx.moveTo(s.x0, s.y0);
  ctx.lineTo(s.x1, s.y1);
  ctx.stroke();
}

function starPath(ctx, x, y, r) {
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const rr = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
  }
  ctx.closePath();
}

/** The strokes of one tree (cell units, y down), each with its growth time. */
function growTree({ whorls, twigs, ornaments, star }, random) {
  const strokes = [];
  const height = BASE_Y - TOP_Y;
  const trunkAt = (f) => f * TRUNK_SHARE * GROWN;

  // The trunk, in short pieces so it grows from the ground up.
  const pieces = 12;
  for (let k = 0; k < pieces; k++) {
    const f0 = k / pieces;
    const f1 = (k + 1) / pieces;
    strokes.push({
      x0: 0.5, y0: BASE_Y - f0 * height, x1: 0.5, y1: BASE_Y - f1 * height,
      width: 0.035 * (1 - 0.7 * f0), t: trunkAt(f0), mark: Mark.WOOD, shade: 0.55,
    });
  }

  // Whorls from just above the ground to near the top, each a branch to either side that droops a little, shorter
  // the higher it is.
  const branchTime = GROWN - TRUNK_SHARE * GROWN;
  for (let w = 0; w < whorls; w++) {
    const f = 0.1 + (0.85 * w) / whorls;
    const y = BASE_Y - f * height;
    const reach = HALF_WIDTH * (1 - f) * (0.85 + 0.3 * random());
    for (const side of [-1, 1]) {
      const droop = (0.25 + 0.2 * random()) * (1 - f * 0.5);
      branch(strokes, random, {
        x: 0.5, y, angle: side > 0 ? droop : Math.PI - droop, length: reach, depth: twigs,
        t0: trunkAt(f), span: branchTime * (0.6 + 0.4 * (reach / HALF_WIDTH)), shade: 0.45,
      });
    }
    // A shorter branch reaching toward the viewer fills the cone's face.
    branch(strokes, random, {
      x: 0.5, y, angle: Math.PI / 2 + (random() - 0.5) * 0.6, length: reach * 0.35, depth: Math.max(0, twigs - 1),
      t0: trunkAt(f), span: branchTime * 0.5, shade: 0.6,
    });
  }

  // Ornaments hung inside the cone, lit once the tree is grown.
  for (let k = 0; k < ornaments; k++) {
    const f = 0.12 + 0.75 * random();
    const half = HALF_WIDTH * (1 - f) * 0.8;
    strokes.push({
      dot: true, x: 0.5 + (random() * 2 - 1) * half, y: BASE_Y - f * height, r: 0.022 + 0.012 * random(),
      t: GROWN * (0.82 + 0.15 * random()), mark: Mark.LIGHT, shade: 1,
    });
  }
  if (star) strokes.push({ dot: true, star: true, x: 0.5, y: TOP_Y + 0.02, r: 0.07, t: GROWN, mark: Mark.LIGHT, shade: 1 });
  return strokes;
}

/** A branch and, `depth` times over, the twigs it splits into; the last twigs carry needles. */
function branch(strokes, random, { x, y, angle, length, depth, t0, span, shade }) {
  const x1 = x + Math.cos(angle) * length;
  const y1 = y + Math.sin(angle) * length;
  strokes.push({ x0: x, y0: y, x1, y1, width: 0.012 + 0.02 * length, t: t0, mark: depth ? Mark.WOOD : Mark.NEEDLE, shade });
  const splits = depth ? 3 : 0;
  for (let k = 1; k <= splits; k++) {
    const along = k / (splits + 1);
    const sx = x + (x1 - x) * along;
    const sy = y + (y1 - y) * along;
    for (const side of [-1, 1]) {
      branch(strokes, random, {
        x: sx, y: sy, angle: angle + side * (0.6 + 0.3 * random()), length: length * (0.45 - 0.2 * along),
        depth: depth - 1, t0: t0 + span * along, span: span * (1 - along), shade: Math.min(1, shade + 0.2),
      });
    }
  }
  if (depth) return;
  // Needles along the twig, lighter toward its tip.
  const needles = Math.max(3, Math.round(length / 0.012));
  for (let k = 0; k <= needles; k++) {
    const along = k / needles;
    const nx = x + (x1 - x) * along;
    const ny = y + (y1 - y) * along;
    for (const side of [-1, 1]) {
      const a = angle + side * 0.9;
      const n = 0.03 + 0.015 * random();
      strokes.push({
        x0: nx, y0: ny, x1: nx + Math.cos(a) * n, y1: ny + Math.sin(a) * n, width: 0.012,
        t: Math.min(GROWN, t0 + span * along), mark: Mark.NEEDLE, shade: Math.min(1, shade + 0.25 + 0.3 * along),
      });
    }
  }
}

/** A repeatable random sequence, so each tree grows the same every time. */
function seeded(seed) {
  let s = seed * 2654435761 >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
