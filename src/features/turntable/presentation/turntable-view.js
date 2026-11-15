import { PlaybackState } from '../../controls/domain/playback-state.js';
import {
  GROOVE,
  INNER_BEARING,
  LABEL_RADIUS,
  PIVOT,
  PLATTER,
  RECORD_RAISE,
  REST_BEARING,
  TONEARM,
  armBearing,
  grooveProgress,
  grooveRadius,
  needleAt,
  needleRadius,
  progressAt,
} from '../domain/geometry.js';

// Record-player drawing. Lengths are in vinyl radii (see geometry.js); screen directions use y down.

const RAD = Math.PI / 180;
const GROOVE_PITCH = 0.012;
// Faint bright arcs scattered over the grooves; unlike the round grooves they show the record turning.
const GROOVE_GLINT = Object.freeze({ minDeg: 20, spreadDeg: 70 });
// Fixed reflections of a light at the upper left: two opposite wedges, a wide soft one and a narrow bright one.
const SHEEN = Object.freeze({ angleDeg: -50, wide: { halfDeg: 16, opacity: 0.09 }, narrow: { halfDeg: 4, opacity: 0.14 }, blur: 0.03 });
// The credits run round the record's rim, in the band outside the grooves, turning with the record: centred on
// `radius`, halfway between the first track's groove and the rim, read clockwise from 6 o'clock so they sit upright and
// centred at 12 at rest, at `fontSize` unless they need less to fit `maxTurn` of the circle. Their baseline runs
// half their capitals' height (`capHeightEm`, of the font size) inside `radius`, so the letters are centred on it the
// same in every browser, which place dominant-baseline along a path each their own way.
const CREDIT = Object.freeze({ radius: (GROOVE.outerRadius + 1) / 2, fontSize: 0.026, maxTurn: 0.96, capHeightEm: 0.7 });
const ARM_WIDTH = 0.018;
// Invisible stroke along the tube that makes the thin arm easy to grab.
const ARM_GRAB_WIDTH = 0.08;
const COUNTERWEIGHT = Object.freeze({ length: 0.2, width: 0.07, height: 0.09, rings: 5 });
const BASE_RADIUS = 0.12;
const BEARING_RADIUS = 0.065;
const PIVOT_CAP_RADIUS = 0.03;
const GIMBAL = Object.freeze({ width: 0.1, height: 0.045 });
// The tube runs straight from the pivot for `straight`, then bends so the headshell meets the groove at `offsetDeg`
// (turned toward the record centre) while the needle stays on the pivot-to-needle line.
const BEND = Object.freeze({ straight: 0.5, reach: 0.22 });
const HEADSHELL = Object.freeze({ width: 0.06, length: 0.15, overhang: 0.025, offsetDeg: 22 });
const CARTRIDGE = Object.freeze({ width: 0.04, length: 0.07 });
const FINGER_LIFT = Object.freeze({ reach: 0.05, width: 0.008 });
const NEEDLE_RADIUS = 0.008;
// A hand pressed on the record holds it; it turns the record once the pointer has moved `slopPx` from where it went
// down. Let go within `clickMs` without turning it, the press was a click. On release the record keeps the hand's
// speed over its last `sampleMs`, at most `maxSpeed` times full speed.
const HAND = Object.freeze({ slopPx: 4, clickMs: 300, sampleMs: 80, maxSpeed: 4 });
// Degrees the platter turns in a second at full speed.
const FULL_DEG_PER_SEC = (360 * PLATTER.rpm) / 60;
// Time constant (s) of the arm's ease toward its target, and how close (deg) counts as arrived.
const GLIDE_TAU_SEC = 0.15;
const GLIDE_SETTLE_DEG = 0.05;
// A move of the needle's groove by more than this (deg of arm swing) at once, such as a seek, glides there instead of
// jumping; playback itself moves far less than this a frame.
const ARM_JUMP_DEG = 0.5;

