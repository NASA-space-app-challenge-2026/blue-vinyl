import { svg } from '../../../shared/svg.js';
import { PlaybackState } from '../../controls/domain/playback-state.js';
import { TURNTABLE, grooveRadiusAt, tonearmAngleAt } from '../domain/geometry.js';

const GROOVE_TEXTURE_STEP = 2.5;
/** Static light reflections on the vinyl, as SVG angles (deg, clockwise from 3 o'clock). */
const SHEEN_ANGLES = [30, 210];
const SHEEN_HALF_WIDTH_DEG = 14;

function ring(radius, className) {
  const { center } = TURNTABLE;
  return svg('circle', { cx: center.x, cy: center.y, r: radius, class: className });
}

function pointOnCircle(radius, deg) {
  const { center } = TURNTABLE;
  const rad = (deg * Math.PI) / 180;
  return `${center.x + radius * Math.cos(rad)} ${center.y + radius * Math.sin(rad)}`;
}

function wedge(radius, fromDeg, toDeg) {
  const { center } = TURNTABLE;
  return `M ${center.x} ${center.y} L ${pointOnCircle(radius, fromDeg)} A ${radius} ${radius} 0 0 1 ${pointOnCircle(radius, toDeg)} Z`;
}

function createDefs() {
  const { center, recordRadius } = TURNTABLE;
  return svg('defs', {}, [
    svg('radialGradient', { id: 'tt-vinyl', cx: '50%', cy: '50%', r: '50%' }, [
      svg('stop', { offset: '60%', 'stop-color': '#161616' }),
      svg('stop', { offset: '100%', 'stop-color': '#0a0a0a' }),
    ]),
    svg('linearGradient', { id: 'tt-silver', x1: '0', y1: '0', x2: '1', y2: '0' }, [
      svg('stop', { offset: '0%', 'stop-color': '#8d8d8d' }),
      svg('stop', { offset: '45%', 'stop-color': '#f4f4f4' }),
      svg('stop', { offset: '100%', 'stop-color': '#9c9c9c' }),
    ]),
    svg('radialGradient', { id: 'tt-silver-cap', cx: '40%', cy: '35%', r: '65%' }, [
      svg('stop', { offset: '0%', 'stop-color': '#ffffff' }),
      svg('stop', { offset: '100%', 'stop-color': '#8a8a8a' }),
    ]),
    svg('filter', { id: 'tt-blur', x: '-20%', y: '-20%', width: '140%', height: '140%' }, [svg('feGaussianBlur', { stdDeviation: 10 })]),
    svg('filter', { id: 'tt-shadow', x: '-20%', y: '-20%', width: '140%', height: '140%' }, [
      svg('feDropShadow', { dx: 0, dy: 18, stdDeviation: 18, 'flood-color': '#000', 'flood-opacity': 0.45 }),
    ]),
    svg('clipPath', { id: 'tt-record-clip' }, [svg('circle', { cx: center.x, cy: center.y, r: recordRadius })]),
  ]);
}

/** Spinning vinyl body: disc, groove texture and track boundary rings. */
function createRecord(boundaries) {
  const { recordRadius, groove } = TURNTABLE;
  const record = svg('g', { class: 'record' });
  record.style.transformOrigin = `${TURNTABLE.center.x}px ${TURNTABLE.center.y}px`;
  record.append(ring(recordRadius, 'record-disc'));

  for (let r = groove.innerRadius, i = 0; r <= groove.outerRadius; r += GROOVE_TEXTURE_STEP, i++) {
    const texture = ring(r, i % 2 === 0 ? 'record-groove' : 'record-groove is-alt');
    // Uneven dashes make the spin visible on an otherwise symmetric disc.
    texture.setAttribute('stroke-dasharray', `${60 + ((i * 53) % 90)} 4`);
    record.append(texture);
  }
  // Inner edges only: the first (0) and last (1) boundaries are the groove edges themselves.
  for (const progress of boundaries.slice(1, -1)) {
    record.append(ring(grooveRadiusAt(progress), 'record-track-boundary'));
  }
  return record;
}

/** Light reflections stay still while the record spins underneath. */
function createSheen() {
  const { recordRadius } = TURNTABLE;
  return svg(
    'g',
    { class: 'record-sheen', 'clip-path': 'url(#tt-record-clip)', filter: 'url(#tt-blur)' },
    SHEEN_ANGLES.map((angle) => svg('path', { d: wedge(recordRadius, angle - SHEEN_HALF_WIDTH_DEG, angle + SHEEN_HALF_WIDTH_DEG) })),
  );
}

