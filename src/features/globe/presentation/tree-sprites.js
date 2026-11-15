// A tree that grows in real time on its own 2D canvas, for a sprite on the globe to show as a texture.
//
// The trunk grows up from the ground, bending a little as it goes. A growing branch puts out side shoots along the
// way and, at its end, forks: one child carries on near its line, the other leans off; now and then a shoot does not
// grow at all, so the crown stays open. Every frame draws only what grew since the last one, in the tree's colour,
// with globalCompositeOperation 'lighter', so where branches cross the light adds up and the trunk glows brightest,
// like neon. Round each piece a wider, fainter one is its glow (cheap, unlike a shadow blur, which made the frames
// stutter). A piece is a quad whose first edge is the last piece's last edge, so a branch that bends has no dark wedge
// or bright overlap at its joints (stroked pieces with butt caps left a ladder of dark cracks across the trunk). The canvas is otherwise transparent, so it adds nothing to the globe or the page around it.

import { seeded } from '../../tracks/domain/forest-trees.js';

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
// Brightness: the trunk's stroke alpha, falling by `fade` each generation; the glow round a stroke, as a multiple of
// its width and a share of its alpha.
const STROKE = Object.freeze({ alpha: 0.85, fade: 0.82, glowWidth: 3, glowAlpha: 0.22 });
// The most a frame may grow a tree by (s), so a long pause does not draw it all at once.
const MAX_FRAME_SEC = 0.25;

/**
 * @param {{ color: string, depth: number, growSec: number, sizePx: number, seed: number }} tree  its colour (CSS), how
 *   many generations it branches, how long it takes to reach its tips (s), its canvas size and its random seed
 */
export function createGrowingTree({ color, depth, growSec, sizePx, seed }) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = sizePx;
  const ctx = canvas.getContext('2d');
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
    return { x, y, angle, length, width, generation, grown: 0, toPiece: PIECE, shootAt, core: null, glow: null };
  }

  /** Draws what grew up to `now` (seconds). Returns whether the tree is still growing. */
  function step(now) {
    if (!growing.length) return false;
    const dt = Math.min(MAX_FRAME_SEC, lastAt === null ? 0 : now - lastAt);
    lastAt = now;
    ctx.save();
    ctx.scale(sizePx, sizePx);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = color;
    growing = growing.flatMap((b) => grow(b, speed * dt));
    ctx.restore();
    return growing.length > 0;
  }

  /** A branch's width where `grown` of it is drawn: it tapers toward its tip, but stays a pixel or so wide. */
  function widthAt(b, grown) {
    return Math.max(b.width * (1 - 0.35 * (grown / b.length)), 1.2 / sizePx);
  }

  /** The two corners of a piece's edge across a branch at (x, y) heading `angle`, `half` either side. */
  function edgeAt(x, y, angle, half) {
    const nx = -Math.sin(angle) * half;
    const ny = Math.cos(angle) * half;
    return [x + nx, y + ny, x - nx, y - ny];
  }

  /** Fills the piece between edge `from` and edge `to`. */
  function fill(from, to) {
    ctx.beginPath();
    ctx.moveTo(from[0], from[1]);
    ctx.lineTo(to[0], to[1]);
    ctx.lineTo(to[2], to[3]);
    ctx.lineTo(from[2], from[3]);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Closes the fork where `child` leaves `parent`: the child's first edge is across its own line, so on the outer side
   * of the turn it leaves a dark wedge between itself and the parent's last edge. Fills that wedge, a triangle from the
   * fork to the parent's corner and the child's corner on that side.
   */
  function closeFork(parent, child) {
    const [px, py] = [parent.x, parent.y];
    const width = widthAt(child, 0);
    const alpha = STROKE.alpha * STROKE.fade ** child.generation;
    for (const [parentEdge, scale, share] of [
      [parent.glow, STROKE.glowWidth, STROKE.glowAlpha],
      [parent.core, 1, 1],
    ]) {
      const childEdge = edgeAt(px, py, child.angle, (width * scale) / 2);
      // The child's corner that lies ahead of the parent's end is the one outside the parent.
      const ahead = (corner) => (childEdge[corner] - px) * Math.cos(parent.angle) + (childEdge[corner + 1] - py) * Math.sin(parent.angle);
      const side = ahead(0) > ahead(2) ? 0 : 2;
      ctx.globalAlpha = alpha * share;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(parentEdge[side], parentEdge[side + 1]);
      ctx.lineTo(childEdge[side], childEdge[side + 1]);
      ctx.closePath();
      ctx.fill();
    }
  }

  /** Grows branch `b` by `by`, drawing it piece by piece; returns what grows on. */
  function grow(b, by) {
    const out = [];
    let left = by;
    while (left > 0 && b.grown < b.length) {
      const piece = Math.min(left, b.toPiece, b.length - b.grown);
      const x1 = b.x + Math.cos(b.angle) * piece;
      const y1 = b.y + Math.sin(b.angle) * piece;
      const alpha = STROKE.alpha * STROKE.fade ** b.generation;
      const width = widthAt(b, b.grown);
      b.core ??= edgeAt(b.x, b.y, b.angle, width / 2);
      b.glow ??= edgeAt(b.x, b.y, b.angle, (width * STROKE.glowWidth) / 2);
      const widthEnd = widthAt(b, b.grown + piece);
      const core = edgeAt(x1, y1, b.angle, widthEnd / 2);
      const glow = edgeAt(x1, y1, b.angle, (widthEnd * STROKE.glowWidth) / 2);
      ctx.globalAlpha = alpha * STROKE.glowAlpha;
      fill(b.glow, glow);
      ctx.globalAlpha = alpha;
      fill(b.core, core);
      b.core = core;
      b.glow = glow;
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
    const leaderChild = branch(b.x, b.y, b.angle + (random() - 0.5) * 2 * ANGLE.leader, b.length * between(SHRINK.leader), width, b.generation + 1);
    closeFork(b, leaderChild);
    out.push(leaderChild);
    if (random() < CHANCE.fork) {
      const forkChild = branch(b.x, b.y, b.angle + side * between(ANGLE.fork), b.length * between(SHRINK.fork), width * 0.85, b.generation + 1);
      closeFork(b, forkChild);
      out.push(forkChild);
    }
    return out;
  }

  return { canvas, step };
}
