import { PlaybackState } from '../../controls/domain/playback-state.js';
import { TURNTABLE, grooveRadiusAt, tonearmAngleAt } from '../domain/geometry.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const GROOVE_TEXTURE_STEP = 4;

function svg(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  return el;
}

function ring(radius, className) {
  const { center } = TURNTABLE;
  return svg('circle', { cx: center.x, cy: center.y, r: radius, class: className });
}

/**
 * LP record with track boundary rings, a label slot and a tonearm.
 *
 * @param {HTMLElement} parent
 * @param {{ boundaries: number[], onCued: () => void }} options
 *   boundaries: track edge progress values (0..1), as returned by trackBoundaries().
 *   onCued: called when the tonearm has landed on the record.
 */
export function createTurntableView(parent, { boundaries, onCued }) {
  const { width, height, center, recordRadius, labelRadius, groove, tonearm } = TURNTABLE;

  const root = svg('svg', { viewBox: `0 0 ${width} ${height}`, class: 'turntable', role: 'img', 'aria-label': 'Turntable' });

  // Spinning record body: disc, groove texture, track boundaries.
  const record = svg('g', { class: 'record' });
  record.style.transformOrigin = `${center.x}px ${center.y}px`;
  record.append(ring(recordRadius, 'record-disc'));
  for (let r = groove.innerRadius, i = 0; r <= groove.outerRadius; r += GROOVE_TEXTURE_STEP, i++) {
    const texture = ring(r, 'record-groove');
    texture.setAttribute('stroke-dasharray', `${40 + ((i * 37) % 60)} 6`);
    record.append(texture);
  }
  // Inner edges only: the first (0) and last (1) boundaries are the groove edges themselves.
  for (const progress of boundaries.slice(1, -1)) {
    record.append(ring(grooveRadiusAt(progress), 'record-track-boundary'));
  }
  root.append(record);

  // Label area: features mount their content here, centered at (0, 0).
  const labelSlot = svg('g', { class: 'record-label', transform: `translate(${center.x} ${center.y})` });
  labelSlot.append(svg('circle', { r: labelRadius, class: 'record-label-bg' }));
  root.append(labelSlot);

  // Tonearm drawn at rest (pointing straight down), then rotated around its pivot.
  const { x: px, y: py } = tonearm.pivot;
  const arm = svg('g', { class: 'tonearm' });
  arm.style.transformOrigin = `${px}px ${py}px`;
  arm.append(
    svg('line', { x1: px, y1: py, x2: px, y2: py + tonearm.length - 20, class: 'tonearm-arm' }),
    svg('rect', { x: px - 9, y: py + tonearm.length - 26, width: 18, height: 30, rx: 3, class: 'tonearm-head' }),
    svg('circle', { cx: px, cy: py, r: 24, class: 'tonearm-base' }),
  );
  arm.addEventListener('transitionend', (event) => {
    if (event.propertyName === 'transform') onCued();
  });
  root.append(arm);

  parent.append(root);

  /**
   * @param {string} state one of PlaybackState
   * @param {number} progress 0..1
   */
  function render(state, progress) {
    root.dataset.state = state;
    const angle = state === PlaybackState.STOPPED ? tonearm.restAngleDeg : tonearmAngleAt(progress);
    arm.style.transform = `rotate(${angle}deg)`;
  }

  return { labelSlot, render };
}
