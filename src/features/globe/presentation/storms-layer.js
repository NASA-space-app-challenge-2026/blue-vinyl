// A storm season drawn on the globe: every storm alive is a spinning storm symbol with its name, counterclockwise in
// the north and clockwise in the south, coloured and sized by its wind; every storm that has formed leaves the path it
// has gone, faint where it formed and strong where it is, coloured by when in the season it formed. The paths stay
// until the track ends, so the season's map builds up.

import {
  calendarShare,
  categoryOf,
  hemisphereOf,
  Hemisphere,
  pathBy,
  stormsAt,
} from '../../tracks/domain/storm-season.js';
import { fade } from './birds-layer.js';
import { createCometTrail } from './comet-trail.js';

// Symbol colour by Saffir-Simpson category, from a tropical depression (-1) to category 5.
const CATEGORY_COLOR = Object.freeze({ '-1': '#8ecdf2', 0: '#9be7c4', 1: '#ffe08a', 2: '#ffbf69', 3: '#ff8c61', 4: '#f2545b', 5: '#d03a7a' });
// Symbol size: the depression's, and what each category adds.
const SIZE_PX = Object.freeze({ base: 16, perCategory: 3 });
// Path colour by where in its hemisphere's storm calendar the storm formed: pale mint on the first day, lilac, deep
// pink on the last.
const CALENDAR_COLORS = Object.freeze(['#a6eedb', '#c3a9f2', '#e2468f']);
// A path: 3 px wide, 0.11 opaque where the storm formed and 0.75 where it is.
const PATH = Object.freeze({ headWidthPx: 3, widthPow: 0, alpha: 0.75, tailAlpha: 0.11 / 0.75, alphaPow: 1, coreWhite: 0, additive: false });

// The classic storm symbol: an eye with two arms, the arms trailing counterclockwise as the northern symbol spins.
const SYMBOL = `<svg class="storm-symbol" viewBox="-12 -12 24 24">
  <path d="M0 -4 C-5 -4 -6 -9 -2 -11 C-7 -11 -10 -6 -8 -1 Z M0 4 C5 4 6 9 2 11 C7 11 10 6 8 1 Z"/>
  <circle r="5.2"/></svg>`;

/**
 * @param {{ globe: Object, unitsPerPx: () => number, setElements: (elements: Object[]) => void }} view
 */
export function createStormsLayer(view) {
  /** @type {Map<Object, { marker: Object, trail: Object, shown: boolean }>} */
  const layers = new Map();

  /** Takes every storm and path off the globe. */
  function reset() {
    for (const layer of layers.values()) layer.trail.dispose();
    layers.clear();
    view.setElements([]);
  }

  function layerFor(track) {
    let layer = layers.get(track);
    if (!layer) {
      const el = document.createElement('div');
      el.className = 'storm';
      const body = document.createElement('div');
      body.className = `storm-body${hemisphereOf(track) === Hemisphere.SOUTH ? ' storm-south' : ''}`;
      body.innerHTML = SYMBOL;
      const name = document.createElement('span');
      name.className = 'storm-name';
      name.textContent = track.name;
      body.append(name);
      el.append(body);
      const color = calendarColor(calendarShare(track.t[0], hemisphereOf(track)));
      layer = { marker: { el, lat: 0, lng: 0, shown: false, fade: null }, trail: createCometTrail(view.globe, color, PATH) };
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
    for (const track of tracks) {
      if (time < track.t[0]) {
        layers.get(track)?.trail.hide();
        continue;
      }
      const path = pathBy(track, time);
      const layer = layerFor(track);
      if (path.length > 1) layer.trail.update(path, unitsPerPx);
      else layer.trail.hide();
    }
    const alive = new Set();
    const elements = [];
    for (const storm of stormsAt(tracks, time)) {
      const { marker } = layerFor(storm.track);
      const category = categoryOf(storm.wind);
      const body = marker.el.firstElementChild;
      body.style.color = CATEGORY_COLOR[category];
      body.style.setProperty('--storm-size', `${SIZE_PX.base + SIZE_PX.perCategory * (category + 1)}px`);
      marker.lat = storm.lat;
      marker.lng = storm.lon;
      fade(marker, true);
      elements.push(marker);
      alive.add(storm.track);
    }
    for (const [track, { marker }] of layers) {
      if (alive.has(track)) continue;
      fade(marker, false);
      if (marker.fade?.playState === 'running') elements.push(marker);
    }
    view.setElements(elements);
  }

  return { reset, render };
}

// The calendar colour at `share` (0..1) along CALENDAR_COLORS.
function calendarColor(share) {
  const position = share * (CALENDAR_COLORS.length - 1);
  const i = Math.min(Math.floor(position), CALENDAR_COLORS.length - 2);
  const f = position - i;
  const [a, b] = [CALENDAR_COLORS[i], CALENDAR_COLORS[i + 1]].map((hex) => [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16)));
  return `rgb(${a.map((v, k) => Math.round(v + f * (b[k] - v))).join(', ')})`;
}