const COLOR = Object.freeze({
  vinyl: '#0d0d0d',
  vinylEdge: 'rgba(255, 255, 255, 0.12)',
  groove: 'rgba(255, 255, 255, 0.05)',
  grooveGlint: 'rgba(255, 255, 255, 0.04)',
  sheen: '#fff',
  trackGap: 'rgba(255, 255, 255, 0.2)',
  credit: 'rgba(255, 255, 255, 0.15)',
  labelBackdrop: '#1c1d22',
  arm: '#cfcfcf',
  armEdge: 'rgba(0, 0, 0, 0.3)',
  // Chrome tube as stacked strokes drawn in order: [width, colour, shift toward the light] in tube widths.
  // A soft body, brighter bands closing in on a specular streak, and a faint reflected rim on the shadow side.
  tube: [
    [1, '#7d7d7d', 0],
    [0.8, '#a6a6a6', 0.06],
    [0.55, '#d4d4d4', 0.12],
    [0.22, '#ffffff', 0.18],
    [0.1, 'rgba(255, 255, 255, 0.35)', -0.36],
  ],
  // Cylindrical metal, shaded across its width: [offset, colour] stops.
  metal: [[0, '#5c5c5c'], [0.35, '#f2f2f2'], [0.6, '#c4c4c4'], [1, '#4f4f4f']],
  counterweight: [[0, '#3a3a3a'], [0.4, '#9a9a9a'], [0.65, '#7a7a7a'], [1, '#2e2e2e']],
  counterweightRing: 'rgba(0, 0, 0, 0.35)',
  cartridge: '#1a1a1a',
  cartridgeEdge: 'rgba(255, 255, 255, 0.25)',
  needle: '#fff',
  base: [[0, '#3a3a3a'], [1, '#141414']],
  baseEdge: 'rgba(255, 255, 255, 0.35)',
  pivotCap: [[0, '#fff'], [1, '#8a8a8a']],
});

// Area the record and the tonearm cover, whichever way the arm points.
const BOUNDS = (() => {
  const left = -1;
  const right = Math.max(1, PIVOT.x + BASE_RADIUS, needleAt(REST_BEARING).x + HEADSHELL.width);
  // The counterweight swings around the pivot, so reserve its reach in every direction above it.
  const top = Math.min(-1, PIVOT.y - Math.max(BASE_RADIUS, COUNTERWEIGHT.length));
  // The room the record was raised out of stays below it, so the arm stands where it did.
  const bottom = 1 + RECORD_RAISE;
  return Object.freeze({ left, top, width: right - left, height: bottom - top });
})();

// Without `width` (in vinyl radii) the stroke is a 1px hairline at any size.
function circle(r, fill, stroke, width) {
  const strokeWidth = width === undefined ? 'stroke-width="1" vector-effect="non-scaling-stroke"' : `stroke-width="${width}"`;
  return `<circle r="${r}" fill="${fill}" stroke="${stroke}" ${strokeWidth}/>`;
}

// Point at `deg` clockwise from up on a circle of radius `r`.
function polar(r, deg) {
  return `${r * Math.sin(deg * RAD)} ${-r * Math.cos(deg * RAD)}`;
}

function arc(r, fromDeg, toDeg, stroke) {
  return `<path d="M ${polar(r, fromDeg)} A ${r} ${r} 0 0 1 ${polar(r, toDeg)}" fill="none" stroke="${stroke}"
    stroke-width="1" vector-effect="non-scaling-stroke"/>`;
}

// Ring sector between the label and the rim, `halfDeg` either side of `deg`.
function wedge(deg, halfDeg, opacity) {
  const [from, to] = [deg - halfDeg, deg + halfDeg];
  const r = LABEL_RADIUS;
  return `<path d="M ${polar(r, from)} L ${polar(1, from)} A 1 1 0 0 1 ${polar(1, to)}
    L ${polar(r, to)} A ${r} ${r} 0 0 0 ${polar(r, from)} Z" fill="${COLOR.sheen}" opacity="${opacity}"/>`;
}

function sheenSvg() {
  const { angleDeg, wide, narrow } = SHEEN;
  return [angleDeg, angleDeg + 180]
    .flatMap((deg) => [wedge(deg, wide.halfDeg, wide.opacity), wedge(deg, narrow.halfDeg, narrow.opacity)])
    .join('');
}

function stops(colors) {
  return colors.map(([offset, color]) => `<stop offset="${offset}" stop-color="${color}"/>`).join('');
}

// The circle of radius `r` the credits' baseline runs along: from 6 o'clock clockwise round and back, so its middle
// is at 12.
function creditPath(r) {
  return `M 0 ${r} A ${r} ${r} 0 1 1 0 ${-r} A ${r} ${r} 0 1 1 0 ${r}`;
}

// The vinyl is drawn in three layers so the turning part never makes the rest redraw: the disc and its grooves (base),
// the glints and credits that turn with the record (spin, turned by a CSS transform on its own compositor layer), and
// the fixed sheen and label backdrop over them (top). Turning the spin group inside one big filtered SVG had the
// browser re-rasterize all of it every frame, and the record blinked out whenever a frame missed that.
function vinylBaseSvg() {
  const grooves = [];
  for (let g = GROOVE.innerRadius; g <= GROOVE.outerRadius; g += GROOVE_PITCH) grooves.push(circle(g, 'none', COLOR.groove));
  return `${circle(1, COLOR.vinyl, COLOR.vinylEdge)}
    ${grooves.join('')}
    <g class="vinyl-track-gaps"></g>`;
}

