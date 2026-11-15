// A tree that grows in real time on its own 2D canvas, for a sprite on the globe to show as a texture.
//
// The trunk grows up from the ground, bending a little as it goes. A growing branch puts out side shoots along the
// way and, at its end, forks: one child carries on near its line, the other leans off; now and then a shoot does not
// grow at all, so the crown stays open. Every frame draws only what grew since the last one, in the tree's colour,
// with globalCompositeOperation 'lighter', so where branches cross the light adds up and the trunk glows brightest,
// like neon. The canvas is opaque black, which adds nothing to the globe.

// The trunk's base, first length and width in the canvas (canvas units, y down).
const ROOT = Object.freeze({ x: 0.5, y: 0.985, length: 0.22, width: 0.03 });
// A child's length and width as a share of its parent's; a side shoot's length as a share of its parent's.
const SHRINK = Object.freeze({ leader: [0.7, 0.85], fork: [0.5, 0.72], shoot: [0.25, 0.45], width: 0.62 });
// Angles (radians): the leader keeps near its parent's line, the fork and the shoots lean off it; every piece turns
// by up to `wander`, and is drawn up toward the sky by `rise`.
const ANGLE = Object.freeze({ leader: 0.25, fork: [0.45, 0.85], shoot: [0.7, 1.1], wander: 0.12, rise: 0.04 });
// Chances: a fork's second child grows; a shoot along a branch grows (per branch, from the second generation).
const CHANCE = Object.freeze({ fork: 0.8, shoot: 0.55 });
// Length of the pieces a branch is drawn in, so it can bend (canvas units).
const PIECE = 0.02;
// Brightness: the trunk's stroke alpha, falling by `fade` each generation; the glow round the strokes (canvas share).
const STROKE = Object.freeze({ alpha: 0.85, fade: 0.82, glow: 0.012 });

/**
 * @param {{ color: string, depth: number, growSec: number, sizePx: number, seed: number }} tree  its colour (CSS), how
 *   many generations it branches, how long it takes to reach its tips (s), its canvas size and its random seed
 */
export function createGrowingTree({ color, depth, growSec, sizePx, seed }) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = sizePx;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, sizePx, sizePx);
  const random = seeded(seed);
  const between = ([low, high]) => low + random() * (high - low);
  // Grown at a pace that brings the tips out at `growSec`: the path from the root along the leaders to the top.
  const leader = (SHRINK.leader[0] + SHRINK.leader[1]) / 2;
  const speed = (ROOT.length * (1 - leader ** (depth + 1))) / (1 - leader) / growSec;
  let growing = [branch(ROOT.x, ROOT.y, -Math.PI / 2, ROOT.length, ROOT.width, 0)];
  let lastAt = null;

  function branch(x, y, angle, length, width, generation) {
    // Where along it a side shoot comes out, if one does.
    const shootAt = generation >= 1 && generation < depth && random() < CHANCE.shoot ? 0.3 + 0.5 * random() : null;
    return { x, y, angle, length, width, generation, grown: 0, toPiece: PIECE, shootAt };
  }

  /** Draws what grew up to `now` (seconds). Returns whether the tree is still growing. */
  function step(now) {
    if (!growing.length) return false;
    const dt = Math.min(0.1, lastAt === null ? 0 : now - lastAt);
    lastAt = now;
    ctx.save();
    ctx.scale(sizePx, sizePx);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'butt';
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = STROKE.glow * sizePx;
    growing = growing.flatMap((b) => grow(b, speed * dt));
    ctx.restore();
    return growing.length > 0;
  }

  /** Grows branch `b` by `by`, drawing it piece by piece; returns what grows on. */
  function grow(b, by) {
    const out = [];
    let left = by;
    while (left > 0 && b.grown < b.length) {
      const piece = Math.min(left, b.toPiece, b.length - b.grown);
      const x1 = b.x + Math.cos(b.angle) * piece;
      const y1 = b.y + Math.sin(b.angle) * piece;
      const taper = 1 - 0.35 * (b.grown / b.length);
      ctx.globalAlpha = STROKE.alpha * STROKE.fade ** b.generation;
      ctx.lineWidth = Math.max(b.width * taper, 1.2 / sizePx);
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      const before = b.grown / b.length;
      b.x = x1;
      b.y = y1;
      b.grown += piece;
      left -= piece;
      b.toPiece -= piece;
      if (b.toPiece <= 0) {
        // A new piece: turn a little at random, and a little up toward the sky.
        b.toPiece = PIECE;
        b.angle += (random() - 0.5) * 2 * ANGLE.wander;
        b.angle += Math.sin(-Math.PI / 2 - b.angle) * ANGLE.rise;
      }
      if (b.shootAt !== null && before < b.shootAt && b.grown / b.length >= b.shootAt) {
        const side = random() < 0.5 ? -1 : 1;
        out.push(branch(b.x, b.y, b.angle + side * between(ANGLE.shoot), b.length * between(SHRINK.shoot), b.width * SHRINK.width * 0.8, b.generation + 1));
      }
    }
    if (b.grown < b.length) return [b, ...out];
    if (b.generation >= depth) return out;
    // The fork: a leader near the line, and maybe a second child leaning off to one side.
    const side = random() < 0.5 ? -1 : 1;
    const width = b.width * SHRINK.width;
    out.push(branch(b.x, b.y, b.angle + (random() - 0.5) * 2 * ANGLE.leader, b.length * between(SHRINK.leader), width, b.generation + 1));
    if (random() < CHANCE.fork) {
      out.push(branch(b.x, b.y, b.angle + side * between(ANGLE.fork), b.length * between(SHRINK.fork), width * 0.85, b.generation + 1));
    }
    return out;
  }

  return { canvas, step };
}

/** A repeatable random sequence. */
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
