// The outline of each particle shape (ParticleShape in tracks/domain/aerosol-paths.js), as polygon corners on a square
// from -1 to 1 with y down, the way canvas and SVG both draw. The globe's marker and the toggles under it draw from here.

import { ParticleShape } from '../../tracks/domain/aerosol-paths.js';

// A star's inner corners, as a share of its outer ones.
const STAR_INNER = 0.45;

const star = Array.from({ length: 10 }, (_, i) => {
  const r = i % 2 ? STAR_INNER : 1;
  const angle = -Math.PI / 2 + (i * Math.PI) / 5;
  return [r * Math.cos(angle), r * Math.sin(angle)];
});

/** @type {Readonly<Record<string, ReadonlyArray<[number, number]>>>} */
export const SHAPE_CORNERS = Object.freeze({
  [ParticleShape.SQUARE]: [[-0.8, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8]],
  [ParticleShape.TRIANGLE]: [[0, -1], [0.95, 0.7], [-0.95, 0.7]],
  [ParticleShape.DIAMOND]: [[0, -1], [1, 0], [0, 1], [-1, 0]],
  [ParticleShape.STAR]: star,
});

/** Traces `shape` on a canvas, centred on (cx, cy), `r` from the centre to the edge of its square. */
export function traceShape(ctx, shape, cx, cy, r) {
  ctx.beginPath();
  SHAPE_CORNERS[shape].forEach(([x, y], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, cx + r * x, cy + r * y));
  ctx.closePath();
}

/** The corners of `shape` as an SVG polygon's `points`, on a viewBox of "-1 -1 2 2". */
export function svgPoints(shape) {
  return SHAPE_CORNERS[shape].map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(' ');
}