function vinylSpinSvg() {
  const glints = [];
  for (let g = GROOVE.innerRadius, i = 0; g <= GROOVE.outerRadius; g += GROOVE_PITCH, i++) {
    // Golden-angle starts and a cycling length scatter the glints without randomness, so redraws match.
    const start = (i * 137.5) % 360;
    const length = GROOVE_GLINT.minDeg + ((i * 53) % GROOVE_GLINT.spreadDeg);
    glints.push(arc(g, start, start + length, COLOR.grooveGlint));
  }
  return `<defs><path id="vinyl-credit-path" d="${creditPath(CREDIT.radius)}"/></defs>
    ${glints.join('')}
    <text class="vinyl-credit" fill="${COLOR.credit}">
      <textPath href="#vinyl-credit-path" startOffset="50%" text-anchor="middle"></textPath>
    </text>`;
}

// `vinyl-hit` is the disc the record is clicked through; the rest lets pointers by.
function vinylTopSvg() {
  return `<defs>
      <clipPath id="vinyl-disc"><circle r="1"/></clipPath>
      <filter id="vinyl-sheen-blur"><feGaussianBlur stdDeviation="${SHEEN.blur}"/></filter>
    </defs>
    <g clip-path="url(#vinyl-disc)"><g filter="url(#vinyl-sheen-blur)">${sheenSvg()}</g></g>
    ${circle(LABEL_RADIUS, COLOR.labelBackdrop, 'none')}
    <circle class="vinyl-hit" r="1" fill="transparent"/>`;
}

// Arm geometry in the arm's own frame: pivot at the origin, needle at (0, -armLength).
function tonearmSvg() {
  const { armLength } = TONEARM;
  const weight = COUNTERWEIGHT;
  const shell = HEADSHELL;
  const offset = shell.offsetDeg * RAD;
  // Where the tube meets the back of the headshell, and the headshell's rear-to-needle direction.
  const dir = { x: Math.sin(offset), y: -Math.cos(offset) };
  const rear = { x: -dir.x * shell.length, y: -armLength - dir.y * shell.length };
  const tube = `M 0 ${weight.length - weight.height / 2} L 0 ${-BEND.straight}
    C 0 ${-BEND.straight - BEND.reach} ${rear.x - dir.x * BEND.reach} ${rear.y - dir.y * BEND.reach} ${rear.x} ${rear.y}`;
  const tubeStroke = (color, width, dx = 0) =>
    `<path d="${tube}" transform="translate(${dx} 0)" fill="none" stroke="${color}" stroke-width="${width}"
      stroke-linecap="round"/>`;
  // The body keeps a crisp silhouette; the bands inside it are softened so they blend like a curved surface.
  const [body, ...bands] = COLOR.tube.map(([width, color, shift]) => tubeStroke(color, ARM_WIDTH * width, ARM_WIDTH * shift));
  const ringStep = weight.height / (weight.rings + 1);
  const rings = Array.from({ length: weight.rings }, (_, i) => {
    const ringY = weight.length - weight.height + ringStep * (i + 1);
    return `<line x1="${-weight.width / 2}" x2="${weight.width / 2}" y1="${ringY}" y2="${ringY}"
      stroke="${COLOR.counterweightRing}" stroke-width="${ringStep / 4}"/>`;
  });
  const lift = FINGER_LIFT;
  return `
    ${tubeStroke('transparent', ARM_GRAB_WIDTH)}
    ${body}
    <g filter="url(#arm-tube-soft)">${bands.join('')}</g>
    <rect x="${-weight.width / 2}" y="${weight.length - weight.height}" width="${weight.width}"
      height="${weight.height}" rx="${weight.width / 6}" fill="url(#arm-counterweight)"/>
    ${rings.join('')}
    <rect x="${-GIMBAL.width / 2}" y="${-GIMBAL.height / 2}" width="${GIMBAL.width}" height="${GIMBAL.height}"
      rx="${GIMBAL.height / 3}" fill="url(#arm-metal)"/>
    ${circle(PIVOT_CAP_RADIUS, 'url(#arm-pivot-cap)', COLOR.armEdge)}
    <g transform="translate(0 ${-armLength}) rotate(${shell.offsetDeg})">
      <path d="M ${-shell.width / 2} ${shell.length * 0.35} Q ${-shell.width / 2 - lift.reach} ${shell.length * 0.3}
        ${-shell.width / 2 - lift.reach} ${shell.length * 0.05}" fill="none" stroke="${COLOR.arm}"
        stroke-width="${lift.width}" stroke-linecap="round"/>
      <rect x="${-shell.width / 2}" y="${-shell.overhang}" width="${shell.width}"
        height="${shell.length + shell.overhang}" rx="${shell.width / 5}" fill="url(#arm-metal)"/>
      <rect x="${-CARTRIDGE.width / 2}" y="${-shell.overhang / 2}" width="${CARTRIDGE.width}"
        height="${CARTRIDGE.length}" rx="${CARTRIDGE.width / 8}" fill="${COLOR.cartridge}"
        stroke="${COLOR.cartridgeEdge}" stroke-width="1" vector-effect="non-scaling-stroke"/>
      <circle r="${NEEDLE_RADIUS}" fill="${COLOR.needle}"/>
    </g>`;
}

