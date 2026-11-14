// A storm season drawn on the globe. Every storm alive is the weather map's hurricane sign, a ring with two trailing
// arms, turning counterclockwise (mirrored, clockwise, south of the equator), in the colour of its strength and larger
// the stronger it is, with its name beside it, turned the way it goes and a comet tail in the track's colour behind
// it. Every storm that has formed leaves its path, faint where it formed and strong where it is, coloured by when in
// its hemisphere's season it formed; the paths stay until the track ends, so the season's map builds up.

import { Hemisphere, hemisphereOf, pathBy, seasonShare, stormsAt } from '../../tracks/domain/storm-season.js';
import { intensityOf } from '../../tracks/domain/storm-track.js';
import { lastIndexAtOrBefore, positionAt } from '../../tracks/domain/bird-track.js';
import { fade, turn } from './birds-layer.js';
import { colorRamp } from './color-ramp.js';
import { COMET, createCometTrail } from './comet-trail.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const DAY_MS = 24 * 60 * 60 * 1000;
// The comet tail behind a storm covers this much of its past.
const TAIL_MS = 30 * DAY_MS;

// The sign's colour by intensity (see intensityOf): sea blue through the tropical storm's green, a category 1's yellow
// and a category 3's orange to the red and magenta of categories 4 and 5.
const stormColor = colorRamp([
  [0, [143, 227, 255]],
  [0.25, [140, 230, 170]],
  [0.45, [244, 226, 122]],
  [0.65, [242, 154, 74]],
  [0.8, [224, 80, 80]],
  [1, [226, 104, 214]],
]);
// The sign's scale by intensity, calm to full scale.
const SCALE = Object.freeze({ calm: 0.7, full: 1.8 });
// The sign: an eye and two arms, drawn about the origin (px, before scaling).
const EYE_R = 3.2;
const ARMS = 'M0 -3.2 C4.5 -3.2 7.5 -6 8.5 -10.5 M0 3.2 C-4.5 3.2 -7.5 6 -8.5 10.5';
// Where the name sits from the storm (px); it keeps its size.
const NAME = Object.freeze({ dx: 9, dy: 4 });

// A path's colour by when in its season its storm formed (see seasonShare), the same in every ocean so a colour is a
// time of the season: a pale mint on its first day, through periwinkle, to a deep pink at its end.
const seasonColor = colorRamp([
  [0, [170, 240, 220]],
  [0.5, [120, 150, 255]],
  [1, [255, 70, 160]],
]);
// A path: 3 px wide, brightening from 0.15 of 0.75 where its storm formed to 0.75 where it went, so the way it headed
// shows.
const PATH = Object.freeze({ ...COMET, headWidthPx: 3, widthPow: 0, alpha: 0.75, tailAlpha: 0.15, alphaPow: 1 });

/**
 * @param {{ globe: Object, unitsPerPx: () => number, setElements: (elements: Object[]) => void }} view
 */
export function createStormsLayer(view) {
  /** @type {Map<Object, Object>} */
  const layers = new Map();
  let color = '#ffffff';

  /** Takes every storm and path off the globe, and draws the next tails in `next`. */
  function reset(next) {
    color = next;
    for (const layer of layers.values()) {
      layer.tail.dispose();
      layer.path.dispose();
    }
    layers.clear();
    view.setElements([]);
  }

  function layerFor(track) {
    let layer = layers.get(track);
    if (!layer) {
      const el = document.createElement('div');
      el.className = 'season-storm';
      const svg = svgEl('svg', { width: 1, height: 1 }, el);
      const size = svgEl('g', {}, svg);
      const sign = svgEl('g', { class: 'season-storm-sign' }, size);
      svgEl('circle', { r: EYE_R }, sign);
      svgEl('path', { d: ARMS }, sign);
      const name = svgEl('text', { class: 'season-storm-name', x: NAME.dx, y: NAME.dy }, svg);
      name.textContent = track.name;
      layer = {
        marker: { el, lat: 0, lng: 0, shown: false, fade: null },
        size,
        name,
        mirror: hemisphereOf(track) === Hemisphere.SOUTH ? -1 : 1,
        tail: createCometTrail(view.globe, color),
        path: createCometTrail(view.globe, seasonColor(seasonShare(track)), PATH),
        heading: 0,
        targetHeading: 0,
        turnedAt: null,
      };
      layers.set(track, layer);
    }
    return layer;
  }

  /**
   * Draws the season at `time`: the paths of every storm formed by then, and the storms alive.
   *
   * @param {import('../../tracks/domain/storm-season.js').StormTrack[]} tracks
   * @param {number} time
   */
  function render(tracks, time) {
    const unitsPerPx = view.unitsPerPx();
    for (const layer of layers.values()) {
      layer.tail.hide();
      layer.path.hide();
    }
    for (const track of tracks) {
      const path = pathBy(track, time);
      if (path.length > 1) layerFor(track).path.update(path, unitsPerPx);
    }
    const alive = new Set();
    const elements = [];
    for (const storm of stormsAt(tracks, time)) {
      const layer = layerFor(storm.track);
      layer.tail.update(tailOf(storm.track, time), unitsPerPx);
      show(layer, storm, time);
      fade(layer.marker, true);
      elements.push(layer.marker);
      alive.add(layer);
    }
    for (const layer of layers.values()) {
      if (alive.has(layer)) continue;
      fade(layer.marker, false);
      if (layer.marker.fade?.playState === 'running') elements.push(layer.marker);
    }
    view.setElements(elements);
  }

  // Places the storm's sign, turned the way it goes, coloured and sized by its wind; its name stays upright.
  function show(layer, storm, time) {
    turn(view, layer, storm.track, time);
    layer.marker.lat = storm.lat;
    layer.marker.lng = storm.lon;
    const svg = layer.marker.el.firstElementChild;
    svg.style.transform = `rotate(${layer.heading}deg)`;
    const intensity = intensityOf(storm.wind);
    svg.style.color = stormColor(intensity);
    const scale = (SCALE.calm + intensity * (SCALE.full - SCALE.calm)).toFixed(3);
    layer.size.setAttribute('transform', `scale(${layer.mirror * scale}, ${scale})`);
    layer.name.setAttribute('transform', `rotate(${-layer.heading})`);
  }

  return { reset, render };
}

// The last TAIL_MS of `track` up to `time`, starting where it was then, so the tail has two points or more and its end
// glides.
function tailOf(track, time) {
  const i = lastIndexAtOrBefore(track.t, time);
  const tailTime = time - TAIL_MS;
  const tail = lastIndexAtOrBefore(track.t, tailTime);
  const points = tail < 0 ? [] : [positionAt(track, tail, tailTime)];
  for (let j = tail + 1; j <= i; j++) points.push([track.lat[j], track.lon[j]]);
  points.push(positionAt(track, i, time));
  return points;
}

function svgEl(name, attrs, parent) {
  const el = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  parent.appendChild(el);
  return el;
}