/** Tonearm drawn at rest (pointing straight down), rotated around its pivot. */
function createTonearm() {
  const { pivot, length } = TURNTABLE.tonearm;
  const { x: px, y: py } = pivot;
  const tip = py + length;
  const arm = svg('g', { class: 'tonearm' });
  arm.style.transformOrigin = `${px}px ${py}px`;
  arm.append(
    // Counterweight behind the pivot.
    svg('rect', { x: px - 15, y: py - 82, width: 30, height: 46, rx: 4, fill: 'url(#tt-silver)', class: 'tonearm-metal' }),
    ...[-72, -64, -56, -48].map((dy) => svg('line', { x1: px - 15, y1: py + dy, x2: px + 15, y2: py + dy, class: 'tonearm-knurl' })),
    svg('rect', { x: px - 5, y: py - 40, width: 10, height: 40, fill: 'url(#tt-silver)' }),
    // Arm tube with an S-bend toward the headshell.
    svg('path', { d: `M ${px} ${py} L ${px + 6} ${py + length * 0.6} Q ${px + 22} ${tip - 80} ${px} ${tip - 46}`, class: 'tonearm-tube' }),
    svg('path', { d: `M ${px} ${py} L ${px + 6} ${py + length * 0.6} Q ${px + 22} ${tip - 80} ${px} ${tip - 46}`, class: 'tonearm-tube-highlight' }),
    // Headshell, cartridge and finger lift.
    svg('path', { d: `M ${px + 13} ${tip - 30} q 20 -2 22 18`, class: 'tonearm-lift' }),
    svg('rect', { x: px - 13, y: tip - 52, width: 26, height: 58, rx: 4, fill: 'url(#tt-silver)', class: 'tonearm-metal' }),
    svg('rect', { x: px - 8, y: tip - 16, width: 16, height: 18, rx: 2, class: 'tonearm-cartridge' }),
    svg('circle', { cx: px, cy: tip, r: 3.5, class: 'tonearm-stylus' }),
    // Pivot cap.
    svg('circle', { cx: px, cy: py, r: 24, fill: 'url(#tt-silver-cap)', class: 'tonearm-metal' }),
    svg('circle', { cx: px, cy: py, r: 9, class: 'tonearm-cap' }),
  );
  return arm;
}

/**
 * LP record with track boundary rings, a label slot and a tonearm.
 *
 * Three stacked layers: the record (SVG), the label (HTML, so features can mount canvases such as
 * a WebGL globe) and the tonearm (SVG), which swings over the label.
 *
 * @param {HTMLElement} parent
 * @param {{ boundaries: number[], onToggle: () => void, onCued: () => void }} options
 *   boundaries: track edge progress values (0..1), as returned by trackBoundaries().
 *   onToggle: called when the record or the tonearm is clicked.
 *   onCued: called when the tonearm has landed on the record.
 */
export function createTurntableView(parent, { boundaries, onToggle, onCued }) {
  const { width, height, center, labelRadius, tonearm } = TURNTABLE;

  const root = document.createElement('div');
  root.className = 'turntable';
  root.style.aspectRatio = `${width} / ${height}`;

  const viewBox = `0 0 ${width} ${height}`;
  const recordLayer = svg('svg', { viewBox, class: 'turntable-layer', role: 'img', 'aria-label': 'Turntable' });
  recordLayer.append(createDefs());
  const platter = svg('g', { class: 'platter', filter: 'url(#tt-shadow)' });
  platter.append(createRecord(boundaries), createSheen(), svg('circle', { cx: center.x, cy: center.y, r: labelRadius, class: 'record-label-bg' }));
  recordLayer.append(platter);

  // Label area, positioned over the label circle in view-box percentages.
  const label = document.createElement('div');
  label.className = 'record-label';
  Object.assign(label.style, {
    left: `${((center.x - labelRadius) / width) * 100}%`,
    top: `${((center.y - labelRadius) / height) * 100}%`,
    width: `${((2 * labelRadius) / width) * 100}%`,
    height: `${((2 * labelRadius) / height) * 100}%`,
  });
  const labelSlot = document.createElement('div');
  labelSlot.className = 'record-label-slot';
  const progressRing = document.createElement('div');
  progressRing.className = 'record-progress';
  progressRing.append(Object.assign(document.createElement('div'), { className: 'record-progress-dot' }));
  label.append(labelSlot, Object.assign(document.createElement('div'), { className: 'record-label-rim' }), progressRing);

  const armLayer = svg('svg', { viewBox, class: 'turntable-layer turntable-arm-layer', 'aria-hidden': 'true' });
  const arm = createTonearm();
  arm.addEventListener('transitionend', (event) => {
    if (event.propertyName === 'transform') onCued();
  });
  armLayer.append(svg('circle', { cx: tonearm.pivot.x, cy: tonearm.pivot.y, r: 50, class: 'tonearm-base' }), arm);

  root.append(recordLayer, label, armLayer);
  platter.addEventListener('click', onToggle);
  arm.addEventListener('click', onToggle);
  parent.append(root);

  /**
   * @param {string} state one of PlaybackState
   * @param {number} progress 0..1
   */
  function render(state, progress) {
    root.dataset.state = state;
    const angle = state === PlaybackState.STOPPED ? tonearm.restAngleDeg : tonearmAngleAt(progress);
    arm.style.transform = `rotate(${angle}deg)`;
    progressRing.style.transform = `rotate(${progress}turn)`;
  }

  return { labelSlot, render };
}