// The arm hangs about upside down (bearing near 180deg), so in its own frame the upper-left light falls on +x
// and its gradients run the other way from the fixed base's.
function armLayerSvg() {
  return `<defs>
      <linearGradient id="bearing-metal">${stops(COLOR.metal)}</linearGradient>
      <linearGradient id="arm-metal" x1="1" x2="0">${stops(COLOR.metal)}</linearGradient>
      <linearGradient id="arm-counterweight" x1="1" x2="0">${stops(COLOR.counterweight)}</linearGradient>
      <radialGradient id="arm-base" cx="0.35" cy="0.35">${stops(COLOR.base)}</radialGradient>
      <radialGradient id="arm-pivot-cap" cx="0.65" cy="0.65">${stops(COLOR.pivotCap)}</radialGradient>
      <filter id="arm-tube-soft"><feGaussianBlur stdDeviation="${ARM_WIDTH * 0.06}"/></filter>
    </defs>
    <g transform="translate(${PIVOT.x} ${PIVOT.y})">
      ${circle(BASE_RADIUS, 'url(#arm-base)', COLOR.baseEdge)}
      ${circle(BEARING_RADIUS, 'url(#bearing-metal)', COLOR.armEdge)}
    </g>
    <g class="arm">${tonearmSvg()}</g>`;
}

function layer(className, markup) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  node.setAttribute('viewBox', `${BOUNDS.left} ${BOUNDS.top} ${BOUNDS.width} ${BOUNDS.height}`);
  node.setAttribute('class', `turntable-layer ${className}`);
  node.innerHTML = markup;
  return node;
}

// The progress ring in the label's own units (radius 1 at its rim, where the globe's edge is): the rail runs centred
// on that edge; how thick it is, and how wide a band round it takes a click.
const RING = Object.freeze({ radius: 1, width: 0.014, dotRadius: 0.024, hitWidth: 0.09 });
// The ring's drawing reaches this far (label units) past the rim on every side, so the dot, its shadow and the click
// band lie inside it: Safari clips what an SVG draws outside its own box, overflow: visible or not.
const RING_BLEED = 0.1;
// A change of more than JUMP (share of a turn) within a track, such as a seek, glides there over GLIDE_MS instead of
// jumping; playback itself moves far less than JUMP a frame.
const RING_GLIDE = Object.freeze({ jump: 0.02, ms: 450 });

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
}

/** The point on the rail `share` (0..1) of a turn clockwise from 12 o'clock. */
function ringPoint(share) {
  const angle = share * 2 * Math.PI;
  return [RING.radius * Math.sin(angle), -RING.radius * Math.cos(angle)];
}

/** Path of the rail from 12 o'clock clockwise for `share` (0..1) of a turn; a full turn is drawn as two halves. */
function arcFromTop(share) {
  const r = RING.radius;
  const top = `M 0 ${-r}`;
  if (share <= 0) return '';
  if (share >= 1) return `${top} A ${r} ${r} 0 1 1 0 ${r} A ${r} ${r} 0 1 1 0 ${-r}`;
  const [x, y] = ringPoint(share);
  return `${top} A ${r} ${r} 0 ${share > 0.5 ? 1 : 0} 1 ${x} ${y}`;
}

/**
 * The current track's progress round the label's rim: a faint rail, filled clockwise from 12 o'clock as far as the
 * track has played, with a dot at the head. Clicking the rail calls `onSeek` with the point of the track there.
 *
 * @param {(trackProgress: number) => void} onSeek
 */
