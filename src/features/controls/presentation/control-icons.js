import { svg } from '../../../shared/svg.js';

const SPEAKER = 'M4 9.5h3.5L12 5.5v13l-4.5-4H4z';
const NEAR_WAVE = 'M15 9.5a3.5 3.5 0 0 1 0 5';
const FAR_WAVE = 'M17.5 7a7.5 7.5 0 0 1 0 10';
const DOT_R = 1.8;
const DOCENT_BUBBLE = 'M5.5 5h13A1.5 1.5 0 0 1 20 6.5v8a1.5 1.5 0 0 1-1.5 1.5H11l-4.5 3.5V16h-1A1.5 1.5 0 0 1 4 14.5v-8A1.5 1.5 0 0 1 5.5 5z';
const DOCENT_WORDS = ['M8 9.5h8', 'M8 12.5h5'];

/** A filled dot of radius DOT_R centered on (cx, cy), as a path. */
function dot(cx, cy) {
  return `M${cx - DOT_R} ${cy}a${DOT_R} ${DOT_R} 0 1 0 ${2 * DOT_R} 0a${DOT_R} ${DOT_R} 0 1 0 ${-2 * DOT_R} 0z`;
}

/** Icon shapes on a 24×24 grid: `fill` paths are solid, `stroke` paths are lines. */
export const ControlIcon = Object.freeze({
  PLAY: { fill: ['M8 5.5v13l10.5-6.5z'], stroke: [] },
  PAUSE: { fill: ['M7 5h3.5v14H7z', 'M13.5 5H17v14h-3.5z'], stroke: [] },
  VOLUME_MUTED: { fill: [SPEAKER], stroke: ['M16 9.5l5 5', 'M21 9.5l-5 5'] },
  VOLUME_LOW: { fill: [SPEAKER], stroke: [NEAR_WAVE] },
  VOLUME_HIGH: { fill: [SPEAKER], stroke: [NEAR_WAVE, FAR_WAVE] },
  FULLSCREEN_ENTER: { fill: [], stroke: ['M4 9V4h5', 'M15 4h5v5', 'M20 15v5h-5', 'M9 20H4v-5'] },
  CHEVRON_LEFT: { fill: [], stroke: ['M15 6l-6 6 6 6'] },
  CHEVRON_RIGHT: { fill: [], stroke: ['M9 6l6 6-6 6'] },
  FULLSCREEN_EXIT: { fill: [], stroke: ['M9 4v5H4', 'M20 9h-5V4', 'M15 20v-5h5', 'M4 15h5v5'] },
  // Three dots in a row.
  MORE: { fill: [dot(5.5, 12), dot(12, 12), dot(18.5, 12)], stroke: [] },
  // A speech bubble with two lines of words; struck through when the docent is off.
  DOCENT: { fill: [], stroke: [DOCENT_BUBBLE, ...DOCENT_WORDS] },
  DOCENT_OFF: { fill: [], stroke: [DOCENT_BUBBLE, ...DOCENT_WORDS, 'M3.5 3.5l17 17'] },
});

/** @param {{ fill: string[], stroke: string[] }} icon one of ControlIcon */
export function createControlIcon(icon) {
  return svg('svg', { viewBox: '0 0 24 24', class: 'control-icon', 'aria-hidden': 'true' }, [
    ...icon.fill.map((d) => svg('path', { d, class: 'control-icon-fill' })),
    ...icon.stroke.map((d) => svg('path', { d, class: 'control-icon-stroke' })),
  ]);
}
