// Pieces of lost ice fall from where the ice was into the water at the bottom of the label. Lengths are shares of
// the label height, so the fall looks the same at any size.
const GRAVITY = 0.9;
const START_SPEED = 0.05;
const DRIFT = 0.04;
const FLUTTER = Object.freeze({ amplitude: 0.012, hz: 1.6 });
// Pieces leave over this long after the year changes, not all at once, unless told otherwise.
const SPREAD_SEC = 0.6;
const SIZE = Object.freeze({ min: 0.004, max: 0.009 });
const SPLASH = Object.freeze({ sec: 0.7, radius: 0.03 });
const ICE_COLOR = '232, 244, 255';
// A thin blue edge, so a shard shows over the pale ice it falls from.
const EDGE_COLOR = '110, 165, 225';
const SPIN = 4;
const SPLASH_COLOR = '200, 235, 255';

/**
 * A canvas over the globe where pieces of ice fall into the water. It never takes pointer events.
 *
 * @param {HTMLElement} container the globe's container
 */
export function createIceFall(container) {
  const canvas = document.createElement('canvas');
  canvas.className = 'ice-fall';
  container.append(canvas);
  const context = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let pieces = [];
  let splashes = [];
  let waterShare = 0;
  let frame = null;
  let last = null;

  function fit() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(container.clientWidth * ratio);
    canvas.height = Math.round(container.clientHeight * ratio);
  }
  new ResizeObserver(fit).observe(container);
  fit();

  function step(now) {
    const dt = last === null ? 0 : Math.min(0.05, (now - last) / 1000);
    last = now;
    const { width, height } = canvas;
    const waterY = height * (1 - waterShare);
    context.clearRect(0, 0, width, height);

    for (const piece of pieces) {
      piece.wait -= dt;
      if (piece.wait > 0) continue;
      piece.age += dt;
      piece.vy += GRAVITY * dt;
      piece.y += piece.vy * dt;
      piece.x += piece.vx * dt + Math.cos(piece.age * FLUTTER.hz * 2 * Math.PI + piece.phase) * FLUTTER.amplitude * dt;
      if (piece.y * height >= waterY) {
        piece.done = true;
        splashes.push({ x: piece.x, age: 0, size: piece.size });
        continue;
      }
      piece.angle += piece.spin * dt;
      const alpha = Math.min(1, piece.age / 0.15) * 0.95;
      const s = piece.size * height;
      // A small shard of ice, turning as it falls.
      context.save();
      context.translate(piece.x * height, piece.y * height);
      context.rotate(piece.angle);
      context.beginPath();
      context.moveTo(0, -s);
      context.lineTo(s * 0.7, -s * 0.1);
      context.lineTo(s * 0.2, s * 1.1);
      context.lineTo(-s * 0.75, s * 0.2);
      context.closePath();
      context.fillStyle = `rgba(${ICE_COLOR}, ${alpha})`;
      context.fill();
      context.lineWidth = Math.max(1, s * 0.25);
      context.strokeStyle = `rgba(${EDGE_COLOR}, ${alpha})`;
      context.stroke();
      context.restore();
    }
    pieces = pieces.filter((piece) => !piece.done);

    // A ring spreading on the surface where a piece went in.
    context.lineWidth = Math.max(1, height * 0.002);
    for (const splash of splashes) {
      splash.age += dt;
      const t = splash.age / SPLASH.sec;
      const r = (splash.size + SPLASH.radius * t) * height;
      context.strokeStyle = `rgba(${SPLASH_COLOR}, ${0.8 * (1 - t)})`;
      context.beginPath();
      context.ellipse(splash.x * height, waterY, r, r * 0.3, 0, 0, 2 * Math.PI);
      context.stroke();
    }
    splashes = splashes.filter((splash) => splash.age < SPLASH.sec);

    if (pieces.length || splashes.length) {
      frame = requestAnimationFrame(step);
    } else {
      frame = null;
      last = null;
    }
  }

  /**
   * Drops pieces of ice from screen points (pixels in the container) into the water. Points already under the water
   * line are left out.
   *
   * @param {{ x: number, y: number }[]} points
   * @param {number} [spreadSec] pieces leave one by one over this long
   */
  function drop(points, spreadSec = SPREAD_SEC) {
    if (reduceMotion.matches) return;
    const height = container.clientHeight;
    if (!height) return;
    const waterTop = 1 - waterShare;
    for (const point of points) {
      const y = point.y / height;
      if (y >= waterTop) continue;
      pieces.push({
        x: point.x / height,
        y,
        vx: (Math.random() * 2 - 1) * DRIFT,
        vy: Math.random() * START_SPEED,
        size: SIZE.min + Math.random() * (SIZE.max - SIZE.min),
        phase: Math.random() * 2 * Math.PI,
        angle: Math.random() * 2 * Math.PI,
        spin: (Math.random() * 2 - 1) * SPIN,
        wait: Math.random() * spreadSec,
        age: 0,
      });
    }
    if (frame === null && pieces.length) frame = requestAnimationFrame(step);
  }

  /** @param {number} share height of the water surface above the bottom, as a share of the container height */
  function setWaterLine(share) {
    waterShare = share;
  }

  return { drop, setWaterLine };
}