function createProgressRing(onSeek) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'record-progress');
  const side = 2 * (1 + RING_BLEED);
  svg.setAttribute('viewBox', `${-side / 2} ${-side / 2} ${side} ${side}`);
  // The label is 2 units across, so the bleed is RING_BLEED / 2 of its width on each side.
  const bleedPercent = (RING_BLEED / 2) * 100;
  Object.assign(svg.style, {
    left: `${-bleedPercent}%`,
    top: `${-bleedPercent}%`,
    width: `${100 + 2 * bleedPercent}%`,
    height: `${100 + 2 * bleedPercent}%`,
  });
  svg.innerHTML = `
    <circle class="record-progress-rail" r="${RING.radius}" fill="none" stroke-width="${RING.width}"/>
    <path class="record-progress-fill" fill="none" stroke-width="${RING.width}"/>
    <circle class="record-progress-hit" r="${RING.radius}" fill="none" stroke="transparent" stroke-width="${RING.hitWidth}"/>
    <circle class="record-progress-dot" r="${RING.dotRadius}"/>`;
  const fill = svg.querySelector('.record-progress-fill');
  const dot = svg.querySelector('.record-progress-dot');

  svg.querySelector('.record-progress-hit').addEventListener('click', (event) => {
    const rect = svg.getBoundingClientRect();
    const x = event.clientX - (rect.left + rect.width / 2);
    const y = event.clientY - (rect.top + rect.height / 2);
    // Clockwise from 12 o'clock, 0..1.
    const turn = (Math.atan2(x, -y) / (2 * Math.PI) + 1) % 1;
    onSeek(turn);
  });

  // The share the ring shows, the one it is headed for, the track they belong to, and the glide under way, if any.
  let shown = 0;
  let target = 0;
  let track = null;
  let glide = null;

  function draw(share) {
    shown = share;
    const [x, y] = ringPoint(share);
    fill.setAttribute('d', arcFromTop(share));
    dot.setAttribute('cx', String(x));
    dot.setAttribute('cy', String(y));
  }

  // Eases from where the glide began to the target, which may keep moving while the track plays.
  function step(now) {
    glide.start ??= now;
    const t = Math.min(1, (now - glide.start) / RING_GLIDE.ms);
    draw(glide.from + easeInOutCubic(t) * (target - glide.from));
    glide.frame = t < 1 ? requestAnimationFrame(step) : null;
    if (t === 1) glide = null;
  }

  /**
   * @param {number} trackProgress 0..1
   * @param {unknown} trackKey which track it is; another track starts the ring from its place at once
   */
  function render(trackProgress, trackKey) {
    const next = Math.min(1, Math.max(0, trackProgress));
    const jumped = Math.abs(next - target) > RING_GLIDE.jump;
    target = next;
    if (trackKey !== track) {
      track = trackKey;
      if (glide) cancelAnimationFrame(glide.frame);
      glide = null;
      draw(target);
    } else if (jumped) {
      if (glide) cancelAnimationFrame(glide.frame);
      glide = { from: shown, start: null, frame: requestAnimationFrame(step) };
    } else if (!glide) {
      draw(target);
    }
  }

  return { el: svg, render };
}

/**
 * Record player: the vinyl (SVG) under an HTML label that features mount canvases into (the globe), under the
 * tonearm (SVG). The platter spins up while its motor runs and coasts to a stop otherwise.
 *
 * The listener can grab the arm: it lifts the needle and calls `onGrab()`; dragging calls `onScrub(progress)` with
 * the album progress under the needle, or `onScrub(null)` while the needle is off the record. Released over the
 * record, the needle sets down, the motor starts and `onDrop(progress)` is called; released off it, the arm
 * returns to rest and `onLift()` is called.
 *
 * Round the label's rim runs the current track's progress ring: one turn per track from 12 o'clock, its rail filled
 * where the track has played. Clicking the ring calls `onSeek(trackProgress)` with the point of the track clicked.
 *
 * Round the record's own rim, outside the grooves, run the credits (setCredit), turning with the record.
 *
 * Clicking the grooves calls `onSelectGroove(progress)` with the album progress of the groove clicked; clicking the
 * record off the grooves calls `onToggle()`.
 *
 * The listener can also hold the record by hand, like a real one on its platter. Pressing on it stops it under the
 * hand and calls `onHandHold()`. Moving the pointer then turns it round its centre, and each move calls
 * `onHandTurn(sec)` with how many seconds of music at full speed it was turned (negative backwards). Let go, it calls `onHandRelease()` and picks up from the hand's speed, easing back to the motor's
 * speed (or to a stop with the motor off). Only a short press that didn't turn the record still counts as a click.
 *
 * @param {HTMLElement} parent
 * @param {{
 *   onToggle: () => void,
 *   onCued: () => void,
 *   onGrab: () => void,
 *   onScrub: (progress: number | null) => void,
 *   onDrop: (progress: number) => void,
 *   onLift: () => void,
 *   onSeek: (trackProgress: number) => void,
 *   onSelectGroove: (progress: number) => void,
 *   onHandHold: () => void,
 *   onHandTurn: (sec: number) => void,
 *   onHandRelease: () => void,
 * }} options
 *   onToggle: called when the record is clicked off the grooves.
 *   onCued: called when the arm, swung on by render(CUEING), has reached its groove.
 */
