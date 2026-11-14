// Every bird on the map drawn on the globe: a bird seen from above with flapping wings, turned the way it flies, and
// a comet tail of the last TRAIL_MS behind it. Birds fade in as their path begins and out as it ends.

import { covers, lastIndexAtOrBefore, positionAt } from '../../tracks/domain/bird-track.js';
import { createCometTrail } from './comet-trail.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const TRAIL_MS = 30 * DAY_MS;
const FADE_MS = 400;
// A bird heads the way it goes over this span of data time around now, so one jittery day does not swing it.
const HEADING_SPAN_MS = 6 * DAY_MS;
// Below this on-screen distance over HEADING_SPAN_MS a bird counts as still and keeps its heading.
const MIN_HEADING_PX = 0.5;
// A bird turns toward its heading with this time constant, the short way round.
const TURN_TAU_MS = 250;

const BIRD_SIZE_PX = 22;
// Seen from above, beak up (north). The right wing is mirrored for the left; each folds at its root to flap.
const WING = '<path d="M1.4 -2.6 C4.5 -4.6 8.5 -3.4 11.6 0.6 L9.4 0.4 L9.6 1.5 L7.4 1.2 C5.2 1.8 3 2.2 1.4 2.2Z"/>';
const BODY =
  '<path d="M0 -9.8 C0.9 -9.8 1.4 -8.4 1.3 -7.2 C2.2 -5.6 2.4 -2.4 2.1 1.2 C1.9 3.2 1.4 4.6 1.1 5.4 L2.9 8.8 L0 7.6 L-2.9 8.8 L-1.1 5.4 C-1.4 4.6 -1.9 3.2 -2.1 1.2 C-2.4 -2.4 -2.2 -5.6 -1.3 -7.2 C-1.4 -8.4 -0.9 -9.8 0 -9.8Z"/>';
const SHAPE = `<g class="bird-wing">${WING}</g><g transform="scale(-1 1)"><g class="bird-wing">${WING}</g></g>${BODY}`;
// Drawn twice, an outlined copy under a filled one, so only the outer edge is outlined.
const BIRD_SVG = `<svg viewBox="-12 -12 24 24" width="${BIRD_SIZE_PX}" height="${BIRD_SIZE_PX}">
  <g class="bird-outline">${SHAPE}</g><g class="bird-fill">${SHAPE}</g></svg>`;

/**
 * @param {{ globe: Object, unitsPerPx: () => number, setElements: (elements: Object[]) => void }} view
 */
export function createBirdsLayer(view) {
  /** @type {Map<Object, { bird: Object, trail: Object, heading: number, targetHeading: number, turnedAt: number | null }>} */
  const layers = new Map();
  let color = '#ffffff';

  /** Takes every bird off the globe, and draws the next ones in `next`. */
  function reset(next) {
    color = next;
    for (const layer of layers.values()) layer.trail.dispose();
    layers.clear();
    view.setElements([]);
  }

  function layerFor(track) {
    let layer = layers.get(track);
    if (!layer) {
      const el = document.createElement('div');
      el.className = 'bird';
      el.innerHTML = BIRD_SVG;
      const svg = el.firstElementChild;
      svg.style.color = color;
      // Each bird flaps at its own point of the beat.
      svg.style.setProperty('--flap-delay', `${-Math.random()}s`);
      layer = {
        bird: { el, lat: 0, lng: 0, shown: false, fade: null },
        trail: createCometTrail(view.globe, color),
        heading: 0,
        targetHeading: 0,
        turnedAt: null,
      };
      layers.set(track, layer);
    }
    return layer;
  }

  /**
   * Draws the birds of `tracks` on the map at `time`; birds whose path has ended fade out where they were.
   *
   * @param {import('../../tracks/domain/bird-track.js').BirdTrack[]} tracks
   * @param {number} time
   */
  function render(tracks, time) {
    const elements = [];
    const drawn = new Set();
    const unitsPerPx = view.unitsPerPx();
    for (const layer of layers.values()) layer.trail.hide();
    for (const track of tracks) {
      if (!covers(track, time)) continue;
      const layer = layerFor(track);
      const i = lastIndexAtOrBefore(track.t, time);
      const head = positionAt(track, i, time);
      // The tail starts where the bird was TRAIL_MS ago, so it has two points or more and its end glides.
      const tailTime = time - TRAIL_MS;
      const tail = lastIndexAtOrBefore(track.t, tailTime);
      const points = tail < 0 ? [] : [positionAt(track, tail, tailTime)];
      for (let j = tail + 1; j <= i; j++) points.push([track.lat[j], track.lon[j]]);
      points.push(head);
      layer.trail.update(points, unitsPerPx);
      place(layer, track, time, head);
      fade(layer.bird, true);
      elements.push(layer.bird);
      drawn.add(layer);
    }
    for (const layer of layers.values()) {
      if (drawn.has(layer)) continue;
      fade(layer.bird, false);
      if (layer.bird.fade?.playState === 'running') elements.push(layer.bird);
    }
    view.setElements(elements);
  }

  // Screen heading in degrees clockwise from up of the way the bird goes around `time`, or null while it is still.
  function headingAt(track, time) {
    const [from, to] = [time - HEADING_SPAN_MS / 2, time + HEADING_SPAN_MS / 2].map((t) => {
      const clamped = Math.min(Math.max(t, track.t[0]), track.t[track.t.length - 1]);
      return positionAt(track, lastIndexAtOrBefore(track.t, clamped), clamped);
    });
    const p = view.globe.getScreenCoords(from[0], from[1]);
    const q = view.globe.getScreenCoords(to[0], to[1]);
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    if (Math.hypot(dx, dy) < MIN_HEADING_PX) return null;
    return (Math.atan2(dx, -dy) * 180) / Math.PI;
  }

  function place(layer, track, time, [lat, lng]) {
    layer.targetHeading = headingAt(track, time) ?? layer.targetHeading;
    const now = performance.now();
    const k = layer.turnedAt === null ? 1 : 1 - Math.exp(-(now - layer.turnedAt) / TURN_TAU_MS);
    layer.turnedAt = now;
    const turn = ((((layer.targetHeading - layer.heading) % 360) + 540) % 360) - 180;
    layer.heading += k * turn;
    layer.bird.lat = lat;
    layer.bird.lng = lng;
    layer.bird.el.firstElementChild.style.transform = `rotate(${layer.heading}deg)`;
  }

  return { reset, render };
}

// Fades from the opacity it has now, so a bird that turns back mid-fade does not flash.
function fade(bird, shown) {
  if (bird.shown === shown) return;
  bird.shown = shown;
  const svg = bird.el.firstElementChild;
  const to = shown ? 1 : 0;
  // Off the globe (not yet added, or faded out and removed) a bird is fully transparent.
  const from = svg.isConnected ? getComputedStyle(svg).opacity : 1 - to;
  bird.fade?.cancel();
  bird.fade = svg.animate({ opacity: [from, to] }, { duration: FADE_MS, fill: 'forwards' });
}