export function createTurntableView(
  parent,
  { onToggle, onCued, onGrab, onScrub, onDrop, onLift, onSeek, onSelectGroove, onHandHold, onHandTurn, onHandRelease },
) {
  const root = document.createElement('div');
  root.className = 'turntable';
  root.style.aspectRatio = `${BOUNDS.width} / ${BOUNDS.height}`;

  const vinylLayer = layer('turntable-vinyl-layer', vinylBaseSvg());
  const spinner = layer('turntable-vinyl-spin', vinylSpinSvg());
  // Turns round the record centre, as the record itself is lifted (see `record` below).
  spinner.style.transformOrigin = `${(-BOUNDS.left / BOUNDS.width) * 100}% ${(-BOUNDS.top / BOUNDS.height) * 100}%`;
  const vinylTop = layer('turntable-vinyl-top', vinylTopSvg());
  const trackGaps = vinylLayer.querySelector('.vinyl-track-gaps');
  const credit = spinner.querySelector('.vinyl-credit');
  const creditText = credit.querySelector('textPath');
  const creditBaseline = spinner.querySelector('#vinyl-credit-path');

  // Label area, positioned over the label circle in percentages of the layers' view box.
  const label = document.createElement('div');
  label.className = 'record-label';
  Object.assign(label.style, {
    left: `${((-LABEL_RADIUS - BOUNDS.left) / BOUNDS.width) * 100}%`,
    top: `${((-LABEL_RADIUS - BOUNDS.top) / BOUNDS.height) * 100}%`,
    width: `${((2 * LABEL_RADIUS) / BOUNDS.width) * 100}%`,
    height: `${((2 * LABEL_RADIUS) / BOUNDS.height) * 100}%`,
  });
  const labelSlot = document.createElement('div');
  labelSlot.className = 'record-label-slot';
  const rim = document.createElement('div');
  rim.className = 'record-label-rim';
  const progressRing = createProgressRing(onSeek);
  label.append(labelSlot, rim, progressRing.el);

  const armLayer = layer('turntable-arm-layer', armLayerSvg());
  const arm = armLayer.querySelector('.arm');

  // The record (vinyl and label) is one piece so it can be lifted off the platter; the arm stays.
  const record = document.createElement('div');
  record.className = 'turntable-record';
  record.style.transformOrigin = `${(-BOUNDS.left / BOUNDS.width) * 100}% ${(-BOUNDS.top / BOUNDS.height) * 100}%`;
  // A canvas over the whole record, between the vinyl and the label, for a glow around the globe.
  const haloCanvas = document.createElement('canvas');
  haloCanvas.className = 'record-halo';
  record.append(vinylLayer, spinner, vinylTop, haloCanvas, label);

  root.append(record, armLayer);
  vinylTop.addEventListener('click', (event) => {
    // A press that held or turned the record is not a click on it, nor is a tap that began on the arm: a phone sends
    // its click to what is under the finger once the lifted arm has moved off, the record.
    const pressed = clicked;
    clicked = false;
    if (!pressed) return;
    const progress = grooveProgress(pointerRadius(event));
    if (progress >= 0 && progress <= 1) onSelectGroove(progress);
    else onToggle();
  });
  parent.append(root);

  let bearing = REST_BEARING;
  let targetBearing = bearing;
  let glideFrame = null;
  let onRecord = false;
  let dragging = false;
  let motorOn = false;
  let spinFrame = null;
  // Platter speed (share of full speed; a hand can leave it faster or backwards) and turn (degrees clockwise).
  let speed = 0;
  let angle = 0;
  // Whether a hand holds the record, and whether the last press on it was a click (short, and didn't turn it).
  let held = false;
  let clicked = false;

  function placeArm() {
    arm.setAttribute('transform', `translate(${PIVOT.x} ${PIVOT.y}) rotate(${bearing})`);
  }

  function turnTo(deg) {
    angle = deg % 360;
    spinner.style.transform = `rotate(${angle}deg)`;
  }

  function setMotor(on) {
    motorOn = on;
    spin();
  }

  // Brings the platter up to full speed while the motor runs and lets it coast to a stop otherwise, from whatever
  // speed it has (a hand may have left it faster, or turning backwards); stops once it stands still. A held record
  // turns with the hand instead, and the platter picks up again when it is let go.
  function spin() {
    if (spinFrame !== null || held) return;
    let last = null;
    const step = (now) => {
      if (held) {
        spinFrame = null;
        return;
      }
      const dt = last === null ? 0 : (now - last) / 1000;
      last = now;
      const target = motorOn ? 1 : 0;
      const rate = dt / (motorOn && speed < target ? PLATTER.spinUpSec : PLATTER.spinDownSec);
      speed = speed < target ? Math.min(target, speed + rate) : Math.max(target, speed - rate);
      turnTo(angle + FULL_DEG_PER_SEC * speed * dt);
      spinFrame = motorOn || speed !== 0 ? requestAnimationFrame(step) : null;
    };
    spinFrame = requestAnimationFrame(step);
  }

  // Eases the arm toward `targetBearing` until it arrives; a held arm stays put.
  function glide() {
    if (glideFrame !== null || dragging) return;
    let last = null;
    const step = (now) => {
      const dt = last === null ? 0 : (now - last) / 1000;
      last = now;
      bearing += (1 - Math.exp(-dt / GLIDE_TAU_SEC)) * (targetBearing - bearing);
      placeArm();
      if (Math.abs(targetBearing - bearing) >= GLIDE_SETTLE_DEG) {
        glideFrame = requestAnimationFrame(step);
        return;
      }
      bearing = targetBearing;
      placeArm();
      glideFrame = null;
      if (onRecord) onCued();
    };
    glideFrame = requestAnimationFrame(step);
  }

  function stopGlide() {
    if (glideFrame === null) return;
    cancelAnimationFrame(glideFrame);
    glideFrame = null;
  }

  function drop() {
    onRecord = true;
    setMotor(true);
    glide();
  }

  function lift() {
    onRecord = false;
    setMotor(false);
    targetBearing = REST_BEARING;
    glide();
  }

  // Moves the needle to the groove for `progress`; during a glide, or for a far move, the arm eases there instead of
  // jumping.
  function setProgress(progress) {
    if (!onRecord || dragging) return;
    targetBearing = armBearing(grooveRadius(progress));
    if (glideFrame !== null) return;
    if (Math.abs(targetBearing - bearing) > ARM_JUMP_DEG) {
      glide();
      return;
    }
    bearing = targetBearing;
    placeArm();
  }

  // Distance (vinyl radii) from the record centre to a pointer event; the grooves are round, so the spin doesn't matter.
  function pointerRadius(event) {
    const { x, y, r } = recordGeometry();
    return Math.hypot(event.clientX - x, event.clientY - y) / r;
  }

  // Angle (degrees clockwise from up) of a pointer event round the record centre.
  function pointerAngle(event) {
    const { x, y } = recordGeometry();
    return Math.atan2(event.clientX - x, -(event.clientY - y)) / RAD;
  }

  // Bearing (degrees clockwise from up, 0..360) from the pivot to a pointer event.
  function pointerBearing(event) {
    const rect = armLayer.getBoundingClientRect();
    const x = BOUNDS.left + ((event.clientX - rect.left) / rect.width) * BOUNDS.width;
    const y = BOUNDS.top + ((event.clientY - rect.top) / rect.height) * BOUNDS.height;
    return (Math.atan2(x - PIVOT.x, -(y - PIVOT.y)) / RAD + 360) % 360;
  }

  // The arm keeps the angle between it and the pointer from where it was grabbed, so it doesn't jump.
  arm.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    stopGlide();
    dragging = true;
    onRecord = false;
    setMotor(false);
    onGrab();
    let overRecord = false;
    const grab = bearing - pointerBearing(event);
    const move = (moveEvent) => {
      bearing = Math.min(INNER_BEARING, Math.max(REST_BEARING, pointerBearing(moveEvent) + grab));
      overRecord = needleRadius(bearing) <= 1;
      placeArm();
      onScrub(overRecord ? progressAt(bearing) : null);
    };
    const release = () => {
      dragging = false;
      arm.classList.remove('dragging');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      if (overRecord) {
        onRecord = true;
        setMotor(true);
        onDrop(progressAt(bearing));
      } else {
        lift();
        onLift();
      }
    };
    arm.classList.add('dragging');
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
  });

  // A hand on the record: it stops it, and turns it as the pointer goes round the centre, keeping the grip it took so
  // the record doesn't jump.
  vinylTop.addEventListener('pointerdown', (event) => {
    clicked = true;
    if (event.button !== 0 || pointerRadius(event) > 1) return;
    event.preventDefault();
    held = true;
    speed = 0;
    vinylTop.classList.add('held');
    onHandHold();
    const start = { x: event.clientX, y: event.clientY, t: event.timeStamp };
    let pointer = pointerAngle(event);
    let turning = false;
    // How far (deg) the hand has turned the record, and when, for its speed on release.
    let turned = 0;
    let samples = [{ t: event.timeStamp, turned }];
    const move = (moveEvent) => {
      if (!turning) {
        if (Math.hypot(moveEvent.clientX - start.x, moveEvent.clientY - start.y) < HAND.slopPx) return;
        turning = true;
      }
      const next = pointerAngle(moveEvent);
      // The shortest way round from the last angle, so crossing 12 o'clock is not a whole turn.
      const delta = ((next - pointer + 540) % 360) - 180;
      pointer = next;
      turned += delta;
      turnTo(angle + delta);
      samples = samples.filter((sample) => moveEvent.timeStamp - sample.t <= HAND.sampleMs);
      samples.push({ t: moveEvent.timeStamp, turned });
      onHandTurn(delta / FULL_DEG_PER_SEC);
    };
    const release = (upEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      held = false;
      vinylTop.classList.remove('held');
      clicked = !turning && upEvent.timeStamp - start.t <= HAND.clickMs;
      // The hand's speed over its last moments; a hand that stopped before letting go leaves the record still.
      const [first] = samples.filter((sample) => upEvent.timeStamp - sample.t <= HAND.sampleMs);
      const sec = first ? (upEvent.timeStamp - first.t) / 1000 : 0;
      const handSpeed = turning && sec > 0 ? (turned - first.turned) / sec / FULL_DEG_PER_SEC : 0;
      speed = Math.min(HAND.maxSpeed, Math.max(-HAND.maxSpeed, handSpeed));
      spin();
      onHandRelease();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
  });

  placeArm();

  /**
   * Record centre and radius in client pixels, at rest on the platter; or in the pixels `rectOf` measures boxes in.
   *
   * @param {(el: Element) => DOMRectReadOnly} [rectOf]
   */
  function recordGeometry(rectOf = (el) => el.getBoundingClientRect()) {
    const rect = rectOf(root);
    return {
      x: rect.left + (-BOUNDS.left / BOUNDS.width) * rect.width,
      y: rect.top + (-BOUNDS.top / BOUNDS.height) * rect.height,
      r: rect.width / BOUNDS.width,
    };
  }

  /** @param {string} text the credits, run round the record's rim (see CREDIT) */
  function setCredit(text) {
    creditText.textContent = text;
    credit.setAttribute('font-size', String(CREDIT.fontSize));
    const room = CREDIT.maxTurn * 2 * Math.PI * CREDIT.radius;
    const length = credit.getComputedTextLength();
    const fontSize = length > room ? (CREDIT.fontSize * room) / length : CREDIT.fontSize;
    credit.setAttribute('font-size', String(fontSize));
    creditBaseline.setAttribute('d', creditPath(CREDIT.radius - (CREDIT.capHeightEm * fontSize) / 2));
  }

  /** @param {number[]} trackStarts progress (0..1) where each track after the first begins, drawn as brighter grooves */
  function setTrackStarts(trackStarts) {
    trackGaps.innerHTML = trackStarts.map((p) => circle(grooveRadius(p), 'none', COLOR.trackGap)).join('');
  }

  /**
   * @param {string} state one of PlaybackState
   * @param {number} progress 0..1 through the album
   * @param {number} trackProgress 0..1 through the current track
   * @param {unknown} trackKey the current track, to tell when it changes
   */
  function render(state, progress, trackProgress, trackKey) {
    progressRing.render(trackProgress, trackKey);
    if (state === PlaybackState.STOPPED) {
      if (onRecord) lift();
    } else if (state === PlaybackState.CUEING) {
      if (!onRecord) drop();
      setProgress(progress);
    } else if (state === PlaybackState.PLAYING || state === PlaybackState.HELD) {
      // A record held by hand keeps the needle on it, following where the hand turns it. Playback started while the
      // page was hidden skipped the cue, so the arm sets down now.
      if (!onRecord) drop();
      setProgress(progress);
    }
  }

  /** The label's centre and radius in the halo canvas's CSS pixels. */
  function labelDisc() {
    const r = label.offsetWidth / 2;
    return { x: label.offsetLeft + r, y: label.offsetTop + r, r };
  }

  return { labelSlot, haloCanvas, labelDisc, recordEl: record, recordGeometry, setCredit, setTrackStarts, render };
}
